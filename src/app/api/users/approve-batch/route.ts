import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserRepository } from '@/infrastructure/supabase';
import { sendEmail } from '@/lib/email';
import { invalidateUserCache, invalidateCSOMatchingCache } from '@/lib/data-cache';
import { getSupabase } from '@/lib/supabase';
import { BATCH_EMAIL_DELAY_MS } from '@/constants/defaults';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2분

interface ApprovedUser {
  business_number: string;
  company_name: string;
  email: string;
}

interface BatchResults {
  success: string[];
  failed: string[];
  emailSent: string[];
  emailFailed: string[];
}

// ── 승인 처리 ──

async function approveUsers(
  businessNumbers: string[],
  userRepo: ReturnType<typeof getUserRepository>,
): Promise<{ results: BatchResults; approvedUsers: ApprovedUser[] }> {
  const results: BatchResults = { success: [], failed: [], emailSent: [], emailFailed: [] };

  const approvalPromises = businessNumbers.map(async (bn: string) => {
    try {
      const user = await userRepo.findByBusinessNumber(bn);
      if (!user) { results.failed.push(bn); return null; }
      const approved = await userRepo.approve(bn);
      if (!approved) { results.failed.push(bn); return null; }
      results.success.push(bn);
      return { business_number: bn, company_name: user.company_name, email: user.email };
    } catch (error) {
      console.error(`[Batch Approve] Failed to approve ${bn}:`, error);
      results.failed.push(bn);
      return null;
    }
  });

  const approvedUsers = (await Promise.all(approvalPromises)).filter(
    (u): u is ApprovedUser => u !== null,
  );

  return { results, approvedUsers };
}

// ── 이메일 발송 (순차적 — Rate Limit 방지) ──

async function sendApprovalEmails(
  approvedUsers: ApprovedUser[],
  results: BatchResults,
) {
  for (const user of approvedUsers) {
    try {
      console.log(`[Batch Approve] Sending email to: ${user.email}`);
      const emailResult = await sendEmail(user.email, 'approval_complete', {
        company_name: user.company_name,
        business_number: user.business_number,
      });

      if (emailResult.success) {
        results.emailSent.push(user.business_number);
      } else {
        results.emailFailed.push(user.business_number);
        console.error(`[Batch Approve] Email failed for ${user.email}: ${emailResult.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, BATCH_EMAIL_DELAY_MS));
    } catch (error) {
      console.error(`[Batch Approve] Email error for ${user.email}:`, error);
      results.emailFailed.push(user.business_number);
    }
  }
}

// ── CSO 매핑 자동 등록 ──

async function autoRegisterCsoMappings(approvedUsers: ApprovedUser[]) {
  if (approvedUsers.length === 0) return;

  const supabase = getSupabase();
  const mappings = approvedUsers.map(u => ({
    cso_company_name: u.company_name.trim(),
    business_number: u.business_number,
    updated_at: new Date().toISOString(),
  }));
  const { error: matchError } = await supabase
    .from('cso_matching')
    .upsert(mappings, { onConflict: 'cso_company_name', ignoreDuplicates: true });

  if (matchError) {
    console.error('[Batch Approve] CSO 매핑 자동 등록 DB 에러:', matchError.message);
  } else {
    invalidateCSOMatchingCache();
    console.log(`[Batch Approve] CSO 매핑 자동 등록: ${mappings.length}건`);
  }
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { business_numbers } = await request.json();
    if (!business_numbers || !Array.isArray(business_numbers) || business_numbers.length === 0) {
      return NextResponse.json({ success: false, error: '승인할 사업자번호 목록을 입력해주세요.' }, { status: 400 });
    }

    console.log(`[Batch Approve] Starting batch approval for ${business_numbers.length} users`);

    const userRepo = getUserRepository();
    const { results, approvedUsers } = await approveUsers(business_numbers, userRepo);
    console.log(`[Batch Approve] Approved ${results.success.length}, Failed ${results.failed.length}`);

    await sendApprovalEmails(approvedUsers, results);
    console.log(`[Batch Approve] Complete - Emails sent: ${results.emailSent.length}, failed: ${results.emailFailed.length}`);

    try { await autoRegisterCsoMappings(approvedUsers); }
    catch (error) { console.error('[Batch Approve] CSO 매핑 자동 등록 실패 (승인은 정상 처리됨):', error); }

    if (results.success.length > 0) invalidateUserCache();

    return NextResponse.json({
      success: true,
      message: `${results.success.length}건 승인 완료`,
      data: {
        total: business_numbers.length,
        approved: results.success.length,
        failed: results.failed.length,
        emailSent: results.emailSent.length,
        emailFailed: results.emailFailed.length,
      },
    });
  } catch (error) {
    console.error('Batch approve error:', error);
    return NextResponse.json({ success: false, error: '일괄 승인 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

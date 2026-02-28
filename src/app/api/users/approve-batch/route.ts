import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserRepository } from '@/infrastructure/supabase';
import { sendEmail } from '@/lib/email';
import { invalidateUserCache, invalidateCSOMatchingCache } from '@/lib/data-cache';
import { getSupabase } from '@/lib/supabase';
import { BATCH_EMAIL_DELAY_MS } from '@/constants/defaults';

export const dynamic = 'force-dynamic';
// 대량 처리를 위한 타임아웃 연장
export const maxDuration = 120; // 2분

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const { business_numbers } = await request.json();
    
    if (!business_numbers || !Array.isArray(business_numbers) || business_numbers.length === 0) {
      return NextResponse.json(
        { success: false, error: '승인할 사업자번호 목록을 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log(`[Batch Approve] Starting batch approval for ${business_numbers.length} users`);

    const results: {
      success: string[];
      failed: string[];
      emailSent: string[];
      emailFailed: string[];
    } = {
      success: [],
      failed: [],
      emailSent: [],
      emailFailed: [],
    };

    const userRepo = getUserRepository();

    // 승인 처리 (병렬)
    const approvalPromises = business_numbers.map(async (business_number: string) => {
      try {
        const user = await userRepo.findByBusinessNumber(business_number);
        if (!user) {
          results.failed.push(business_number);
          return null;
        }

        const approved = await userRepo.approve(business_number);
        if (!approved) {
          results.failed.push(business_number);
          return null;
        }

        results.success.push(business_number);
        return user;
      } catch (error) {
        console.error(`[Batch Approve] Failed to approve ${business_number}:`, error);
        results.failed.push(business_number);
        return null;
      }
    });

    const approvedUsers = (await Promise.all(approvalPromises)).filter(Boolean);

    console.log(`[Batch Approve] Approved ${results.success.length}, Failed ${results.failed.length}`);

    // 이메일 발송 (순차적 - Rate Limit 방지)
    for (const user of approvedUsers) {
      if (!user) continue;
      
      try {
        console.log(`[Batch Approve] Sending email to: ${user.email}`);
        
        const emailResult = await sendEmail(user.email, 'approval_complete', {
          company_name: user.company_name,
          business_number: user.business_number,
        });

        if (emailResult.success) {
          results.emailSent.push(user.business_number);
          console.log(`[Batch Approve] Email sent to: ${user.email}`);
        } else {
          results.emailFailed.push(user.business_number);
          console.error(`[Batch Approve] Email failed for ${user.email}: ${emailResult.error}`);
        }

        // Rate Limit 방지: 이메일 간 딜레이
        await new Promise(resolve => setTimeout(resolve, BATCH_EMAIL_DELAY_MS));
      } catch (error) {
        console.error(`[Batch Approve] Email error for ${user.email}:`, error);
        results.emailFailed.push(user.business_number);
      }
    }

    console.log(`[Batch Approve] Complete - Emails sent: ${results.emailSent.length}, failed: ${results.emailFailed.length}`);

    // CSO 매핑 자동 등록: 승인된 사용자들의 회사명 → 사업자번호
    if (approvedUsers.length > 0) {
      try {
        const supabase = getSupabase();
        const mappings = approvedUsers
          .filter((u): u is NonNullable<typeof u> => u !== null)
          .map(u => ({
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
      } catch (error) {
        console.error('[Batch Approve] CSO 매핑 자동 등록 실패 (승인은 정상 처리됨):', error);
      }
    }

    // 캐시 무효화
    if (results.success.length > 0) {
      invalidateUserCache();
    }

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
    return NextResponse.json(
      { success: false, error: '일괄 승인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

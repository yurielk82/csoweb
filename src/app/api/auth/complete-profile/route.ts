import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession, isValidEmail } from '@/lib/auth';
import { getUserRepository } from '@/infrastructure/supabase';
import { invalidateUserCache } from '@/lib/data-cache';

export const dynamic = 'force-dynamic';

interface CompleteProfileBody {
  company_name: string;
  ceo_name: string;
  zipcode: string;
  address1: string;
  address2?: string;
  phone1: string;
  phone2?: string;
  email: string;
  email2?: string;
}

// ── Validation ──

function validateProfileFields(body: CompleteProfileBody): string | null {
  if (!body.company_name?.trim()) return '업체명을 입력해주세요.';
  if (!body.ceo_name?.trim()) return '대표자명을 입력해주세요.';
  if (!body.zipcode || !body.address1) return '주소를 입력해주세요.';
  if (!body.phone1?.trim()) return '연락처를 입력해주세요.';
  if (!body.email?.trim() || !isValidEmail(body.email.trim())) return '올바른 이메일을 입력해주세요.';
  if (body.email.trim().endsWith('@temp.local')) return '실제 사용하는 이메일을 입력해주세요.';
  return null;
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userRepo = getUserRepository();
    const user = await userRepo.findByBusinessNumber(session.business_number);
    if (!user) {
      return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (user.profile_complete) {
      return NextResponse.json({
        success: true,
        message: '이미 프로필이 완성되어 있습니다.',
        data: { redirect: session.is_admin ? '/admin' : '/home' },
      });
    }

    const body: CompleteProfileBody = await request.json();

    const validationError = validateProfileFields(body);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    // 이메일 중복 확인 (자기 자신 제외)
    const existingUser = await userRepo.findByEmail(body.email.trim());
    if (existingUser && existingUser.business_number !== session.business_number) {
      return NextResponse.json({ success: false, error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
    }

    const profileUpdated = await userRepo.completeProfile(session.business_number, {
      company_name: body.company_name.trim(),
      ceo_name: body.ceo_name.trim(),
      zipcode: body.zipcode,
      address1: body.address1,
      address2: body.address2 || '',
      phone1: body.phone1.trim(),
      phone2: body.phone2 || '',
      email: body.email.trim(),
      email2: body.email2 || '',
    });

    if (!profileUpdated) {
      return NextResponse.json({ success: false, error: '프로필 업데이트에 실패했습니다.' }, { status: 500 });
    }

    invalidateUserCache();

    await setSession({
      ...session,
      profile_complete: true,
      email: body.email.trim(),
      company_name: body.company_name.trim(),
    });

    return NextResponse.json({
      success: true,
      message: '프로필이 완성되었습니다.',
      data: { redirect: session.is_admin ? '/admin' : '/home' },
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    return NextResponse.json({ success: false, error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

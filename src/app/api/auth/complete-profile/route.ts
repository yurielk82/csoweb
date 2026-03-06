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

// 프로필 완성 API (profile_complete=false인 사용자 전용)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 사용자 조회
    const userRepo = getUserRepository();
    const user = await userRepo.findByBusinessNumber(session.business_number);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 이미 프로필 완성된 경우
    if (user.profile_complete) {
      return NextResponse.json({
        success: true,
        message: '이미 프로필이 완성되어 있습니다.',
        data: { redirect: session.is_admin ? '/admin' : '/home' },
      });
    }

    const body: CompleteProfileBody = await request.json();
    const { company_name, ceo_name, zipcode, address1, phone1, email } = body;

    // 필수 필드 검증
    if (!company_name?.trim()) {
      return NextResponse.json(
        { success: false, error: '업체명을 입력해주세요.' },
        { status: 400 }
      );
    }
    if (!ceo_name?.trim()) {
      return NextResponse.json(
        { success: false, error: '대표자명을 입력해주세요.' },
        { status: 400 }
      );
    }
    if (!zipcode || !address1) {
      return NextResponse.json(
        { success: false, error: '주소를 입력해주세요.' },
        { status: 400 }
      );
    }
    if (!phone1?.trim()) {
      return NextResponse.json(
        { success: false, error: '연락처를 입력해주세요.' },
        { status: 400 }
      );
    }
    if (!email?.trim() || !isValidEmail(email.trim())) {
      return NextResponse.json(
        { success: false, error: '올바른 이메일을 입력해주세요.' },
        { status: 400 }
      );
    }
    if (email.trim().endsWith('@temp.local')) {
      return NextResponse.json(
        { success: false, error: '실제 사용하는 이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 중복 확인 (자기 자신 제외)
    const existingUser = await userRepo.findByEmail(email.trim());
    if (existingUser && existingUser.business_number !== session.business_number) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 이메일입니다.' },
        { status: 409 }
      );
    }

    // 프로필 업데이트 + profile_complete=true
    const profileUpdated = await userRepo.completeProfile(session.business_number, {
      company_name: company_name.trim(),
      ceo_name: ceo_name.trim(),
      zipcode,
      address1,
      address2: body.address2 || '',
      phone1: phone1.trim(),
      phone2: body.phone2 || '',
      email: email.trim(),
      email2: body.email2 || '',
    });

    if (!profileUpdated) {
      return NextResponse.json(
        { success: false, error: '프로필 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }

    invalidateUserCache();

    // 세션 갱신 (profile_complete, email, company_name 반영)
    const updatedSession = {
      ...session,
      profile_complete: true,
      email: email.trim(),
      company_name: company_name.trim(),
    };
    await setSession(updatedSession);

    const redirectUrl = session.is_admin ? '/admin' : '/home';

    return NextResponse.json({
      success: true,
      message: '프로필이 완성되었습니다.',
      data: { redirect: redirectUrl },
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    return NextResponse.json(
      { success: false, error: '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

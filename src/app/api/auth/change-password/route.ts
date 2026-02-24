import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession, hashPassword, isValidEmail } from '@/lib/auth';
import { getUserByBusinessNumber, getUserByEmail, updateUser } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ChangePasswordBody {
  new_password: string;
  company_name?: string;
  ceo_name?: string;
  zipcode?: string;
  address1?: string;
  address2?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  email2?: string;
}

// 비밀번호 강제 변경 + 프로필 설정 API
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body: ChangePasswordBody = await request.json();
    const { new_password } = body;

    // 비밀번호 유효성 검사
    if (!new_password || new_password.length < 6) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await getUserByBusinessNumber(session.business_number);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 초기 비밀번호 패턴 차단: u+사업자번호, 사업자번호 전체, 뒤 5자리
    const normalizedBN = session.business_number.replace(/-/g, '');
    const blockedPasswords = [
      `u${normalizedBN}`,
      normalizedBN,
      normalizedBN.slice(-5),
    ];
    if (blockedPasswords.includes(new_password)) {
      return NextResponse.json(
        { success: false, error: '초기 비밀번호와 다른 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 프로필 미완성 여부: @temp.local 이메일 OR 필수 필드 누락
    const needsProfile = user.email.endsWith('@temp.local') || !user.ceo_name || !user.address1 || !user.phone1;
    let updatedEmail = session.email;
    let updatedCompanyName = session.company_name;

    if (needsProfile) {
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
      const existingUser = await getUserByEmail(email.trim());
      if (existingUser && existingUser.business_number !== session.business_number) {
        return NextResponse.json(
          { success: false, error: '이미 사용 중인 이메일입니다.' },
          { status: 409 }
        );
      }

      // 프로필 일괄 업데이트
      const profileUpdated = await updateUser(session.business_number, {
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
          { success: false, error: '회원 정보 업데이트에 실패했습니다.' },
          { status: 500 }
        );
      }

      updatedEmail = email.trim();
      updatedCompanyName = company_name.trim();
    }

    // 비밀번호 해싱 + must_change_password + password_changed_at 일괄 업데이트
    const passwordHash = await hashPassword(new_password);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('business_number', session.business_number);

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return NextResponse.json(
        { success: false, error: '비밀번호 변경에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 세션 갱신
    const updatedSession = {
      ...session,
      must_change_password: false,
      email: updatedEmail,
      company_name: updatedCompanyName,
    };

    const response = NextResponse.json({
      success: true,
      message: '설정이 완료되었습니다.',
      data: {
        redirect: session.is_admin ? '/admin' : '/dashboard'
      }
    });

    await setSession(updatedSession);

    return response;
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

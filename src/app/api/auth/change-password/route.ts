import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession, hashPassword, isValidEmail } from '@/lib/auth';
import { getUserByBusinessNumber, getUserByEmail, updateUserEmail } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// 비밀번호 강제 변경 API (must_change_password 상태에서 사용)
export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { new_password, email } = await request.json();

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

    // 초기 비밀번호 패턴 차단: 기존(u+사업자번호) + 신규(뒤 5자리) 모두
    const normalizedBN = session.business_number.replace(/-/g, '');
    const legacyDefault = `u${normalizedBN}`;
    const newDefault = normalizedBN.slice(-5);
    if (new_password === legacyDefault || new_password === newDefault) {
      return NextResponse.json(
        { success: false, error: '초기 비밀번호와 다른 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 업데이트 (optional, @temp.local → 실제 이메일)
    let updatedEmail = session.email;
    if (email) {
      const trimmedEmail = email.trim();

      if (!isValidEmail(trimmedEmail)) {
        return NextResponse.json(
          { success: false, error: '올바른 이메일 형식을 입력해주세요.' },
          { status: 400 }
        );
      }

      if (trimmedEmail.endsWith('@temp.local')) {
        return NextResponse.json(
          { success: false, error: '실제 사용하는 이메일을 입력해주세요.' },
          { status: 400 }
        );
      }

      // 이메일 중복 확인 (자신 제외)
      const existingUser = await getUserByEmail(trimmedEmail);
      if (existingUser && existingUser.business_number !== session.business_number) {
        return NextResponse.json(
          { success: false, error: '이미 사용 중인 이메일입니다.' },
          { status: 409 }
        );
      }

      const emailUpdated = await updateUserEmail(session.business_number, trimmedEmail);
      if (!emailUpdated) {
        return NextResponse.json(
          { success: false, error: '이메일 업데이트에 실패했습니다.' },
          { status: 500 }
        );
      }
      updatedEmail = trimmedEmail;
    }

    // 비밀번호 해싱
    const passwordHash = await hashPassword(new_password);

    // 비밀번호 + must_change_password + password_changed_at 일괄 업데이트
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

    // 세션 업데이트 (must_change_password=false, email 갱신)
    const updatedSession = {
      ...session,
      must_change_password: false,
      email: updatedEmail,
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
      { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

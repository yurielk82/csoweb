import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession, hashPassword } from '@/lib/auth';
import { getUserByBusinessNumber } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ChangePasswordBody {
  new_password: string;
}

// 비밀번호 강제 변경 API (비밀번호만 처리, 프로필은 /complete-profile에서 처리)
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

    // 비밀번호 해싱 + must_change_password=false + password_changed_at 업데이트
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

    // 세션 갱신 (must_change_password만 false로, profile_complete는 유지)
    const updatedSession = {
      ...session,
      must_change_password: false,
    };
    await setSession(updatedSession);

    // 프로필 미완성이면 /complete-profile로, 아니면 대시보드로
    const redirectUrl = !user.profile_complete
      ? '/complete-profile'
      : (session.is_admin ? '/admin' : '/dashboard');

    return NextResponse.json({
      success: true,
      message: '비밀번호가 변경되었습니다.',
      data: { redirect: redirectUrl },
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

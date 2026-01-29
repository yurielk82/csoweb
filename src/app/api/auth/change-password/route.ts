import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession, hashPassword } from '@/lib/auth';
import { getUserByBusinessNumber, updateUserPassword } from '@/lib/db';
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

    const { new_password } = await request.json();

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

    // 초기 비밀번호와 동일한지 체크
    const defaultPassword = `u${session.business_number.replace(/-/g, '')}`;
    if (new_password === defaultPassword) {
      return NextResponse.json(
        { success: false, error: '초기 비밀번호와 다른 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 비밀번호 해싱
    const passwordHash = await hashPassword(new_password);

    // 비밀번호 업데이트
    const passwordUpdated = await updateUserPassword(session.business_number, passwordHash);
    if (!passwordUpdated) {
      return NextResponse.json(
        { success: false, error: '비밀번호 변경에 실패했습니다.' },
        { status: 500 }
      );
    }

    // must_change_password 플래그를 false로 변경하고 password_changed_at 업데이트
    const { error: flagError } = await supabase
      .from('users')
      .update({ 
        must_change_password: false,
        password_changed_at: new Date().toISOString()
      })
      .eq('business_number', session.business_number);

    if (flagError) {
      console.error('Failed to update must_change_password flag:', flagError);
    }

    // 세션 업데이트 (must_change_password를 false로)
    const updatedSession = {
      ...session,
      must_change_password: false,
    };
    
    const response = NextResponse.json({
      success: true,
      message: '비밀번호가 변경되었습니다.',
      data: {
        redirect: session.is_admin ? '/admin' : '/dashboard'
      }
    });

    // 세션 쿠키 업데이트
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

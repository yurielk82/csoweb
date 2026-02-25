import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/application/auth';
import { setSession, normalizeBusinessNumber } from '@/lib/auth';
import type { UserSession } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { business_number, password } = await request.json();

    if (!business_number || !password) {
      return NextResponse.json(
        { success: false, error: '사업자번호와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const normalizedBN = normalizeBusinessNumber(business_number);
    const result = await authenticateUser(normalizedBN, password);

    switch (result.type) {
      case 'not_found':
        return NextResponse.json(
          { success: false, error: '등록되지 않은 사업자번호입니다.' },
          { status: 401 }
        );

      case 'locked':
        return NextResponse.json(
          { success: false, error: '계정이 잠겼습니다. 이메일로 발송된 비밀번호 변경 링크를 확인해주세요.' },
          { status: 423 }
        );

      case 'locked_now':
        return NextResponse.json(
          { success: false, error: `로그인 ${result.maxAttempts}회 실패로 계정이 잠겼습니다. 등록된 이메일로 비밀번호 변경 링크를 발송했습니다.` },
          { status: 423 }
        );

      case 'failed':
        return NextResponse.json(
          { success: false, error: `비밀번호가 일치하지 않습니다. (실패 ${result.failedCount}/${result.maxAttempts}회)` },
          { status: 401 }
        );

      case 'pending':
        return NextResponse.json(
          { success: false, error: '승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다.' },
          { status: 403 }
        );

      case 'success':
      case 'must_change':
      case 'incomplete': {
        const session: UserSession = result.user;
        await setSession(session);

        return NextResponse.json({
          success: true,
          data: {
            user: session,
            redirect: result.redirect,
            must_change_password: result.user.must_change_password,
            profile_complete: result.user.profile_complete,
          },
        });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

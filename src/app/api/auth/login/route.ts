import { NextRequest, NextResponse } from 'next/server';
import { getUserByBusinessNumber, incrementFailedLogin, lockAccount, resetFailedLogin, createPasswordResetToken } from '@/lib/db';
import { verifyPassword, setSession, normalizeBusinessNumber, formatBusinessNumber } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import type { UserSession } from '@/types';

const MAX_FAILED_ATTEMPTS = 15;
const TOKEN_EXPIRY_MINUTES = 30;

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
    const user = await getUserByBusinessNumber(normalizedBN);

    if (!user) {
      return NextResponse.json(
        { success: false, error: '등록되지 않은 사업자번호입니다.' },
        { status: 401 }
      );
    }

    // 계정 잠금 확인
    if (user.locked_at) {
      return NextResponse.json(
        { success: false, error: '계정이 잠겼습니다. 이메일로 발송된 비밀번호 변경 링크를 확인해주세요.' },
        { status: 423 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      // 로그인 실패 횟수 증가
      const failedCount = await incrementFailedLogin(normalizedBN);

      if (failedCount >= MAX_FAILED_ATTEMPTS) {
        // 계정 잠금 처리
        await lockAccount(normalizedBN);

        // 비밀번호 변경 이메일 발송
        try {
          const token = await createPasswordResetToken(
            user.id,
            normalizedBN,
            user.email
          );

          await sendEmail(user.email, 'password_reset', {
            company_name: user.company_name,
            business_number: formatBusinessNumber(normalizedBN),
            reset_token: token.token,
            expires_in_minutes: TOKEN_EXPIRY_MINUTES,
          });
        } catch (emailError) {
          console.error('[Login] Account lock email failed:', emailError);
        }

        return NextResponse.json(
          { success: false, error: `로그인 ${MAX_FAILED_ATTEMPTS}회 실패로 계정이 잠겼습니다. 등록된 이메일로 비밀번호 변경 링크를 발송했습니다.` },
          { status: 423 }
        );
      }

      return NextResponse.json(
        { success: false, error: `비밀번호가 일치하지 않습니다. (실패 ${failedCount}/${MAX_FAILED_ATTEMPTS}회)` },
        { status: 401 }
      );
    }

    // 로그인 성공 — 실패 횟수 리셋
    if (user.failed_login_attempts > 0) {
      await resetFailedLogin(normalizedBN);
    }

    if (!user.is_admin && !user.is_approved) {
      return NextResponse.json(
        { success: false, error: '승인 대기 중입니다. 관리자 승인 후 로그인 가능합니다.' },
        { status: 403 }
      );
    }

    const session: UserSession = {
      id: user.id,
      business_number: user.business_number,
      company_name: user.company_name,
      email: user.email,
      is_admin: user.is_admin,
      is_approved: user.is_approved,
      must_change_password: user.must_change_password || false,
      profile_complete: user.profile_complete ?? true,
    };

    await setSession(session);

    // 리다이렉트 3분기: 비밀번호 변경 → 프로필 완성 → 대시보드
    let redirectUrl: string;
    if (user.must_change_password) {
      redirectUrl = '/change-password';
    } else if (!user.profile_complete) {
      redirectUrl = '/complete-profile';
    } else {
      redirectUrl = user.is_admin ? '/admin' : '/dashboard';
    }

    return NextResponse.json({
      success: true,
      data: {
        user: session,
        redirect: redirectUrl,
        must_change_password: user.must_change_password || false,
        profile_complete: user.profile_complete ?? true,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

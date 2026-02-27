// ============================================
// Login Use Case
// ============================================

import { getUserRepository, getPasswordResetTokenRepository } from '@/infrastructure/supabase';
import { verifyPassword, formatBusinessNumber } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { MAX_FAILED_LOGIN_ATTEMPTS, TOKEN_EXPIRY_MINUTES } from '@/constants/defaults';

type LoginResult =
  | { type: 'success'; user: { id: string; business_number: string; company_name: string; email: string; is_admin: boolean; is_approved: boolean; must_change_password: boolean; profile_complete: boolean }; redirect: string }
  | { type: 'not_found' }
  | { type: 'locked' }
  | { type: 'failed'; failedCount: number; maxAttempts: number }
  | { type: 'locked_now'; maxAttempts: number }
  | { type: 'pending' }
  | { type: 'must_change'; user: { id: string; business_number: string; company_name: string; email: string; is_admin: boolean; is_approved: boolean; must_change_password: boolean; profile_complete: boolean }; redirect: string }
  | { type: 'incomplete'; user: { id: string; business_number: string; company_name: string; email: string; is_admin: boolean; is_approved: boolean; must_change_password: boolean; profile_complete: boolean }; redirect: string };

export async function authenticateUser(
  businessNumber: string,
  password: string
): Promise<LoginResult> {
  const userRepo = getUserRepository();
  const tokenRepo = getPasswordResetTokenRepository();

  const user = await userRepo.findByBusinessNumber(businessNumber);

  if (!user) {
    return { type: 'not_found' };
  }

  // 계정 잠금 확인
  if (user.locked_at) {
    return { type: 'locked' };
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    const failedCount = await userRepo.incrementFailedLogin(businessNumber);

    if (failedCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await userRepo.lockAccount(businessNumber);

      // 비밀번호 변경 이메일 발송
      try {
        const token = await tokenRepo.create(user.id, businessNumber, user.email);
        await sendEmail(user.email, 'password_reset', {
          company_name: user.company_name,
          business_number: formatBusinessNumber(businessNumber),
          reset_token: token.token,
          expires_in_minutes: TOKEN_EXPIRY_MINUTES,
        });
      } catch (emailError) {
        console.error('[Login] Account lock email failed:', emailError);
      }

      return { type: 'locked_now', maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS };
    }

    return { type: 'failed', failedCount, maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS };
  }

  // 로그인 성공 — 실패 횟수 리셋
  if (user.failed_login_attempts > 0) {
    await userRepo.resetFailedLogin(businessNumber);
  }

  if (!user.is_admin && !user.is_approved) {
    return { type: 'pending' };
  }

  const sessionUser = {
    id: user.id,
    business_number: user.business_number,
    company_name: user.company_name,
    email: user.email,
    is_admin: user.is_admin,
    is_approved: user.is_approved,
    must_change_password: user.must_change_password || false,
    profile_complete: user.profile_complete ?? true,
  };

  // 리다이렉트 3분기
  if (user.must_change_password) {
    return { type: 'must_change', user: sessionUser, redirect: '/change-password' };
  }
  if (!user.profile_complete) {
    return { type: 'incomplete', user: sessionUser, redirect: '/complete-profile' };
  }

  const redirect = user.is_admin ? '/admin' : '/dashboard';
  return { type: 'success', user: sessionUser, redirect };
}

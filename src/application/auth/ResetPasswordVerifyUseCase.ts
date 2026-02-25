// ============================================
// Reset Password Verify Use Case
// ============================================

import { getUserRepository, getPasswordResetTokenRepository } from '@/infrastructure/supabase';
import { hashPassword } from '@/lib/auth';
import type { User } from '@/domain/user';

interface VerifyResult {
  valid: boolean;
  user?: User;
  tokenData?: { business_number: string; email: string; expires_at: string };
  error?: string;
}

interface ResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function verifyResetToken(token: string): Promise<VerifyResult> {
  const userRepo = getUserRepository();
  const tokenRepo = getPasswordResetTokenRepository();

  const tokenData = await tokenRepo.findByToken(token);

  if (!tokenData) {
    return { valid: false, error: '유효하지 않은 토큰입니다.' };
  }

  if (tokenData.used_at) {
    return { valid: false, error: '이미 사용된 토큰입니다.' };
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return { valid: false, error: '만료된 토큰입니다. 비밀번호 재설정을 다시 요청해주세요.' };
  }

  const user = await userRepo.findByBusinessNumber(tokenData.business_number);

  if (!user) {
    return { valid: false, error: '사용자를 찾을 수 없습니다.' };
  }

  return {
    valid: true,
    user,
    tokenData: {
      business_number: tokenData.business_number,
      email: tokenData.email,
      expires_at: tokenData.expires_at,
    },
  };
}

export async function completePasswordReset(
  token: string,
  newPassword: string
): Promise<ResetResult> {
  const userRepo = getUserRepository();
  const tokenRepo = getPasswordResetTokenRepository();

  // 토큰 유효성 재검증
  const tokenData = await tokenRepo.findByToken(token);

  if (!tokenData) {
    return { success: false, error: '유효하지 않은 토큰입니다.' };
  }

  if (tokenData.used_at) {
    return { success: false, error: '이미 사용된 토큰입니다.' };
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return { success: false, error: '만료된 토큰입니다.' };
  }

  const { business_number } = tokenData;

  // 비밀번호 해싱
  const passwordHash = await hashPassword(newPassword);

  // 비밀번호 변경 + 계정 잠금 해제
  const success = await userRepo.completePasswordChange(business_number, passwordHash);
  await userRepo.resetFailedLogin(business_number);

  if (!success) {
    return { success: false, error: '비밀번호 변경에 실패했습니다.' };
  }

  // 토큰 사용 처리
  await tokenRepo.markAsUsed(token);

  return { success: true, message: '비밀번호가 성공적으로 변경되었습니다. 로그인 페이지로 이동합니다.' };
}

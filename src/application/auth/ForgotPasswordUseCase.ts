// ============================================
// Forgot Password Use Case
// ============================================

import { getUserRepository, getPasswordResetTokenRepository } from '@/infrastructure/supabase';
import type { PasswordResetToken } from '@/domain/password-reset-token';
import type { User } from '@/domain/user';

type ForgotPasswordResult =
  | { type: 'success'; token: PasswordResetToken; user: User }
  | { type: 'user_not_found' }
  | { type: 'email_mismatch' };

export async function requestPasswordReset(
  businessNumber: string,
  email: string
): Promise<ForgotPasswordResult> {
  const userRepo = getUserRepository();
  const tokenRepo = getPasswordResetTokenRepository();

  // 1단계: 사업자번호로 사용자 조회
  const userByBN = await userRepo.findByBusinessNumber(businessNumber);

  if (!userByBN) {
    return { type: 'user_not_found' };
  }

  // 2단계: 사업자번호 + 이메일로 정확한 매칭 확인
  const user = await userRepo.findByBusinessNumberAndEmail(businessNumber, email);

  if (!user) {
    return { type: 'email_mismatch' };
  }

  // 토큰 생성
  const token = await tokenRepo.create(user.id, businessNumber, email);

  return { type: 'success', token, user };
}

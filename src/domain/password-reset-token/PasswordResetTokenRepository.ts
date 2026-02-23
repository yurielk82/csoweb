// ============================================
// Password Reset Token Repository Interface
// ============================================

import type { PasswordResetToken } from './types';

export interface PasswordResetTokenRepository {
  create(userId: string, businessNumber: string, email: string): Promise<PasswordResetToken>;
  findByToken(token: string): Promise<PasswordResetToken | null>;
  markAsUsed(token: string): Promise<boolean>;
  cleanupExpired(): Promise<number>;
}

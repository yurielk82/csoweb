// ============================================
// Supabase Repository Factory (Singleton)
// ============================================

import { SupabaseUserRepository } from './SupabaseUserRepository';
import { SupabaseSettlementRepository } from './SupabaseSettlementRepository';
import { SupabaseCSOMatchingRepository } from './SupabaseCSOMatchingRepository';
import { SupabaseColumnSettingRepository } from './SupabaseColumnSettingRepository';
import { SupabaseEmailLogRepository } from './SupabaseEmailLogRepository';
import { SupabaseCompanyRepository } from './SupabaseCompanyRepository';
import { SupabasePasswordResetTokenRepository } from './SupabasePasswordResetTokenRepository';

import type { UserRepository } from '@/domain/user';
import type { SettlementRepository } from '@/domain/settlement';
import type { CSOMatchingRepository } from '@/domain/cso-matching';
import type { ColumnSettingRepository } from '@/domain/column-setting';
import type { EmailLogRepository } from '@/domain/email';
import type { CompanyRepository } from '@/domain/company';
import type { PasswordResetTokenRepository } from '@/domain/password-reset-token';

// 싱글턴 인스턴스
let userRepo: UserRepository | null = null;
let settlementRepo: SettlementRepository | null = null;
let csoMatchingRepo: CSOMatchingRepository | null = null;
let columnSettingRepo: ColumnSettingRepository | null = null;
let emailLogRepo: EmailLogRepository | null = null;
let companyRepo: CompanyRepository | null = null;
let passwordResetTokenRepo: PasswordResetTokenRepository | null = null;

export function getUserRepository(): UserRepository {
  if (!userRepo) userRepo = new SupabaseUserRepository();
  return userRepo;
}

export function getSettlementRepository(): SettlementRepository {
  if (!settlementRepo) settlementRepo = new SupabaseSettlementRepository();
  return settlementRepo;
}

export function getCSOMatchingRepository(): CSOMatchingRepository {
  if (!csoMatchingRepo) csoMatchingRepo = new SupabaseCSOMatchingRepository();
  return csoMatchingRepo;
}

export function getColumnSettingRepository(): ColumnSettingRepository {
  if (!columnSettingRepo) columnSettingRepo = new SupabaseColumnSettingRepository();
  return columnSettingRepo;
}

export function getEmailLogRepository(): EmailLogRepository {
  if (!emailLogRepo) emailLogRepo = new SupabaseEmailLogRepository();
  return emailLogRepo;
}

export function getCompanyRepository(): CompanyRepository {
  if (!companyRepo) companyRepo = new SupabaseCompanyRepository();
  return companyRepo;
}

export function getPasswordResetTokenRepository(): PasswordResetTokenRepository {
  if (!passwordResetTokenRepo) passwordResetTokenRepo = new SupabasePasswordResetTokenRepository();
  return passwordResetTokenRepo;
}

// 개별 구현체도 re-export
export { SupabaseUserRepository } from './SupabaseUserRepository';
export { SupabaseSettlementRepository } from './SupabaseSettlementRepository';
export { SupabaseCSOMatchingRepository } from './SupabaseCSOMatchingRepository';
export { SupabaseColumnSettingRepository } from './SupabaseColumnSettingRepository';
export { SupabaseEmailLogRepository } from './SupabaseEmailLogRepository';
export { SupabaseCompanyRepository } from './SupabaseCompanyRepository';
export { SupabasePasswordResetTokenRepository } from './SupabasePasswordResetTokenRepository';

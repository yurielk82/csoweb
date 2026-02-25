// ============================================
// Database Operations - Compatibility Layer
// ============================================
// 기존 import 호환성 유지를 위한 래퍼.
// 실제 구현은 infrastructure/supabase/ 레이어에 위치.
// 새 코드는 infrastructure 레이어를 직접 사용하세요.

import {
  getUserRepository,
  getSettlementRepository,
  getColumnSettingRepository,
  getEmailLogRepository,
  getCompanyRepository,
  getPasswordResetTokenRepository,
  getCSOMatchingRepository,
} from '@/infrastructure/supabase';

import type { User, CreateUserData, UpdateUserData } from '@/domain/user';
import type { Settlement, SettlementSummary, InsertSettlementsResult } from '@/domain/settlement';
import type { ColumnSetting, ColumnSettingDefaults } from '@/domain/column-setting';
import type { EmailLog, EmailTemplateType, EmailStatus, EmailLogFilter } from '@/domain/email';
import type { CompanyInfo } from '@/domain/company';
import type { PasswordResetToken } from '@/domain/password-reset-token';

// Re-export types for backward compatibility
export type { PasswordResetToken };

// ============================================
// User Operations
// ============================================

export async function createUser(data: CreateUserData): Promise<User> {
  return getUserRepository().create(data);
}

export async function getUserByBusinessNumber(businessNumber: string): Promise<User | null> {
  return getUserRepository().findByBusinessNumber(businessNumber);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return getUserRepository().findByEmail(email);
}

export async function getUserById(id: string): Promise<User | null> {
  return getUserRepository().findById(id);
}

export async function getAllUsers(): Promise<User[]> {
  return getUserRepository().findAll();
}

export async function getPendingUsers(): Promise<User[]> {
  return getUserRepository().findPending();
}

export async function approveUser(businessNumber: string): Promise<User | null> {
  return getUserRepository().approve(businessNumber);
}

export async function rejectUser(businessNumber: string): Promise<boolean> {
  return getUserRepository().reject(businessNumber);
}

export async function updateUserPassword(businessNumber: string, passwordHash: string): Promise<boolean> {
  return getUserRepository().updatePassword(businessNumber, passwordHash);
}

export async function updateUserEmail(businessNumber: string, email: string): Promise<boolean> {
  return getUserRepository().updateEmail(businessNumber, email);
}

export async function updateUser(businessNumber: string, data: UpdateUserData): Promise<boolean> {
  return getUserRepository().update(businessNumber, data);
}

export async function deleteUser(businessNumber: string): Promise<boolean> {
  return getUserRepository().delete(businessNumber);
}

export async function resetPasswordToDefault(businessNumber: string, passwordHash: string): Promise<boolean> {
  return getUserRepository().resetPasswordToDefault(businessNumber, passwordHash);
}

export async function completePasswordChange(businessNumber: string, passwordHash: string): Promise<boolean> {
  return getUserRepository().completePasswordChange(businessNumber, passwordHash);
}

export async function getUserByBusinessNumberAndEmail(businessNumber: string, email: string): Promise<User | null> {
  return getUserRepository().findByBusinessNumberAndEmail(businessNumber, email);
}

export async function completeUserProfile(businessNumber: string, data: UpdateUserData): Promise<boolean> {
  return getUserRepository().completeProfile(businessNumber, data);
}

export async function incrementFailedLogin(businessNumber: string): Promise<number> {
  return getUserRepository().incrementFailedLogin(businessNumber);
}

export async function lockAccount(businessNumber: string): Promise<boolean> {
  return getUserRepository().lockAccount(businessNumber);
}

export async function resetFailedLogin(businessNumber: string): Promise<boolean> {
  return getUserRepository().resetFailedLogin(businessNumber);
}

// ============================================
// Settlement Operations
// ============================================

export async function insertSettlements(data: Partial<Settlement>[]): Promise<InsertSettlementsResult> {
  return getSettlementRepository().insert(data);
}

export async function getSettlementsByBusinessNumber(
  businessNumber: string,
  settlementMonth?: string,
  selectColumns?: string
): Promise<Settlement[]> {
  return getSettlementRepository().findByBusinessNumber(businessNumber, settlementMonth, selectColumns);
}

export async function getAllSettlements(settlementMonth?: string, selectColumns?: string): Promise<Settlement[]> {
  return getSettlementRepository().findAll(settlementMonth, selectColumns);
}

export async function getAvailableSettlementMonths(): Promise<string[]> {
  return getSettlementRepository().getAvailableMonths();
}

export async function getBusinessNumbersForSettlementMonth(settlementMonth: string): Promise<string[]> {
  return getSettlementRepository().getBusinessNumbersForMonth(settlementMonth);
}

export async function getSettlementSummary(businessNumber: string, settlementMonth: string): Promise<SettlementSummary> {
  return getSettlementRepository().getSummary(businessNumber, settlementMonth);
}

export async function getSettlementStats() {
  return getSettlementRepository().getStats();
}

export async function getSettlementStatsByMonth() {
  return getSettlementRepository().getStatsByMonth();
}

export async function deleteSettlementsByMonth(month: string): Promise<number> {
  return getSettlementRepository().deleteByMonth(month);
}

export async function getMonthlySummaryByBusinessNumber(
  businessNumber: string
): Promise<{
  months: Array<{ settlement_month: string; summaries: Record<string, number>; row_count: number }>;
  summary_columns: ColumnSetting[];
}> {
  const columnSettingRepo = getColumnSettingRepository();
  const summaryColumns = await columnSettingRepo.findSummaryColumns();
  const summaryColumnKeys = summaryColumns.map(c => c.column_key);

  if (summaryColumnKeys.length === 0) {
    return { months: [], summary_columns: [] };
  }

  const monthlyData = await getSettlementRepository().getMonthlySummaryByBusinessNumber(businessNumber, summaryColumnKeys);

  const months = Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      settlement_month: month,
      summaries: data.summaries,
      row_count: data.count,
    }))
    .sort((a, b) => b.settlement_month.localeCompare(a.settlement_month));

  return { months, summary_columns: summaryColumns };
}

// ============================================
// CSO Matching based Settlement Operations
// ============================================

export async function getMatchedCSOCompanyNames(businessNumber: string): Promise<string[]> {
  return getCSOMatchingRepository().getMatchedCompanyNames(businessNumber);
}

export async function getSettlementsByCSOMatching(
  businessNumber: string,
  settlementMonth?: string,
  selectColumns?: string
): Promise<Settlement[]> {
  const matchedNames = await getCSOMatchingRepository().getMatchedCompanyNames(businessNumber);
  if (matchedNames.length === 0) return [];
  return getSettlementRepository().findByCSOMatching(matchedNames, settlementMonth, selectColumns);
}

export async function getAvailableSettlementMonthsByCSOMatching(businessNumber: string): Promise<string[]> {
  const matchedNames = await getCSOMatchingRepository().getMatchedCompanyNames(businessNumber);
  if (matchedNames.length === 0) return [];
  return getSettlementRepository().getAvailableMonthsByCSOMatching(matchedNames);
}

export async function getSettlementSummaryByCSOMatching(
  businessNumber: string,
  settlementMonth: string
): Promise<SettlementSummary> {
  const matchedNames = await getCSOMatchingRepository().getMatchedCompanyNames(businessNumber);
  if (matchedNames.length === 0) {
    return { 총_금액: 0, 총_수수료: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 데이터_건수: 0, 총_수량: 0 };
  }
  return getSettlementRepository().getSummaryByCSOMatching(matchedNames, settlementMonth);
}

export async function getMonthlySummaryByCSOMatching(
  businessNumber: string
): Promise<{
  months: Array<{ settlement_month: string; summaries: Record<string, number>; row_count: number }>;
  summary_columns: ColumnSetting[];
}> {
  const columnSettingRepo = getColumnSettingRepository();
  const summaryColumns = await columnSettingRepo.findSummaryColumns();
  const summaryColumnKeys = summaryColumns.map(c => c.column_key);

  if (summaryColumnKeys.length === 0) {
    return { months: [], summary_columns: [] };
  }

  const matchedNames = await getCSOMatchingRepository().getMatchedCompanyNames(businessNumber);
  if (matchedNames.length === 0) {
    return { months: [], summary_columns: summaryColumns };
  }

  const monthlyData = await getSettlementRepository().getMonthlySummaryByCSOMatching(matchedNames, summaryColumnKeys);

  const months = Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      settlement_month: month,
      summaries: data.summaries,
      row_count: data.count,
    }))
    .sort((a, b) => b.settlement_month.localeCompare(a.settlement_month));

  return { months, summary_columns: summaryColumns };
}

// ============================================
// Column Settings Operations
// ============================================

export async function initializeColumnSettings(defaults: ColumnSettingDefaults[]): Promise<void> {
  return getColumnSettingRepository().initialize(defaults);
}

export async function getColumnSettings(): Promise<ColumnSetting[]> {
  return getColumnSettingRepository().findAll();
}

export async function updateColumnSettings(settings: Partial<ColumnSetting>[]): Promise<void> {
  return getColumnSettingRepository().update(settings);
}

// ============================================
// Email Log Operations
// ============================================

export async function createEmailLog(data: {
  recipient_email: string;
  subject: string;
  template_type: EmailTemplateType;
}): Promise<EmailLog> {
  return getEmailLogRepository().create(data);
}

export async function updateEmailLog(id: string, data: {
  status: EmailStatus;
  error_message?: string;
}): Promise<void> {
  return getEmailLogRepository().update(id, data);
}

export async function getEmailLogs(filter?: EmailLogFilter): Promise<EmailLog[]> {
  return getEmailLogRepository().findAll(filter);
}

export async function getEmailStats() {
  return getEmailLogRepository().getStats();
}

// ============================================
// Company Settings Operations
// ============================================

export async function getCompanyInfo(): Promise<CompanyInfo> {
  return getCompanyRepository().get();
}

export async function updateCompanyInfo(data: Partial<CompanyInfo>): Promise<void> {
  return getCompanyRepository().update(data);
}

// ============================================
// Password Reset Token Operations
// ============================================

export async function createPasswordResetToken(
  userId: string,
  businessNumber: string,
  email: string
): Promise<PasswordResetToken> {
  return getPasswordResetTokenRepository().create(userId, businessNumber, email);
}

export async function getPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  return getPasswordResetTokenRepository().findByToken(token);
}

export async function validatePasswordResetToken(token: string): Promise<{
  valid: boolean;
  token?: PasswordResetToken;
  error?: string;
}> {
  const tokenData = await getPasswordResetTokenRepository().findByToken(token);

  if (!tokenData) {
    return { valid: false, error: '유효하지 않은 토큰입니다.' };
  }

  if (tokenData.used_at) {
    return { valid: false, error: '이미 사용된 토큰입니다.' };
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return { valid: false, error: '만료된 토큰입니다. 비밀번호 재설정을 다시 요청해주세요.' };
  }

  return { valid: true, token: tokenData };
}

export async function markTokenAsUsed(token: string): Promise<boolean> {
  return getPasswordResetTokenRepository().markAsUsed(token);
}

export async function cleanupExpiredTokens(): Promise<number> {
  return getPasswordResetTokenRepository().cleanupExpired();
}

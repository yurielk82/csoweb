import { vi } from 'vitest';
import type { UserRepository } from '@/domain/user/UserRepository';
import type { SettlementRepository } from '@/domain/settlement/SettlementRepository';
import type { CSOMatchingRepository } from '@/domain/cso-matching/CSOMatchingRepository';
import type { ColumnSettingRepository } from '@/domain/column-setting/ColumnSettingRepository';
import type { EmailLogRepository } from '@/domain/email/EmailLogRepository';
import type { CompanyRepository } from '@/domain/company/CompanyRepository';
import type { PasswordResetTokenRepository } from '@/domain/password-reset-token/PasswordResetTokenRepository';

export function createMockUserRepository(): {
  [K in keyof UserRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByBusinessNumber: vi.fn(),
    findByEmail: vi.fn(),
    findByBusinessNumberAndEmail: vi.fn(),
    findAll: vi.fn(),
    findPending: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    update: vi.fn(),
    updatePassword: vi.fn(),
    updateEmail: vi.fn(),
    resetPasswordToDefault: vi.fn(),
    completePasswordChange: vi.fn(),
    completeProfile: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockSettlementRepository(): {
  [K in keyof SettlementRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    insert: vi.fn(),
    findByBusinessNumber: vi.fn(),
    findAll: vi.fn(),
    findByCSOMatching: vi.fn(),
    getAvailableMonths: vi.fn(),
    getAvailableMonthsByCSOMatching: vi.fn(),
    getBusinessNumbersForMonth: vi.fn(),
    getSummary: vi.fn(),
    getSummaryByCSOMatching: vi.fn(),
    getStats: vi.fn(),
    getStatsByMonth: vi.fn(),
    deleteByMonth: vi.fn(),
    getMonthlySummaryByBusinessNumber: vi.fn(),
    getMonthlySummaryByCSOMatching: vi.fn(),
  };
}

export function createMockCSOMatchingRepository(): {
  [K in keyof CSOMatchingRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    getMatchedCompanyNames: vi.fn(),
    findAll: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteAll: vi.fn(),
  };
}

export function createMockColumnSettingRepository(): {
  [K in keyof ColumnSettingRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    initialize: vi.fn(),
    findAll: vi.fn(),
    findSummaryColumns: vi.fn(),
    update: vi.fn(),
    resetToDefaults: vi.fn(),
  };
}

export function createMockEmailLogRepository(): {
  [K in keyof EmailLogRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    create: vi.fn(),
    update: vi.fn(),
    findAll: vi.fn(),
    getStats: vi.fn(),
  };
}

export function createMockCompanyRepository(): {
  [K in keyof CompanyRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn(),
    update: vi.fn(),
  };
}

export function createMockPasswordResetTokenRepository(): {
  [K in keyof PasswordResetTokenRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    create: vi.fn(),
    findByToken: vi.fn(),
    markAsUsed: vi.fn(),
    cleanupExpired: vi.fn(),
  };
}

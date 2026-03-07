// ============================================
// API 경로 상수 — 클라이언트 fetch URL 단일 관리
// ============================================

export const API_ROUTES = {
  // ── 인증 ──
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    SESSION: '/api/auth/session',
    REGISTER: '/api/auth/register',
    COMPLETE_PROFILE: '/api/auth/complete-profile',
    CHANGE_PASSWORD: '/api/auth/change-password',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD_VERIFY: '/api/auth/reset-password-verify',
  },

  // ── 사용자 ──
  USERS: {
    LIST: '/api/users',
    PROFILE: '/api/users/profile',
    APPROVE: '/api/users/approve',
    APPROVE_BATCH: '/api/users/approve-batch',
    REJECT: '/api/users/reject',
    RESET_PASSWORD: '/api/users/reset-password',
    byBusinessNumber: (bn: string) => `/api/users/${bn}`,
  },

  // ── 정산 ──
  SETTLEMENTS: {
    LIST: '/api/settlements',
    STATS: '/api/settlements/stats',
    UPLOADS: '/api/settlements/uploads',
    MONTHLY_SUMMARY: '/api/settlements/monthly-summary',
    EXPORT: '/api/settlements/export',
    byMonth: (month: string) => `/api/settlements/month/${encodeURIComponent(month)}`,
    csoCompanies: (month: string) => `/api/settlements/cso-companies?month=${encodeURIComponent(month)}`,
  },

  // ── 대시보드 ──
  DASHBOARD: {
    INIT: '/api/dashboard/init',
  },

  // ── 컬럼 설정 ──
  COLUMNS: '/api/columns',

  // ── 업로드 ──
  UPLOAD: {
    SUBMIT: '/api/upload',
    PREVIEW: '/api/upload/preview',
  },

  // ── 이메일 ──
  EMAIL: {
    MAILMERGE: '/api/email/mailmerge',
    LOGS: '/api/email/logs',
    MONTHLY_STATS: '/api/email/monthly-stats',
  },

  // ── 설정 ──
  SETTINGS: {
    COMPANY: '/api/settings/company',
    EMAIL_TEST: '/api/settings/email-test',
  },

  // ── 관리자 ──
  ADMIN: {
    CSO_MATCHING: {
      INTEGRITY: '/api/admin/cso-matching/integrity',
      UPSERT: '/api/admin/cso-matching/upsert',
    },
  },

  // ── 시스템 ──
  SYSTEM: {
    STATUS: '/api/system/status',
  },

  // ── 사업자번호 검증 ──
  VERIFY_BIZ: '/api/verify-biz',
} as const;

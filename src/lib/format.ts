// ============================================
// 공유 포맷 유틸리티
// ============================================

/** 전화번호 포맷 (02-xxxx-xxxx, 0xx-xxx-xxxx, 0xx-xxxx-xxxx 모두 지원) */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

/** 사업자번호 포맷 (000-00-00000) */
export function formatBusinessNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
}

// ── 비밀번호 강도 ──

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const STRENGTH_LEVELS: Record<string, PasswordStrength> = {
  weak: { score: 0, label: '약함', color: 'bg-destructive' },
  moderate: { score: 0, label: '보통', color: 'bg-warning' },
  strong: { score: 0, label: '강함', color: 'bg-success' },
  veryStrong: { score: 0, label: '매우 강함', color: 'bg-success' },
};

const EMPTY_STRENGTH: PasswordStrength = { score: 0, label: '', color: '' };

/** 비밀번호 강도 측정 (score 0~5) */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return EMPTY_STRENGTH;

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { ...STRENGTH_LEVELS.weak, score };
  if (score <= 3) return { ...STRENGTH_LEVELS.moderate, score };
  if (score <= 4) return { ...STRENGTH_LEVELS.strong, score };
  return { ...STRENGTH_LEVELS.veryStrong, score };
}

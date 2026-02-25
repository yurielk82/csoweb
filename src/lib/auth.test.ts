// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  formatBusinessNumber,
  normalizeBusinessNumber,
  isValidBusinessNumber,
  isValidEmail,
  isValidPassword,
} from './auth';
import type { UserSession } from '@/types';

// ============================================
// Password Hashing
// ============================================

describe('hashPassword', () => {
  it('bcrypt 해시를 반환한다', async () => {
    const hash = await hashPassword('password123');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('같은 평문이라도 매번 다른 해시를 생성한다', async () => {
    const hash1 = await hashPassword('same');
    const hash2 = await hashPassword('same');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPassword', () => {
  it('올바른 비밀번호는 true', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('correct', hash)).toBe(true);
  });

  it('틀린 비밀번호는 false', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});

// ============================================
// JWT Token
// ============================================

const testSession: UserSession = {
  id: 'test-id',
  business_number: '1234567890',
  company_name: '테스트',
  email: 'test@test.com',
  is_admin: false,
  is_approved: true,
  must_change_password: false,
  profile_complete: true,
};

describe('createToken / verifyToken', () => {
  it('토큰을 생성하고 검증할 수 있다', async () => {
    const token = await createToken(testSession);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT 형식

    const decoded = await verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe(testSession.id);
    expect(decoded!.business_number).toBe(testSession.business_number);
    expect(decoded!.is_admin).toBe(false);
  });

  it('유효하지 않은 토큰은 null을 반환한다', async () => {
    const result = await verifyToken('invalid.token.value');
    expect(result).toBeNull();
  });

  it('빈 문자열 토큰은 null을 반환한다', async () => {
    const result = await verifyToken('');
    expect(result).toBeNull();
  });
});

// ============================================
// Business Number Formatting
// ============================================

describe('formatBusinessNumber', () => {
  it('10자리 숫자를 XXX-XX-XXXXX 형식으로 포맷한다', () => {
    expect(formatBusinessNumber('1234567890')).toBe('123-45-67890');
  });

  it('이미 하이픈이 포함된 경우에도 숫자만 추출 후 포맷한다', () => {
    expect(formatBusinessNumber('123-45-67890')).toBe('123-45-67890');
  });

  it('10자리가 아닌 경우 원본을 반환한다', () => {
    expect(formatBusinessNumber('12345')).toBe('12345');
    expect(formatBusinessNumber('12345678901')).toBe('12345678901');
  });
});

describe('normalizeBusinessNumber', () => {
  it('숫자가 아닌 문자를 모두 제거한다', () => {
    expect(normalizeBusinessNumber('123-45-67890')).toBe('1234567890');
  });

  it('공백이 포함된 경우에도 숫자만 추출한다', () => {
    expect(normalizeBusinessNumber('123 45 67890')).toBe('1234567890');
  });

  it('순수 숫자는 그대로 반환한다', () => {
    expect(normalizeBusinessNumber('1234567890')).toBe('1234567890');
  });
});

// ============================================
// Validation
// ============================================

describe('isValidBusinessNumber', () => {
  it('10자리 숫자는 유효하다', () => {
    expect(isValidBusinessNumber('1234567890')).toBe(true);
  });

  it('하이픈이 포함된 10자리도 유효하다', () => {
    expect(isValidBusinessNumber('123-45-67890')).toBe(true);
  });

  it('9자리 이하는 무효하다', () => {
    expect(isValidBusinessNumber('123456789')).toBe(false);
  });

  it('11자리 이상은 무효하다', () => {
    expect(isValidBusinessNumber('12345678901')).toBe(false);
  });

  it('빈 문자열은 무효하다', () => {
    expect(isValidBusinessNumber('')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('올바른 이메일은 유효하다', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
  });

  it('@가 없으면 무효하다', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('도메인이 없으면 무효하다', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('빈 문자열은 무효하다', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('공백이 포함되면 무효하다', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('8자 이상 영문+숫자 조합이면 유효하다', () => {
    expect(isValidPassword('abcd1234')).toBe(true);
    expect(isValidPassword('Password1')).toBe(true);
    expect(isValidPassword('longpass99')).toBe(true);
  });

  it('8자 미만이면 무효하다', () => {
    expect(isValidPassword('abc123')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });

  it('숫자만 있으면 무효하다', () => {
    expect(isValidPassword('12345678')).toBe(false);
  });

  it('영문만 있으면 무효하다', () => {
    expect(isValidPassword('abcdefgh')).toBe(false);
  });

  it('정확히 8자 영문+숫자는 유효하다', () => {
    expect(isValidPassword('abcdef12')).toBe(true);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockUserRepository, createMockPasswordResetTokenRepository } from '@/__tests__/helpers/mock-repositories';
import { mockRegularUser } from '@/__tests__/helpers/mock-data';

const mockUserRepo = createMockUserRepository();
const mockTokenRepo = createMockPasswordResetTokenRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getUserRepository: () => mockUserRepo,
  getPasswordResetTokenRepository: () => mockTokenRepo,
}));

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn(() => '$2a$12$mockhash'),
}));

const { verifyResetToken, completePasswordReset } = await import('./ResetPasswordVerifyUseCase');

beforeEach(() => {
  vi.clearAllMocks();
});

const validToken = {
  id: 'token-1',
  user_id: mockRegularUser.id,
  business_number: '9876543210',
  email: 'user@test.com',
  token: 'valid-token',
  expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  used_at: null,
  created_at: new Date().toISOString(),
};

describe('verifyResetToken', () => {
  it('존재하지 않는 토큰은 invalid를 반환한다', async () => {
    mockTokenRepo.findByToken.mockResolvedValue(null);

    const result = await verifyResetToken('invalid-token');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('유효하지 않은');
  });

  it('사용된 토큰은 invalid를 반환한다', async () => {
    mockTokenRepo.findByToken.mockResolvedValue({ ...validToken, used_at: '2025-01-01' });

    const result = await verifyResetToken('used-token');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('이미 사용된');
  });

  it('만료된 토큰은 invalid를 반환한다', async () => {
    mockTokenRepo.findByToken.mockResolvedValue({
      ...validToken,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });

    const result = await verifyResetToken('expired-token');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('만료된');
  });

  it('유효한 토큰은 사용자 정보와 함께 valid를 반환한다', async () => {
    mockTokenRepo.findByToken.mockResolvedValue(validToken);
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockRegularUser);

    const result = await verifyResetToken('valid-token');
    expect(result.valid).toBe(true);
    expect(result.user).toEqual(mockRegularUser);
    expect(result.tokenData?.business_number).toBe('9876543210');
  });

  it('토큰은 유효하나 사용자가 없으면 invalid를 반환한다', async () => {
    mockTokenRepo.findByToken.mockResolvedValue(validToken);
    mockUserRepo.findByBusinessNumber.mockResolvedValue(null);

    const result = await verifyResetToken('valid-token');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('사용자를 찾을 수 없습니다');
  });
});

describe('completePasswordReset', () => {
  it('유효한 토큰으로 비밀번호를 변경한다', async () => {
    mockTokenRepo.findByToken.mockResolvedValue(validToken);
    mockUserRepo.completePasswordChange.mockResolvedValue(true);
    mockUserRepo.resetFailedLogin.mockResolvedValue(true);
    mockTokenRepo.markAsUsed.mockResolvedValue(true);

    const result = await completePasswordReset('valid-token', 'newPassword1');
    expect(result.success).toBe(true);
    expect(mockUserRepo.completePasswordChange).toHaveBeenCalledWith('9876543210', '$2a$12$mockhash');
    expect(mockUserRepo.resetFailedLogin).toHaveBeenCalledWith('9876543210');
    expect(mockTokenRepo.markAsUsed).toHaveBeenCalledWith('valid-token');
  });

  it('비밀번호 변경 실패 시 에러를 반환한다', async () => {
    mockTokenRepo.findByToken.mockResolvedValue(validToken);
    mockUserRepo.completePasswordChange.mockResolvedValue(false);
    mockUserRepo.resetFailedLogin.mockResolvedValue(true);

    const result = await completePasswordReset('valid-token', 'newPassword1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('비밀번호 변경에 실패');
  });

  it('무효한 토큰은 에러를 반환한다', async () => {
    mockTokenRepo.findByToken.mockResolvedValue(null);

    const result = await completePasswordReset('invalid-token', 'newPassword1');
    expect(result.success).toBe(false);
  });
});

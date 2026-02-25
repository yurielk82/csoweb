import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockUserRepository, createMockPasswordResetTokenRepository } from '@/__tests__/helpers/mock-repositories';
import { mockRegularUser } from '@/__tests__/helpers/mock-data';

const mockUserRepo = createMockUserRepository();
const mockTokenRepo = createMockPasswordResetTokenRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getUserRepository: () => mockUserRepo,
  getPasswordResetTokenRepository: () => mockTokenRepo,
}));

const { requestPasswordReset } = await import('./ForgotPasswordUseCase');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requestPasswordReset', () => {
  it('미등록 사업자번호는 user_not_found를 반환한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(null);

    const result = await requestPasswordReset('0000000000', 'test@test.com');
    expect(result.type).toBe('user_not_found');
  });

  it('이메일 불일치 시 email_mismatch를 반환한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockRegularUser);
    mockUserRepo.findByBusinessNumberAndEmail.mockResolvedValue(null);

    const result = await requestPasswordReset('9876543210', 'wrong@test.com');
    expect(result.type).toBe('email_mismatch');
  });

  it('정상 요청 시 토큰을 생성하고 success를 반환한다', async () => {
    const mockToken = { token: 'mock-reset-token', expires_at: '2025-01-01T01:00:00Z' };
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockRegularUser);
    mockUserRepo.findByBusinessNumberAndEmail.mockResolvedValue(mockRegularUser);
    mockTokenRepo.create.mockResolvedValue(mockToken);

    const result = await requestPasswordReset('9876543210', 'user@test.com');
    expect(result.type).toBe('success');
    if (result.type === 'success') {
      expect(result.token).toEqual(mockToken);
      expect(result.user).toEqual(mockRegularUser);
    }
    expect(mockTokenRepo.create).toHaveBeenCalledWith(
      mockRegularUser.id,
      '9876543210',
      'user@test.com'
    );
  });
});

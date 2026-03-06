import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockUserRepository, createMockPasswordResetTokenRepository } from '@/__tests__/helpers/mock-repositories';
import { mockAdminUser, mockRegularUser, mockPendingUser, mockMustChangePasswordUser, mockIncompleteProfileUser } from '@/__tests__/helpers/mock-data';

const mockUserRepo = createMockUserRepository();
const mockTokenRepo = createMockPasswordResetTokenRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getUserRepository: () => mockUserRepo,
  getPasswordResetTokenRepository: () => mockTokenRepo,
}));

vi.mock('@/lib/auth', () => ({
  verifyPassword: vi.fn(),
  formatBusinessNumber: vi.fn((bn: string) => bn),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(() => ({ success: true })),
}));

const { verifyPassword } = await import('@/lib/auth');
const mockVerifyPassword = verifyPassword as ReturnType<typeof vi.fn>;

const { authenticateUser } = await import('./LoginUseCase');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authenticateUser', () => {
  it('미등록 사업자번호는 not_found를 반환한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(null);

    const result = await authenticateUser('0000000000', 'password');
    expect(result.type).toBe('not_found');
  });

  it('잠긴 계정은 locked를 반환한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue({ ...mockRegularUser, locked_at: '2025-01-01' });

    const result = await authenticateUser('9876543210', 'password');
    expect(result.type).toBe('locked');
  });

  it('비밀번호 불일치 시 failed를 반환한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockRegularUser);
    mockVerifyPassword.mockResolvedValue(false);
    mockUserRepo.incrementFailedLogin.mockResolvedValue(1);

    const result = await authenticateUser('9876543210', 'wrongpassword');
    expect(result.type).toBe('failed');
    if (result.type === 'failed') {
      expect(result.failedCount).toBe(1);
    }
  });

  it('실패 횟수 초과 시 locked_now를 반환하고 이메일 발송한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockRegularUser);
    mockVerifyPassword.mockResolvedValue(false);
    mockUserRepo.incrementFailedLogin.mockResolvedValue(15);
    mockUserRepo.lockAccount.mockResolvedValue(true);
    mockTokenRepo.create.mockResolvedValue({ token: 'mock-token' });

    const result = await authenticateUser('9876543210', 'wrongpassword');
    expect(result.type).toBe('locked_now');
    expect(mockUserRepo.lockAccount).toHaveBeenCalled();
    expect(mockTokenRepo.create).toHaveBeenCalled();
  });

  it('미승인 사용자는 pending을 반환한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue({ ...mockPendingUser, failed_login_attempts: 0 });
    mockVerifyPassword.mockResolvedValue(true);

    const result = await authenticateUser('1111111111', 'password');
    expect(result.type).toBe('pending');
  });

  it('비밀번호 변경 필요 시 must_change를 반환한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockMustChangePasswordUser);
    mockVerifyPassword.mockResolvedValue(true);

    const result = await authenticateUser('2222222222', 'password');
    expect(result.type).toBe('must_change');
    if (result.type === 'must_change') {
      expect(result.redirect).toBe('/change-password');
    }
  });

  it('프로필 미완성 시 incomplete를 반환한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockIncompleteProfileUser);
    mockVerifyPassword.mockResolvedValue(true);

    const result = await authenticateUser('3333333333', 'password');
    expect(result.type).toBe('incomplete');
    if (result.type === 'incomplete') {
      expect(result.redirect).toBe('/complete-profile');
    }
  });

  it('정상 로그인 시 success를 반환한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockRegularUser);
    mockVerifyPassword.mockResolvedValue(true);

    const result = await authenticateUser('9876543210', 'correctpassword');
    expect(result.type).toBe('success');
    if (result.type === 'success') {
      expect(result.redirect).toBe('/home');
      expect(result.user.business_number).toBe('9876543210');
    }
  });

  it('관리자 로그인 시 /admin으로 리다이렉트', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockAdminUser);
    mockVerifyPassword.mockResolvedValue(true);

    const result = await authenticateUser('1234567890', 'password');
    if (result.type === 'success') {
      expect(result.redirect).toBe('/admin');
    }
  });

  it('로그인 성공 시 실패 횟수를 리셋한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue({ ...mockRegularUser, failed_login_attempts: 3 });
    mockVerifyPassword.mockResolvedValue(true);

    await authenticateUser('9876543210', 'password');
    expect(mockUserRepo.resetFailedLogin).toHaveBeenCalledWith('9876543210');
  });
});

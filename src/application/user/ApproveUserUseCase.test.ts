import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockUserRepository } from '@/__tests__/helpers/mock-repositories';
import { mockRegularUser } from '@/__tests__/helpers/mock-data';

const mockUserRepo = createMockUserRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getUserRepository: () => mockUserRepo,
}));

const { approveUser, rejectUser } = await import('./ApproveUserUseCase');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('approveUser', () => {
  it('사업자번호로 사용자를 승인한다', async () => {
    const approved = { ...mockRegularUser, is_approved: true };
    mockUserRepo.approve.mockResolvedValue(approved);

    const result = await approveUser('9876543210');

    expect(mockUserRepo.approve).toHaveBeenCalledWith('9876543210');
    expect(result?.is_approved).toBe(true);
  });

  it('존재하지 않는 사용자는 null을 반환한다', async () => {
    mockUserRepo.approve.mockResolvedValue(null);

    const result = await approveUser('0000000000');
    expect(result).toBeNull();
  });
});

describe('rejectUser', () => {
  it('사용자를 거절한다', async () => {
    mockUserRepo.reject.mockResolvedValue(true);

    const result = await rejectUser('9876543210');

    expect(mockUserRepo.reject).toHaveBeenCalledWith('9876543210');
    expect(result).toBe(true);
  });

  it('존재하지 않는 사용자 거절은 false를 반환한다', async () => {
    mockUserRepo.reject.mockResolvedValue(false);

    const result = await rejectUser('0000000000');
    expect(result).toBe(false);
  });
});

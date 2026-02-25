import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockUserRepository } from '@/__tests__/helpers/mock-repositories';
import { mockRegularUser, mockCreateUserData } from '@/__tests__/helpers/mock-data';

const mockUserRepo = createMockUserRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getUserRepository: () => mockUserRepo,
}));

// mock 이후 import (hoisting)
const { registerUser } = await import('./RegisterUserUseCase');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registerUser', () => {
  it('신규 사업자번호로 사용자를 생성한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(null);
    mockUserRepo.create.mockResolvedValue({ ...mockRegularUser, ...mockCreateUserData });

    const result = await registerUser(mockCreateUserData);

    expect(mockUserRepo.findByBusinessNumber).toHaveBeenCalledWith(mockCreateUserData.business_number);
    expect(mockUserRepo.create).toHaveBeenCalledWith(mockCreateUserData);
    expect(result.business_number).toBe(mockCreateUserData.business_number);
  });

  it('중복된 사업자번호이면 에러를 던진다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockRegularUser);

    await expect(registerUser(mockCreateUserData)).rejects.toThrow('이미 등록된 사업자번호입니다.');
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });
});

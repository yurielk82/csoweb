import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockCSOMatchingRepository } from '@/__tests__/helpers/mock-repositories';
import { mockCSOMatchings } from '@/__tests__/helpers/mock-data';

const mockCSOMatchingRepo = createMockCSOMatchingRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getCSOMatchingRepository: () => mockCSOMatchingRepo,
}));

const { upsertMatching, getAllMatching, deleteMatching, deleteAllMatching } =
  await import('./UpsertMatchingUseCase');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('upsertMatching', () => {
  it('CSO 매칭 데이터를 upsert한다', async () => {
    mockCSOMatchingRepo.upsert.mockResolvedValue(undefined);

    await upsertMatching(mockCSOMatchings);

    expect(mockCSOMatchingRepo.upsert).toHaveBeenCalledWith(mockCSOMatchings);
  });
});

describe('getAllMatching', () => {
  it('전체 매칭 목록을 반환한다', async () => {
    mockCSOMatchingRepo.findAll.mockResolvedValue(mockCSOMatchings);

    const result = await getAllMatching();

    expect(result).toEqual(mockCSOMatchings);
  });
});

describe('deleteMatching', () => {
  it('특정 CSO 매칭을 삭제한다', async () => {
    mockCSOMatchingRepo.delete.mockResolvedValue(true);

    const result = await deleteMatching('테스트 CSO');

    expect(mockCSOMatchingRepo.delete).toHaveBeenCalledWith('테스트 CSO');
    expect(result).toBe(true);
  });

  it('존재하지 않는 CSO 삭제는 false를 반환한다', async () => {
    mockCSOMatchingRepo.delete.mockResolvedValue(false);

    const result = await deleteMatching('없는 CSO');
    expect(result).toBe(false);
  });
});

describe('deleteAllMatching', () => {
  it('전체 매칭을 삭제한다', async () => {
    mockCSOMatchingRepo.deleteAll.mockResolvedValue(true);

    const result = await deleteAllMatching();
    expect(result).toBe(true);
  });
});

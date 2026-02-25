import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSettlementRepository } from '@/__tests__/helpers/mock-repositories';
import { mockInsertResult } from '@/__tests__/helpers/mock-data';
import type { Settlement } from '@/domain/settlement/types';

const mockSettlementRepo = createMockSettlementRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getSettlementRepository: () => mockSettlementRepo,
}));

const { uploadSettlements } = await import('./UploadSettlementsUseCase');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uploadSettlements', () => {
  it('정산 데이터를 업로드하고 결과를 반환한다', async () => {
    mockSettlementRepo.insert.mockResolvedValue(mockInsertResult);

    const data: Partial<Settlement>[] = [
      { business_number: '1234567890', 정산월: '2025-01' },
      { business_number: '9876543210', 정산월: '2025-02' },
    ];

    const result = await uploadSettlements(data);

    expect(mockSettlementRepo.insert).toHaveBeenCalledWith(data);
    expect(result.rowCount).toBe(100);
    expect(result.settlementMonths).toEqual(['2025-01', '2025-02']);
  });

  it('빈 데이터를 전달해도 repository에 위임한다', async () => {
    mockSettlementRepo.insert.mockResolvedValue({ rowCount: 0, settlementMonths: [] });

    const result = await uploadSettlements([]);

    expect(mockSettlementRepo.insert).toHaveBeenCalledWith([]);
    expect(result.rowCount).toBe(0);
  });
});

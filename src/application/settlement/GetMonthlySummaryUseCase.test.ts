import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSettlementRepository,
  createMockCSOMatchingRepository,
  createMockColumnSettingRepository,
} from '@/__tests__/helpers/mock-repositories';
import { mockColumnSettings } from '@/__tests__/helpers/mock-data';

const mockSettlementRepo = createMockSettlementRepository();
const mockCSOMatchingRepo = createMockCSOMatchingRepository();
const mockColumnSettingRepo = createMockColumnSettingRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getSettlementRepository: () => mockSettlementRepo,
  getCSOMatchingRepository: () => mockCSOMatchingRepo,
  getColumnSettingRepository: () => mockColumnSettingRepo,
}));

const { getMonthlySummary } = await import('./GetMonthlySummaryUseCase');

const summaryColumns = mockColumnSettings.filter(c => c.is_summary);

const mockTotals = {
  수량: 0, 금액: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 거래처수: 5, 제품수: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSettlementRepo.getTotals.mockResolvedValue(mockTotals);
  mockSettlementRepo.getTotalsByCSOMatching.mockResolvedValue(mockTotals);
});

describe('getMonthlySummary', () => {
  it('summary 컬럼이 없으면 빈 결과를 반환한다', async () => {
    mockColumnSettingRepo.findSummaryColumns.mockResolvedValue([]);

    const result = await getMonthlySummary('1234567890', true);

    expect(result.months).toEqual([]);
    expect(result.summary_columns).toEqual([]);
  });

  it('관리자는 business_number 기반으로 조회한다', async () => {
    mockColumnSettingRepo.findSummaryColumns.mockResolvedValue(summaryColumns);
    const monthlyData = new Map([
      ['2025-02', { summaries: { 수량: 100, 금액: 50000 }, count: 5 }],
      ['2025-01', { summaries: { 수량: 200, 금액: 100000 }, count: 10 }],
    ]);
    mockSettlementRepo.getMonthlySummaryByBusinessNumber.mockResolvedValue(monthlyData);

    const result = await getMonthlySummary('1234567890', true);

    expect(mockSettlementRepo.getMonthlySummaryByBusinessNumber).toHaveBeenCalledWith(
      '1234567890',
      summaryColumns.map(c => c.column_key)
    );
    expect(result.months).toHaveLength(2);
    expect(result.months[0].settlement_month).toBe('2025-02'); // 내림차순
    expect(result.months[1].settlement_month).toBe('2025-01');
    expect(result.summary_columns).toEqual(summaryColumns);
  });

  it('일반 회원은 CSO 매칭 기반으로 조회한다', async () => {
    mockColumnSettingRepo.findSummaryColumns.mockResolvedValue(summaryColumns);
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue(['테스트 CSO']);
    const monthlyData = new Map([
      ['2025-02', { summaries: { 수량: 50 }, count: 3 }],
    ]);
    mockSettlementRepo.getMonthlySummaryByCSOMatching.mockResolvedValue(monthlyData);

    const result = await getMonthlySummary('9876543210', false);

    expect(mockCSOMatchingRepo.getMatchedCompanyNames).toHaveBeenCalledWith('9876543210');
    expect(mockSettlementRepo.getMonthlySummaryByCSOMatching).toHaveBeenCalled();
    expect(result.months).toHaveLength(1);
  });

  it('CSO 매칭이 없는 일반 회원은 빈 months를 반환한다', async () => {
    mockColumnSettingRepo.findSummaryColumns.mockResolvedValue(summaryColumns);
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue([]);

    const result = await getMonthlySummary('9876543210', false);

    expect(result.months).toEqual([]);
    expect(result.summary_columns).toEqual(summaryColumns);
  });
});

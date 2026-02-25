import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSettlementRepository,
  createMockCSOMatchingRepository,
  createMockColumnSettingRepository,
} from '@/__tests__/helpers/mock-repositories';
import { mockSettlements, mockSettlementSummary, mockColumnSettings } from '@/__tests__/helpers/mock-data';

const mockSettlementRepo = createMockSettlementRepository();
const mockCSOMatchingRepo = createMockCSOMatchingRepository();
const mockColumnSettingRepo = createMockColumnSettingRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getSettlementRepository: () => mockSettlementRepo,
  getCSOMatchingRepository: () => mockCSOMatchingRepo,
  getColumnSettingRepository: () => mockColumnSettingRepo,
}));

const {
  getSettlements,
  getAvailableYearMonths,
  getSettlementSummary,
  getVisibleColumns,
} = await import('./GetSettlementsUseCase');

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// getSettlements
// ============================================

describe('getSettlements', () => {
  it('관리자는 전체 데이터를 조회한다', async () => {
    mockSettlementRepo.findAll.mockResolvedValue(mockSettlements);

    const result = await getSettlements({ isAdmin: true, settlementMonth: '2025-02' });

    expect(mockSettlementRepo.findAll).toHaveBeenCalledWith('2025-02', undefined);
    expect(result.settlements).toEqual(mockSettlements);
    expect(mockCSOMatchingRepo.getMatchedCompanyNames).not.toHaveBeenCalled();
  });

  it('일반 회원은 CSO 매칭 기반으로 조회한다', async () => {
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue(['테스트 CSO']);
    mockSettlementRepo.findByCSOMatching.mockResolvedValue([mockSettlements[0]]);

    const result = await getSettlements({
      isAdmin: false,
      businessNumber: '9876543210',
      settlementMonth: '2025-02',
    });

    expect(mockCSOMatchingRepo.getMatchedCompanyNames).toHaveBeenCalledWith('9876543210');
    expect(mockSettlementRepo.findByCSOMatching).toHaveBeenCalledWith(['테스트 CSO'], '2025-02', undefined);
    expect(result.settlements).toHaveLength(1);
  });

  it('CSO 매칭이 없는 일반 회원은 빈 배열을 반환한다', async () => {
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue([]);

    const result = await getSettlements({
      isAdmin: false,
      businessNumber: '9876543210',
    });

    expect(result.settlements).toEqual([]);
    expect(mockSettlementRepo.findByCSOMatching).not.toHaveBeenCalled();
  });

  it('businessNumber가 없는 비관리자는 빈 배열을 반환한다', async () => {
    const result = await getSettlements({ isAdmin: false });

    expect(result.settlements).toEqual([]);
  });
});

// ============================================
// getAvailableYearMonths
// ============================================

describe('getAvailableYearMonths', () => {
  it('관리자는 전체 가용 월을 조회한다', async () => {
    mockSettlementRepo.getAvailableMonths.mockResolvedValue(['2025-02', '2025-01']);

    const result = await getAvailableYearMonths(undefined, true);

    expect(mockSettlementRepo.getAvailableMonths).toHaveBeenCalled();
    expect(result).toEqual(['2025-02', '2025-01']);
  });

  it('일반 회원은 CSO 매칭 기반 월을 조회한다', async () => {
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue(['테스트 CSO']);
    mockSettlementRepo.getAvailableMonthsByCSOMatching.mockResolvedValue(['2025-02']);

    const result = await getAvailableYearMonths('9876543210', false);

    expect(result).toEqual(['2025-02']);
  });

  it('CSO 매칭 없는 일반 회원은 빈 배열을 반환한다', async () => {
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue([]);

    const result = await getAvailableYearMonths('9876543210', false);
    expect(result).toEqual([]);
  });

  it('businessNumber가 없는 비관리자는 빈 배열을 반환한다', async () => {
    const result = await getAvailableYearMonths(undefined, false);
    expect(result).toEqual([]);
  });
});

// ============================================
// getSettlementSummary
// ============================================

describe('getSettlementSummary', () => {
  it('관리자는 getSummary로 조회한다', async () => {
    mockSettlementRepo.getSummary.mockResolvedValue(mockSettlementSummary);

    const result = await getSettlementSummary('1234567890', '2025-02', true);

    expect(mockSettlementRepo.getSummary).toHaveBeenCalledWith('1234567890', '2025-02');
    expect(result).toEqual(mockSettlementSummary);
  });

  it('일반 회원은 CSO 매칭 기반 요약을 조회한다', async () => {
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue(['테스트 CSO']);
    mockSettlementRepo.getSummaryByCSOMatching.mockResolvedValue(mockSettlementSummary);

    const result = await getSettlementSummary('9876543210', '2025-02', false);

    expect(mockSettlementRepo.getSummaryByCSOMatching).toHaveBeenCalledWith(['테스트 CSO'], '2025-02');
    expect(result).toEqual(mockSettlementSummary);
  });

  it('CSO 매칭 없는 일반 회원은 제로 요약을 반환한다', async () => {
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue([]);

    const result = await getSettlementSummary('9876543210', '2025-02', false);

    expect(result.총_금액).toBe(0);
    expect(result.데이터_건수).toBe(0);
  });
});

// ============================================
// getVisibleColumns
// ============================================

describe('getVisibleColumns', () => {
  it('전체 컬럼 설정을 반환한다', async () => {
    mockColumnSettingRepo.findAll.mockResolvedValue(mockColumnSettings);

    const result = await getVisibleColumns();
    expect(result).toEqual(mockColumnSettings);
  });
});

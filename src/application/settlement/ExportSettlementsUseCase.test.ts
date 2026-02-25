import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSettlementRepository,
  createMockCSOMatchingRepository,
  createMockColumnSettingRepository,
} from '@/__tests__/helpers/mock-repositories';
import { mockSettlements, mockColumnSettings } from '@/__tests__/helpers/mock-data';

const mockSettlementRepo = createMockSettlementRepository();
const mockCSOMatchingRepo = createMockCSOMatchingRepository();
const mockColumnSettingRepo = createMockColumnSettingRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getSettlementRepository: () => mockSettlementRepo,
  getCSOMatchingRepository: () => mockCSOMatchingRepo,
  getColumnSettingRepository: () => mockColumnSettingRepo,
}));

vi.mock('@/infrastructure/excel', () => ({
  exportToExcel: vi.fn(() => new Uint8Array([0x50, 0x4b])),
}));

const { exportSettlements } = await import('./ExportSettlementsUseCase');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exportSettlements', () => {
  beforeEach(() => {
    mockColumnSettingRepo.findAll.mockResolvedValue(mockColumnSettings);
  });

  it('관리자는 전체 데이터를 엑셀로 내보낸다', async () => {
    mockSettlementRepo.findAll.mockResolvedValue(mockSettlements);

    const result = await exportSettlements({ isAdmin: true, settlementMonth: '2025-02' });

    expect(mockSettlementRepo.findAll).toHaveBeenCalledWith('2025-02');
    expect(result.buffer).toBeInstanceOf(Uint8Array);
    expect(result.filename).toContain('정산서');
    expect(result.filename).toContain('2025-02');
  });

  it('일반 회원은 CSO 매칭 기반으로 내보낸다', async () => {
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue(['테스트 CSO']);
    mockSettlementRepo.findByCSOMatching.mockResolvedValue([mockSettlements[0]]);

    const result = await exportSettlements({
      isAdmin: false,
      businessNumber: '9876543210',
      settlementMonth: '2025-02',
    });

    expect(mockCSOMatchingRepo.getMatchedCompanyNames).toHaveBeenCalledWith('9876543210');
    expect(result.buffer).toBeInstanceOf(Uint8Array);
  });

  it('CSO 매칭이 없는 회원은 빈 엑셀을 반환한다', async () => {
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue([]);

    const result = await exportSettlements({
      isAdmin: false,
      businessNumber: '9876543210',
    });

    expect(result.buffer).toBeInstanceOf(Uint8Array);
    expect(mockSettlementRepo.findByCSOMatching).not.toHaveBeenCalled();
  });

  it('businessNumber가 없는 비관리자는 빈 엑셀을 반환한다', async () => {
    const result = await exportSettlements({ isAdmin: false });

    expect(result.buffer).toBeInstanceOf(Uint8Array);
  });

  it('visible 컬럼만 display_order 순서로 내보낸다', async () => {
    mockSettlementRepo.findAll.mockResolvedValue(mockSettlements);

    await exportSettlements({ isAdmin: true });

    // findAll에서 visible 컬럼만 필터링하여 exportToExcel에 전달하는지 간접 확인
    const { exportToExcel } = await import('@/infrastructure/excel');
    expect(exportToExcel).toHaveBeenCalled();
    const calledColumns = (exportToExcel as ReturnType<typeof vi.fn>).mock.calls[0][1];
    // '웹코드'는 is_visible=false이므로 제외
    expect(calledColumns.find((c: { key: string }) => c.key === '웹코드')).toBeUndefined();
  });
});

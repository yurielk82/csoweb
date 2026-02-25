import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockAdminSession, mockRegularSession, mockSettlements, mockColumnSettings } from '@/__tests__/helpers/mock-data';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

const mockSettlementRepo = {
  findAll: vi.fn(),
  findByCSOMatching: vi.fn(),
};
const mockCSOMatchingRepo = {
  getMatchedCompanyNames: vi.fn(),
};
const mockColumnSettingRepo = {
  findAll: vi.fn(),
};

vi.mock('@/infrastructure/supabase', () => ({
  getSettlementRepository: vi.fn(() => mockSettlementRepo),
  getCSOMatchingRepository: vi.fn(() => mockCSOMatchingRepo),
  getColumnSettingRepository: vi.fn(() => mockColumnSettingRepo),
}));

vi.mock('@/lib/excel', () => ({
  exportToExcel: vi.fn(() => new Uint8Array([0x50, 0x4b, 0x03, 0x04])),
}));

const { getSession } = await import('@/lib/auth');
const { GET } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;

function createExportRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/settlements/export');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockColumnSettingRepo.findAll.mockResolvedValue(mockColumnSettings);
});

describe('GET /api/settlements/export', () => {
  it('미인증 요청은 401을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(createExportRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('관리자는 엑셀 파일을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.findAll.mockResolvedValue(mockSettlements);

    const res = await GET(createExportRequest({ settlement_month: '2025-02' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('spreadsheetml');
    expect(res.headers.get('Content-Disposition')).toContain('2025-02');
  });

  it('일반 회원은 CSO 매칭 기반으로 엑셀을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue(['CSO업체A']);
    mockSettlementRepo.findByCSOMatching.mockResolvedValue([mockSettlements[0]]);

    const res = await GET(createExportRequest());

    expect(res.status).toBe(200);
    expect(mockCSOMatchingRepo.getMatchedCompanyNames).toHaveBeenCalledWith(
      mockRegularSession.business_number
    );
    expect(mockSettlementRepo.findByCSOMatching).toHaveBeenCalledWith(
      ['CSO업체A'],
      undefined,
      expect.any(String)
    );
  });

  it('columns 파라미터로 특정 컬럼만 내보낸다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.findAll.mockResolvedValue(mockSettlements);

    const res = await GET(createExportRequest({ columns: '정산월,거래처명' }));

    expect(res.status).toBe(200);
  });
});

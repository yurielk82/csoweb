import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockAdminSession, mockRegularSession, mockSettlements, mockColumnSettings } from '@/__tests__/helpers/mock-data';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

const mockSettlementRepo = {
  findAll: vi.fn(),
  findByCSOMatching: vi.fn(),
  getAvailableMonths: vi.fn(),
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

const { getSession } = await import('@/lib/auth');
const { GET } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/settlements');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockColumnSettingRepo.findAll.mockResolvedValue(mockColumnSettings);
});

describe('GET /api/settlements', () => {
  it('미인증 요청은 401을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(createGetRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('로그인');
  });

  it('관리자는 전체 정산서를 조회한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.findAll.mockResolvedValue(mockSettlements);

    const res = await GET(createGetRequest({ settlement_month: '2025-02' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.settlements).toHaveLength(3);
    expect(json.data.pagination.total).toBe(3);
    expect(json.data.totals.수량).toBe(350);
  });

  it('일반 회원은 CSO 매칭 기반으로 조회한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);
    mockCSOMatchingRepo.getMatchedCompanyNames.mockResolvedValue(['CSO업체A']);
    mockSettlementRepo.findByCSOMatching.mockResolvedValue([mockSettlements[0]]);

    const res = await GET(createGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockCSOMatchingRepo.getMatchedCompanyNames).toHaveBeenCalled();
    expect(mockSettlementRepo.findByCSOMatching).toHaveBeenCalled();
    expect(json.data.settlements).toHaveLength(1);
  });

  it('search 파라미터로 필터링한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.findAll.mockResolvedValue(mockSettlements);

    const res = await GET(createGetRequest({ search: '서울' }));
    const json = await res.json();

    // '서울약국'만 매칭
    expect(json.data.settlements).toHaveLength(1);
    expect(json.data.pagination.total).toBe(1);
  });

  it('페이지네이션이 적용된다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.findAll.mockResolvedValue(mockSettlements);

    const res = await GET(createGetRequest({ page: '1', page_size: '2' }));
    const json = await res.json();

    expect(json.data.settlements).toHaveLength(2);
    expect(json.data.pagination.total).toBe(3);
    expect(json.data.pagination.totalPages).toBe(2);
  });

  it('합계(totals)가 전체 데이터 기준으로 계산된다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.findAll.mockResolvedValue(mockSettlements);

    const res = await GET(createGetRequest());
    const json = await res.json();

    // 100000 + 50000 + 200000 = 350000
    expect(json.data.totals.금액).toBe(350000);
    // 10000 + 5000 + 20000 = 35000
    expect(json.data.totals.제약수수료_합계).toBe(35000);
  });
});

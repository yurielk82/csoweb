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
  findAllPaginated: vi.fn(),
  findByCSOMatchingPaginated: vi.fn(),
  getTotals: vi.fn(),
  getTotalsByCSOMatching: vi.fn(),
};

vi.mock('@/infrastructure/supabase', () => ({
  getSettlementRepository: vi.fn(() => mockSettlementRepo),
}));

const mockGetCachedColumns = vi.fn();
const mockGetCachedMatchedNames = vi.fn();
const mockGetCachedTotals = vi.fn();

vi.mock('@/lib/data-cache', () => ({
  getCachedColumns: (...args: unknown[]) => mockGetCachedColumns(...args),
  getCachedMatchedNames: (...args: unknown[]) => mockGetCachedMatchedNames(...args),
  getCachedTotals: (...args: unknown[]) => mockGetCachedTotals(...args),
}));

const { getSession } = await import('@/lib/auth');
const { GET } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;

const mockTotals = {
  수량: 350,
  금액: 350000,
  제약수수료_합계: 35000,
  담당수수료_합계: 3500,
  거래처수: 12,
  제품수: 8,
};

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/settlements');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCachedColumns.mockResolvedValue(mockColumnSettings);
  mockGetCachedTotals.mockResolvedValue(mockTotals);
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
    mockSettlementRepo.findAllPaginated.mockResolvedValue({
      data: mockSettlements,
      total: 3,
    });

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
    mockGetCachedMatchedNames.mockResolvedValue(['CSO업체A']);
    mockSettlementRepo.findByCSOMatchingPaginated.mockResolvedValue({
      data: [mockSettlements[0]],
      total: 1,
    });

    const res = await GET(createGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockGetCachedMatchedNames).toHaveBeenCalledWith(mockRegularSession.business_number);
    expect(mockSettlementRepo.findByCSOMatchingPaginated).toHaveBeenCalled();
    expect(json.data.settlements).toHaveLength(1);
  });

  it('search 파라미터가 DB 쿼리에 전달된다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.findAllPaginated.mockResolvedValue({
      data: [mockSettlements[0]],
      total: 1,
    });

    const res = await GET(createGetRequest({ search: '서울' }));
    const json = await res.json();

    expect(json.data.settlements).toHaveLength(1);
    expect(json.data.pagination.total).toBe(1);
    // search가 findAllPaginated에 전달되었는지 확인
    expect(mockSettlementRepo.findAllPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ search: '서울' })
    );
  });

  it('페이지네이션이 적용된다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.findAllPaginated.mockResolvedValue({
      data: mockSettlements.slice(0, 2),
      total: 3,
    });

    const res = await GET(createGetRequest({ page: '1', page_size: '2' }));
    const json = await res.json();

    expect(json.data.settlements).toHaveLength(2);
    expect(json.data.pagination.total).toBe(3);
    expect(json.data.pagination.totalPages).toBe(2);
  });

  it('합계(totals)가 DB 합계 기준으로 반환된다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.findAllPaginated.mockResolvedValue({
      data: mockSettlements,
      total: 3,
    });

    const res = await GET(createGetRequest({ settlement_month: '2025-02' }));
    const json = await res.json();

    expect(json.data.totals.금액).toBe(350000);
    expect(json.data.totals.제약수수료_합계).toBe(35000);
  });
});

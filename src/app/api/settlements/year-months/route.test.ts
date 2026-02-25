import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAdminSession, mockRegularSession } from '@/__tests__/helpers/mock-data';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getAvailableSettlementMonths: vi.fn(),
  getAvailableSettlementMonthsByCSOMatching: vi.fn(),
}));

const { getSession } = await import('@/lib/auth');
const { getAvailableSettlementMonths, getAvailableSettlementMonthsByCSOMatching } = await import('@/lib/db');
const { GET } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;
const mockGetMonths = getAvailableSettlementMonths as ReturnType<typeof vi.fn>;
const mockGetMonthsByCSO = getAvailableSettlementMonthsByCSOMatching as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/settlements/year-months', () => {
  it('미인증 요청은 401을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('관리자는 전체 정산월을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockGetMonths.mockResolvedValue(['2025-02', '2025-01']);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(['2025-02', '2025-01']);
  });

  it('일반 회원은 CSO 매칭 기반 정산월을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);
    mockGetMonthsByCSO.mockResolvedValue(['2025-02']);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(['2025-02']);
    expect(mockGetMonthsByCSO).toHaveBeenCalledWith(mockRegularSession.business_number);
  });
});

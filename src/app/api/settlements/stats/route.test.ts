import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAdminSession, mockRegularSession } from '@/__tests__/helpers/mock-data';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

const mockSettlementRepo = {
  getStatsByMonth: vi.fn(),
};

vi.mock('@/infrastructure/supabase', () => ({
  getSettlementRepository: vi.fn(() => mockSettlementRepo),
}));

const { getSession } = await import('@/lib/auth');
const { GET } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/settlements/stats', () => {
  it('미인증 요청은 403을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('관리자');
  });

  it('일반 회원은 403을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('관리자는 통계를 반환한다', async () => {
    const stats = { totalRows: 500, totalBusinesses: 10, months: [] };
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.getStatsByMonth.mockResolvedValue(stats);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(stats);
  });
});

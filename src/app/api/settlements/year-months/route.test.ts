import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAdminSession, mockRegularSession } from '@/__tests__/helpers/mock-data';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/application/settlement', () => ({
  getAvailableYearMonths: vi.fn(),
}));

const { getSession } = await import('@/lib/auth');
const { getAvailableYearMonths } = await import('@/application/settlement');
const { GET } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;
const mockGetYearMonths = getAvailableYearMonths as ReturnType<typeof vi.fn>;

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
    mockGetYearMonths.mockResolvedValue(['2025-02', '2025-01']);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(['2025-02', '2025-01']);
    expect(mockGetYearMonths).toHaveBeenCalledWith(undefined, true);
  });

  it('일반 회원은 CSO 매칭 기반 정산월을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);
    mockGetYearMonths.mockResolvedValue(['2025-02']);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(['2025-02']);
    expect(mockGetYearMonths).toHaveBeenCalledWith(mockRegularSession.business_number, false);
  });
});

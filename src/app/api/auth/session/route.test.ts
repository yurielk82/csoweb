import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockAdminSession } from '@/__tests__/helpers/mock-data';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

const { getSession } = await import('@/lib/auth');
const { GET } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/auth/session', () => {
  it('세션이 없으면 data: null을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(false);
    expect(json.data).toBeNull();
  });

  it('세션이 있으면 사용자 정보를 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.business_number).toBe(mockAdminSession.business_number);
  });

  it('에러 발생 시 500을 반환한다', async () => {
    mockGetSession.mockRejectedValue(new Error('session error'));

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockAdminSession, mockRegularSession, mockAdminUser, mockRegularUser } from '@/__tests__/helpers/mock-data';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

const mockGetCachedUsers = vi.fn();
const mockGetCachedPendingUsers = vi.fn();

vi.mock('@/lib/data-cache', () => ({
  getCachedUsers: (...args: unknown[]) => mockGetCachedUsers(...args),
  getCachedPendingUsers: (...args: unknown[]) => mockGetCachedPendingUsers(...args),
}));

const { getSession } = await import('@/lib/auth');
const { GET } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;

function createRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/users');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/users', () => {
  it('미인증 요청은 403을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(createRequest());
    expect(res.status).toBe(403);
  });

  it('일반 회원은 403을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);

    const res = await GET(createRequest());
    expect(res.status).toBe(403);
  });

  it('관리자는 전체 사용자 목록을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    // getCachedUsers는 password_hash 제거 후 반환
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _pw1, ...safeAdmin } = mockAdminUser;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _pw2, ...safeRegular } = mockRegularUser;
    mockGetCachedUsers.mockResolvedValue([safeAdmin, safeRegular]);

    const res = await GET(createRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(2);
    // password_hash가 제거되었는지 확인
    expect(json.data[0].password_hash).toBeUndefined();
  });

  it('pending=true이면 대기 사용자만 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _pw, ...safeRegular } = mockRegularUser;
    mockGetCachedPendingUsers.mockResolvedValue([safeRegular]);

    const res = await GET(createRequest({ pending: 'true' }));
    await res.json();

    expect(res.status).toBe(200);
    expect(mockGetCachedPendingUsers).toHaveBeenCalled();
    expect(mockGetCachedUsers).not.toHaveBeenCalled();
  });
});

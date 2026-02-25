import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  clearSession: vi.fn(),
}));

const { clearSession } = await import('@/lib/auth');
const { POST } = await import('./route');

const mockClearSession = clearSession as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/logout', () => {
  it('세션을 삭제하고 200을 반환한다', async () => {
    mockClearSession.mockResolvedValue(undefined);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockClearSession).toHaveBeenCalled();
  });

  it('에러 발생 시 500을 반환한다', async () => {
    mockClearSession.mockRejectedValue(new Error('cookie error'));

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });
});

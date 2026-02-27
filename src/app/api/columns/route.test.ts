import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockAdminSession, mockRegularSession, mockColumnSettings } from '@/__tests__/helpers/mock-data';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

const mockColumnSettingRepo = {
  findAll: vi.fn(),
  update: vi.fn(),
  initialize: vi.fn(),
};

vi.mock('@/infrastructure/supabase', () => ({
  getColumnSettingRepository: vi.fn(() => mockColumnSettingRepo),
}));

vi.mock('@/types', () => ({
  DEFAULT_COLUMN_SETTINGS: [
    { column_key: '정산월', column_name: '정산월', is_visible: true, is_required: true, is_summary: false },
  ],
}));

vi.mock('@/lib/data-cache', () => ({
  invalidateColumnCache: vi.fn(),
}));

const { getSession } = await import('@/lib/auth');
const { GET, PUT, DELETE } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/columns', () => {
  it('미인증 요청은 401을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('인증된 사용자는 컬럼 설정을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);
    mockColumnSettingRepo.findAll.mockResolvedValue(mockColumnSettings);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(mockColumnSettings);
  });
});

describe('PUT /api/columns', () => {
  it('비관리자는 403을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);

    const res = await PUT(new NextRequest('http://localhost:3000/api/columns', {
      method: 'PUT',
      body: JSON.stringify({ columns: [] }),
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(res.status).toBe(403);
  });

  it('유효하지 않은 데이터는 400을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);

    const res = await PUT(new NextRequest('http://localhost:3000/api/columns', {
      method: 'PUT',
      body: JSON.stringify({ columns: 'not-array' }),
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(res.status).toBe(400);
  });

  it('관리자는 컬럼 설정을 업데이트한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockColumnSettingRepo.update.mockResolvedValue(undefined);

    const res = await PUT(new NextRequest('http://localhost:3000/api/columns', {
      method: 'PUT',
      body: JSON.stringify({ columns: mockColumnSettings }),
      headers: { 'Content-Type': 'application/json' },
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockColumnSettingRepo.update).toHaveBeenCalledWith(mockColumnSettings);
  });
});

describe('DELETE /api/columns', () => {
  it('비관리자는 403을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);

    const res = await DELETE();
    expect(res.status).toBe(403);
  });

  it('관리자는 기본값으로 초기화한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockColumnSettingRepo.update.mockResolvedValue(undefined);

    const res = await DELETE();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('기본값');
  });
});

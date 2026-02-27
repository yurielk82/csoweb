import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockAdminSession, mockRegularSession, mockRegularUser } from '@/__tests__/helpers/mock-data';

const mockUserRepo = {
  reject: vi.fn(),
  findByBusinessNumber: vi.fn(),
};

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/infrastructure/supabase', () => ({
  getUserRepository: vi.fn(() => mockUserRepo),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(() => ({ success: true })),
}));

vi.mock('@/lib/data-cache', () => ({
  invalidateUserCache: vi.fn(),
}));

const { getSession } = await import('@/lib/auth');
const { POST } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/users/reject', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/users/reject', () => {
  it('비관리자는 403을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);

    const res = await POST(createRequest({ business_number: '9876543210' }));
    expect(res.status).toBe(403);
  });

  it('사업자번호 누락 시 400을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);

    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });

  it('존재하지 않는 사용자는 404를 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockUserRepo.findByBusinessNumber.mockResolvedValue(null);

    const res = await POST(createRequest({ business_number: '0000000000' }));
    expect(res.status).toBe(404);
  });

  it('거부 실패 시 500을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockRegularUser);
    mockUserRepo.reject.mockResolvedValue(false);

    const res = await POST(createRequest({ business_number: '9876543210' }));
    expect(res.status).toBe(500);
  });

  it('거부 성공 시 200을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockRegularUser);
    mockUserRepo.reject.mockResolvedValue(true);

    const res = await POST(createRequest({ business_number: '9876543210', reason: '테스트 사유' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain(mockRegularUser.company_name);
  });
});

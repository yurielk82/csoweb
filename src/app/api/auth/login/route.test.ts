import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  mockAdminUser,
  mockRegularUser,
  mockPendingUser,
  mockMustChangePasswordUser,
  mockIncompleteProfileUser,
} from '@/__tests__/helpers/mock-data';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  getUserByBusinessNumber: vi.fn(),
  incrementFailedLogin: vi.fn(() => 1),
  lockAccount: vi.fn(),
  resetFailedLogin: vi.fn(),
  createPasswordResetToken: vi.fn(() => ({ token: 'mock-token' })),
}));

vi.mock('@/lib/auth', () => ({
  verifyPassword: vi.fn(),
  setSession: vi.fn(),
  normalizeBusinessNumber: vi.fn((bn: string) => bn.replace(/\D/g, '')),
  formatBusinessNumber: vi.fn((bn: string) => bn),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

const { getUserByBusinessNumber } = await import('@/lib/db');
const { verifyPassword, setSession } = await import('@/lib/auth');
const { POST } = await import('./route');

const mockGetUser = getUserByBusinessNumber as ReturnType<typeof vi.fn>;
const mockVerifyPassword = verifyPassword as ReturnType<typeof vi.fn>;
const mockSetSession = setSession as ReturnType<typeof vi.fn>;

function createLoginRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSetSession.mockResolvedValue(undefined);
});

describe('POST /api/auth/login', () => {
  it('필수 항목 누락 시 400을 반환한다', async () => {
    const res = await POST(createLoginRequest({ business_number: '1234567890' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('비밀번호');
  });

  it('미등록 사업자번호는 401을 반환한다', async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await POST(createLoginRequest({
      business_number: '0000000000',
      password: 'password',
    }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('등록되지 않은');
  });

  it('비밀번호 불일치 시 401을 반환한다', async () => {
    mockGetUser.mockResolvedValue(mockRegularUser);
    mockVerifyPassword.mockResolvedValue(false);

    const res = await POST(createLoginRequest({
      business_number: '9876543210',
      password: 'wrongpassword',
    }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('비밀번호가 일치하지 않습니다');
  });

  it('미승인 사용자는 403을 반환한다', async () => {
    mockGetUser.mockResolvedValue({ ...mockPendingUser, failed_login_attempts: 0 });
    mockVerifyPassword.mockResolvedValue(true);

    const res = await POST(createLoginRequest({
      business_number: '1111111111',
      password: 'password',
    }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('승인 대기');
  });

  it('정상 로그인 시 200 + 세션 설정 + 대시보드 리다이렉트', async () => {
    mockGetUser.mockResolvedValue(mockRegularUser);
    mockVerifyPassword.mockResolvedValue(true);

    const res = await POST(createLoginRequest({
      business_number: '9876543210',
      password: 'correctpassword',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.redirect).toBe('/dashboard');
    expect(json.data.user.business_number).toBe('9876543210');
    expect(mockSetSession).toHaveBeenCalled();
  });

  it('관리자 로그인 시 /admin으로 리다이렉트', async () => {
    mockGetUser.mockResolvedValue(mockAdminUser);
    mockVerifyPassword.mockResolvedValue(true);

    const res = await POST(createLoginRequest({
      business_number: '1234567890',
      password: 'password',
    }));
    const json = await res.json();

    expect(json.data.redirect).toBe('/admin');
  });

  it('비밀번호 변경 필요 시 /change-password로 리다이렉트', async () => {
    mockGetUser.mockResolvedValue(mockMustChangePasswordUser);
    mockVerifyPassword.mockResolvedValue(true);

    const res = await POST(createLoginRequest({
      business_number: '2222222222',
      password: 'password',
    }));
    const json = await res.json();

    expect(json.data.redirect).toBe('/change-password');
    expect(json.data.must_change_password).toBe(true);
  });

  it('프로필 미완성 시 /complete-profile로 리다이렉트', async () => {
    mockGetUser.mockResolvedValue(mockIncompleteProfileUser);
    mockVerifyPassword.mockResolvedValue(true);

    const res = await POST(createLoginRequest({
      business_number: '3333333333',
      password: 'password',
    }));
    const json = await res.json();

    expect(json.data.redirect).toBe('/complete-profile');
    expect(json.data.profile_complete).toBe(false);
  });
});

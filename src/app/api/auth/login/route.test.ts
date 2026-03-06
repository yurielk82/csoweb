import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  mockAdminUser,
  mockRegularUser,
  mockMustChangePasswordUser,
  mockIncompleteProfileUser,
} from '@/__tests__/helpers/mock-data';

// Mock dependencies
vi.mock('@/application/auth', () => ({
  authenticateUser: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  setSession: vi.fn(),
  normalizeBusinessNumber: vi.fn((bn: string) => bn.replace(/\D/g, '')),
}));

const { authenticateUser } = await import('@/application/auth');
const { setSession } = await import('@/lib/auth');
const { POST } = await import('./route');

const mockAuthenticateUser = authenticateUser as ReturnType<typeof vi.fn>;
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
    mockAuthenticateUser.mockResolvedValue({ type: 'not_found' });

    const res = await POST(createLoginRequest({
      business_number: '0000000000',
      password: 'password',
    }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('등록되지 않은');
  });

  it('비밀번호 불일치 시 401을 반환한다', async () => {
    mockAuthenticateUser.mockResolvedValue({ type: 'failed', failedCount: 1, maxAttempts: 15 });

    const res = await POST(createLoginRequest({
      business_number: '9876543210',
      password: 'wrongpassword',
    }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('비밀번호가 일치하지 않습니다');
  });

  it('미승인 사용자는 403을 반환한다', async () => {
    mockAuthenticateUser.mockResolvedValue({ type: 'pending' });

    const res = await POST(createLoginRequest({
      business_number: '1111111111',
      password: 'password',
    }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('승인 대기');
  });

  it('정상 로그인 시 200 + 세션 설정 + 대시보드 리다이렉트', async () => {
    mockAuthenticateUser.mockResolvedValue({
      type: 'success',
      user: {
        id: mockRegularUser.id,
        business_number: mockRegularUser.business_number,
        company_name: mockRegularUser.company_name,
        email: mockRegularUser.email,
        is_admin: false,
        is_approved: true,
        must_change_password: false,
        profile_complete: true,
      },
      redirect: '/home',
    });

    const res = await POST(createLoginRequest({
      business_number: '9876543210',
      password: 'correctpassword',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.redirect).toBe('/home');
    expect(json.data.user.business_number).toBe('9876543210');
    expect(mockSetSession).toHaveBeenCalled();
  });

  it('관리자 로그인 시 /admin으로 리다이렉트', async () => {
    mockAuthenticateUser.mockResolvedValue({
      type: 'success',
      user: {
        id: mockAdminUser.id,
        business_number: mockAdminUser.business_number,
        company_name: mockAdminUser.company_name,
        email: mockAdminUser.email,
        is_admin: true,
        is_approved: true,
        must_change_password: false,
        profile_complete: true,
      },
      redirect: '/admin',
    });

    const res = await POST(createLoginRequest({
      business_number: '1234567890',
      password: 'password',
    }));
    const json = await res.json();

    expect(json.data.redirect).toBe('/admin');
  });

  it('비밀번호 변경 필요 시 /change-password로 리다이렉트', async () => {
    mockAuthenticateUser.mockResolvedValue({
      type: 'must_change',
      user: {
        id: mockMustChangePasswordUser.id,
        business_number: mockMustChangePasswordUser.business_number,
        company_name: mockMustChangePasswordUser.company_name,
        email: mockMustChangePasswordUser.email,
        is_admin: false,
        is_approved: true,
        must_change_password: true,
        profile_complete: true,
      },
      redirect: '/change-password',
    });

    const res = await POST(createLoginRequest({
      business_number: '2222222222',
      password: 'password',
    }));
    const json = await res.json();

    expect(json.data.redirect).toBe('/change-password');
    expect(json.data.must_change_password).toBe(true);
  });

  it('프로필 미완성 시 /complete-profile로 리다이렉트', async () => {
    mockAuthenticateUser.mockResolvedValue({
      type: 'incomplete',
      user: {
        id: mockIncompleteProfileUser.id,
        business_number: mockIncompleteProfileUser.business_number,
        company_name: mockIncompleteProfileUser.company_name,
        email: mockIncompleteProfileUser.email,
        is_admin: false,
        is_approved: true,
        must_change_password: false,
        profile_complete: false,
      },
      redirect: '/complete-profile',
    });

    const res = await POST(createLoginRequest({
      business_number: '3333333333',
      password: 'password',
    }));
    const json = await res.json();

    expect(json.data.redirect).toBe('/complete-profile');
    expect(json.data.profile_complete).toBe(false);
  });
});

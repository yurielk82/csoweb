import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockRegularUser } from '@/__tests__/helpers/mock-data';

const mockUserRepo = {
  findByBusinessNumber: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
};

// Mock dependencies
vi.mock('@/infrastructure/supabase', () => ({
  getUserRepository: vi.fn(() => mockUserRepo),
}));

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn(() => '$2a$12$mockhash'),
  normalizeBusinessNumber: vi.fn((bn: string) => bn.replace(/\D/g, '')),
  isValidBusinessNumber: vi.fn((bn: string) => bn.replace(/\D/g, '').length === 10),
  isValidEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  isValidPassword: vi.fn((pw: string) => pw.length >= 6),
}));

vi.mock('@/lib/email', () => ({
  notifyAdmin: vi.fn(),
}));

vi.mock('@/lib/data-cache', () => ({
  invalidateUserCache: vi.fn(),
}));

const { POST } = await import('./route');

const validBody = {
  business_number: '5555555555',
  company_name: '신규회사',
  ceo_name: '이영희',
  zipcode: '06130',
  address1: '서울시 강남구',
  phone1: '02-555-1234',
  email: 'new@test.com',
  password: 'password123',
};

function createRegisterRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUserRepo.findByBusinessNumber.mockResolvedValue(null);
  mockUserRepo.findByEmail.mockResolvedValue(null);
  mockUserRepo.create.mockResolvedValue({ ...mockRegularUser, ...validBody, created_at: '2025-02-01T00:00:00Z' });
});

describe('POST /api/auth/register', () => {
  it('필수 항목 누락 시 400을 반환한다', async () => {
    const res = await POST(createRegisterRequest({ business_number: '5555555555' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('필수 항목');
  });

  it('유효하지 않은 사업자번호는 400을 반환한다', async () => {
    const res = await POST(createRegisterRequest({ ...validBody, business_number: '123' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('사업자번호');
  });

  it('유효하지 않은 이메일은 400을 반환한다', async () => {
    const res = await POST(createRegisterRequest({ ...validBody, email: 'not-email' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('이메일');
  });

  it('짧은 비밀번호는 400을 반환한다', async () => {
    const res = await POST(createRegisterRequest({ ...validBody, password: '12345' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('비밀번호');
  });

  it('중복 사업자번호는 409를 반환한다', async () => {
    mockUserRepo.findByBusinessNumber.mockResolvedValue(mockRegularUser);

    const res = await POST(createRegisterRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toContain('사업자번호');
  });

  it('중복 이메일은 409를 반환한다', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(mockRegularUser);

    const res = await POST(createRegisterRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toContain('이메일');
  });

  it('정상 등록 시 200 + 성공 메시지', async () => {
    const res = await POST(createRegisterRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('회원가입');
    expect(mockUserRepo.create).toHaveBeenCalled();
  });
});

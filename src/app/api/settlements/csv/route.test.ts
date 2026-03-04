import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockAdminSession, mockRegularSession, mockSettlement } from '@/__tests__/helpers/mock-data';
import {
  createMockSettlementRepository,
  createMockColumnSettingRepository,
} from '@/__tests__/helpers/mock-repositories';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

const mockSettlementRepo = createMockSettlementRepository();
const mockColumnRepo = createMockColumnSettingRepository();

vi.mock('@/infrastructure/supabase', () => ({
  getSettlementRepository: () => mockSettlementRepo,
  getColumnSettingRepository: () => mockColumnRepo,
}));

const { getSession } = await import('@/lib/auth');
const { GET } = await import('./route');

const mockGetSession = getSession as ReturnType<typeof vi.fn>;

const mockColumns = [
  { id: '1', column_key: '처방월', column_name: '처방월', display_order: 1, is_visible: true, is_required: true, is_summary: false, created_at: '', updated_at: '' },
  { id: '2', column_key: '정산월', column_name: '정산월', display_order: 2, is_visible: true, is_required: true, is_summary: false, created_at: '', updated_at: '' },
  { id: '3', column_key: '제품명', column_name: '제품명', display_order: 3, is_visible: true, is_required: false, is_summary: false, created_at: '', updated_at: '' },
  { id: '4', column_key: '금액', column_name: '금액', display_order: 4, is_visible: true, is_required: false, is_summary: true, created_at: '', updated_at: '' },
  { id: '5', column_key: '비고', column_name: '비고', display_order: 5, is_visible: false, is_required: false, is_summary: false, created_at: '', updated_at: '' },
];

function makeRequest(month?: string) {
  const url = `http://localhost/api/settlements/csv${month ? `?month=${month}` : ''}`;
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockColumnRepo.findAll.mockResolvedValue(mockColumns);
  mockSettlementRepo.findAll.mockResolvedValue([mockSettlement]);
});

describe('GET /api/settlements/csv', () => {
  it('미인증 요청은 403을 반환한다', async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(makeRequest('2025-02'));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('관리자');
  });

  it('일반 회원은 403을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockRegularSession);

    const res = await GET(makeRequest('2025-02'));
    expect(res.status).toBe(403);
  });

  it('month 파라미터 없으면 400을 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('month');
  });

  it('관리자는 CSV를 반환한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);

    const res = await GET(makeRequest('2025-02'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
  });

  it('CSV 첫 번째 컬럼 헤더가 사업자번호이다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);

    const res = await GET(makeRequest('2025-02'));
    const text = await res.text();
    const firstLine = text.split('\r\n')[0];
    const firstColumn = firstLine.split(',')[0];

    expect(firstColumn).toBe('사업자번호');
  });

  it('CSV 데이터 행의 첫 번째 값이 사업자번호이다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);

    const res = await GET(makeRequest('2025-02'));
    const text = await res.text();
    const lines = text.split('\r\n').filter(Boolean);
    const dataLine = lines[1]; // 두 번째 줄 = 첫 번째 데이터 행
    const firstValue = dataLine.split(',')[0];

    expect(firstValue).toBe(mockSettlement.business_number);
  });

  it('visible 컬럼만 포함되고 hidden 컬럼은 제외된다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);

    const res = await GET(makeRequest('2025-02'));
    const text = await res.text();
    const headerLine = text.split('\r\n')[0];

    expect(headerLine).toContain('처방월');
    expect(headerLine).not.toContain('비고'); // is_visible: false
  });

  it('CSV 특수문자(쉼표 포함)를 따옴표로 이스케이프한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);
    mockSettlementRepo.findAll.mockResolvedValue([
      { ...mockSettlement, 제품명: '테스트,약품' },
    ]);

    const res = await GET(makeRequest('2025-02'));
    const text = await res.text();

    expect(text).toContain('"테스트,약품"');
  });

  it('findAll을 정산월 파라미터와 함께 호출한다', async () => {
    mockGetSession.mockResolvedValue(mockAdminSession);

    await GET(makeRequest('2025-02'));

    expect(mockSettlementRepo.findAll).toHaveBeenCalledWith(
      '2025-02',
      expect.stringContaining('business_number')
    );
  });
});

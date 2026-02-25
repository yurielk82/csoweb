import type { User, UserSession, CreateUserData } from '@/domain/user/types';
import type { Settlement, SettlementSummary, InsertSettlementsResult } from '@/domain/settlement/types';
import type { CSOMatching } from '@/domain/cso-matching/types';
import type { ColumnSetting } from '@/domain/column-setting/types';

// ============================================
// User Fixtures
// ============================================

export const mockAdminUser: User = {
  id: 'admin-001',
  business_number: '1234567890',
  company_name: '관리자 회사',
  ceo_name: '홍길동',
  zipcode: '06130',
  address1: '서울시 강남구',
  phone1: '02-1234-5678',
  email: 'admin@test.com',
  email_verified: true,
  password_hash: '$2a$12$hashedpassword',
  is_admin: true,
  is_approved: true,
  must_change_password: false,
  profile_complete: true,
  failed_login_attempts: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockRegularUser: User = {
  id: 'user-001',
  business_number: '9876543210',
  company_name: '테스트 CSO',
  ceo_name: '김철수',
  zipcode: '13480',
  address1: '경기도 성남시',
  phone1: '031-9876-5432',
  email: 'user@test.com',
  email_verified: true,
  password_hash: '$2a$12$hashedpassword',
  is_admin: false,
  is_approved: true,
  must_change_password: false,
  profile_complete: true,
  failed_login_attempts: 0,
  created_at: '2025-02-01T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z',
};

export const mockPendingUser: User = {
  ...mockRegularUser,
  id: 'user-002',
  business_number: '1111111111',
  company_name: '대기중 회사',
  email: 'pending@test.com',
  is_approved: false,
};

export const mockMustChangePasswordUser: User = {
  ...mockRegularUser,
  id: 'user-003',
  business_number: '2222222222',
  must_change_password: true,
};

export const mockIncompleteProfileUser: User = {
  ...mockRegularUser,
  id: 'user-004',
  business_number: '3333333333',
  profile_complete: false,
};

export const mockAdminSession: UserSession = {
  id: mockAdminUser.id,
  business_number: mockAdminUser.business_number,
  company_name: mockAdminUser.company_name,
  email: mockAdminUser.email,
  is_admin: true,
  is_approved: true,
  must_change_password: false,
  profile_complete: true,
};

export const mockRegularSession: UserSession = {
  id: mockRegularUser.id,
  business_number: mockRegularUser.business_number,
  company_name: mockRegularUser.company_name,
  email: mockRegularUser.email,
  is_admin: false,
  is_approved: true,
  must_change_password: false,
  profile_complete: true,
};

export const mockCreateUserData: CreateUserData = {
  business_number: '5555555555',
  company_name: '신규 회사',
  ceo_name: '이영희',
  zipcode: '06130',
  address1: '서울시 강남구 테헤란로',
  phone1: '02-555-1234',
  email: 'new@test.com',
  password_hash: '$2a$12$newhashedpassword',
};

// ============================================
// Settlement Fixtures
// ============================================

export const mockSettlement: Settlement = {
  id: 1,
  business_number: '9876543210',
  처방월: '2025-01',
  정산월: '2025-02',
  웹코드: 'W001',
  거래처명: '서울약국',
  자체코드: null,
  CSO관리업체: '테스트 CSO',
  CSO관리업체2: null,
  부서1: null,
  부서2: null,
  부서3: null,
  영업사원: '김영업',
  제조사: '제약회사A',
  보험코드: 'INS001',
  제품명: '테스트약품',
  수량: 100,
  단가: 1000,
  금액: 100000,
  제약수수료_제한금액: null,
  제약_수수료율: 10,
  추가수수료율_제약: null,
  제약수수료율_통합: null,
  제약_수수료: 10000,
  거래처제품_인센티브율_제약: null,
  거래처제품_제약: null,
  관리업체_인센티브율_제약: null,
  관리업체_제약: null,
  제약수수료_합계: 10000,
  담당_수수료율: 5,
  추가수수료율_담당: null,
  담당수수료율_통합: null,
  담당_수수료: 5000,
  거래처제품_인센티브율_담당: null,
  거래처제품_담당: null,
  관리업체_인센티브율_담당: null,
  관리업체_담당: null,
  담당수수료_합계: 5000,
  처방전_비고: null,
  처방전_상세_비고: null,
  제품_비고: null,
  제품_비고_2: null,
  수정일시: null,
  수정자: null,
  upload_year_month: '2025-02',
  upload_date: '2025-02-15',
};

export function createMockSettlement(overrides: Partial<Settlement> = {}): Settlement {
  return { ...mockSettlement, ...overrides };
}

export const mockSettlements: Settlement[] = [
  mockSettlement,
  createMockSettlement({
    id: 2,
    거래처명: '부산약국',
    영업사원: '박영업',
    제품명: '테스트약품B',
    수량: 50,
    금액: 50000,
    제약수수료_합계: 5000,
    담당수수료_합계: 2500,
  }),
  createMockSettlement({
    id: 3,
    거래처명: '대구약국',
    CSO관리업체: '다른 CSO',
    제품명: '테스트약품C',
    수량: 200,
    금액: 200000,
    제약수수료_합계: 20000,
    담당수수료_합계: 10000,
  }),
];

export const mockSettlementSummary: SettlementSummary = {
  총_금액: 350000,
  총_수수료: 52500,
  제약수수료_합계: 35000,
  담당수수료_합계: 17500,
  데이터_건수: 3,
  총_수량: 350,
};

export const mockInsertResult: InsertSettlementsResult = {
  rowCount: 100,
  settlementMonths: ['2025-01', '2025-02'],
};

// ============================================
// CSO Matching Fixtures
// ============================================

export const mockCSOMatchings: CSOMatching[] = [
  { cso_company_name: '테스트 CSO', business_number: '9876543210' },
  { cso_company_name: '다른 CSO', business_number: '9876543210' },
];

// ============================================
// Column Setting Fixtures
// ============================================

export const mockColumnSettings: ColumnSetting[] = [
  {
    id: 'col-1',
    column_key: '정산월',
    column_name: '정산월',
    display_order: 1,
    is_visible: true,
    is_required: true,
    is_summary: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'col-2',
    column_key: '거래처명',
    column_name: '거래처명',
    display_order: 2,
    is_visible: true,
    is_required: false,
    is_summary: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'col-3',
    column_key: '제품명',
    column_name: '제품명',
    display_order: 3,
    is_visible: true,
    is_required: false,
    is_summary: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'col-4',
    column_key: '수량',
    column_name: '수량',
    display_order: 4,
    is_visible: true,
    is_required: false,
    is_summary: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'col-5',
    column_key: '금액',
    column_name: '금액',
    display_order: 5,
    is_visible: true,
    is_required: false,
    is_summary: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'col-hidden',
    column_key: '웹코드',
    column_name: '웹코드',
    display_order: 99,
    is_visible: false,
    is_required: false,
    is_summary: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

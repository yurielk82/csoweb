// ============================================
// CSO Settlement Portal - Type Definitions
// ============================================

// User Types
export interface User {
  id: string;
  business_number: string;
  company_name: string;
  ceo_name: string;
  zipcode: string;
  address1: string;
  address2?: string;
  phone1: string;
  phone2?: string;
  email: string;
  email2?: string;
  email_verified: boolean;
  password_hash: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  business_number: string;
  company_name: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
}

// Settlement Types
export interface Settlement {
  id: number;
  business_number: string;
  처방월: string;
  정산월: string;
  웹코드: string | null;
  거래처명: string | null;
  자체코드: string | null;
  CSO관리업체: string | null;
  CSO관리업체2: string | null;
  부서1: string | null;
  부서2: string | null;
  부서3: string | null;
  영업사원: string | null;
  제조사: string | null;
  보험코드: string | null;
  제품명: string | null;
  수량: number | null;
  단가: number | null;
  금액: number | null;
  제약수수료_제한금액: number | null;
  제약_수수료율: number | null;
  추가수수료율_제약: number | null;
  제약수수료율_통합: number | null;
  제약_수수료: number | null;
  거래처제품_인센티브율_제약: number | null;
  거래처제품_제약: number | null;
  관리업체_인센티브율_제약: number | null;
  관리업체_제약: number | null;
  제약수수료_합계: number | null;
  담당_수수료율: number | null;
  추가수수료율_담당: number | null;
  담당수수료율_통합: number | null;
  담당_수수료: number | null;
  거래처제품_인센티브율_담당: number | null;
  거래처제품_담당: number | null;
  관리업체_인센티브율_담당: number | null;
  관리업체_담당: number | null;
  담당수수료_합계: number | null;
  처방전_비고: string | null;
  처방전_상세_비고: string | null;
  제품_비고: string | null;
  제품_비고_2: string | null;
  수정일시: string | null;
  수정자: string | null;
  upload_year_month: string;
  upload_date: string;
  [key: string]: string | number | null | undefined;
}

// Column Settings Types
export interface ColumnSetting {
  id: string;
  column_key: string;
  column_name: string;
  display_order: number;
  is_visible: boolean;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

// Email Log Types
export type EmailTemplateType = 
  | 'registration_request'
  | 'approval_complete'
  | 'approval_rejected'
  | 'settlement_uploaded'
  | 'password_reset'
  | 'mail_merge';

export type EmailStatus = 'pending' | 'sent' | 'failed';

export interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  template_type: EmailTemplateType;
  status: EmailStatus;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Upload Types
export interface UploadResult {
  success: boolean;
  rowCount: number;
  yearMonth: string;
  errors?: string[];
}

// Mail Merge Types
export interface MailMergeTemplate {
  subject: string;
  body: string;
}

export interface MailMergeRecipient {
  business_number: string;
  company_name: string;
  email: string;
  총_금액?: number;
  총_수수료?: number;
  데이터_건수?: number;
}

export interface MailMergeRequest {
  recipients: string[]; // business_numbers
  template: MailMergeTemplate;
  year_month?: string;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter Types
export interface SettlementFilter {
  year_month?: string;
  search?: string;
}

// Excel Column Mapping (원본 컬럼명 -> DB 컬럼명)
export const EXCEL_COLUMN_MAP: Record<string, string> = {
  '처방월': '처방월',
  '정산월': '정산월',
  '웹코드': '웹코드',
  '거래처명': '거래처명',
  '자체코드': '자체코드',
  '사업자번호': 'business_number',
  'CSO관리업체': 'CSO관리업체',
  'CSO관리업체2': 'CSO관리업체2',
  '부서1': '부서1',
  '부서2': '부서2',
  '부서3': '부서3',
  '영업사원': '영업사원',
  '제조사': '제조사',
  '보험코드': '보험코드',
  '제품명': '제품명',
  '수량': '수량',
  '단가': '단가',
  '금액': '금액',
  '제약수수료 제한금액': '제약수수료_제한금액',
  '제약 수수료율': '제약_수수료율',
  '추가수수료율(제약)': '추가수수료율_제약',
  '제약수수료율(통합)': '제약수수료율_통합',
  '제약 수수료': '제약_수수료',
  '거래처/제품\n\n인센티브율(제약)': '거래처제품_인센티브율_제약',
  '거래처/제품\n\n(제약)': '거래처제품_제약',
  '관리업체\n\n인센티브율(제약)': '관리업체_인센티브율_제약',
  '관리업체\n\n(제약)': '관리업체_제약',
  '제약수수료\n\n합계': '제약수수료_합계',
  '담당 수수료율': '담당_수수료율',
  '추가수수료율(담당)': '추가수수료율_담당',
  '담당수수료율(통합)': '담당수수료율_통합',
  '담당 수수료': '담당_수수료',
  '거래처/제품\n\n인센티브율(담당)': '거래처제품_인센티브율_담당',
  '거래처/제품\n\n(담당)': '거래처제품_담당',
  '관리업체\n\n인센티브율(담당)': '관리업체_인센티브율_담당',
  '관리업체\n\n(담당)': '관리업체_담당',
  '담당수수료\n\n합계': '담당수수료_합계',
  '처방전 비고': '처방전_비고',
  '처방전 상세 비고': '처방전_상세_비고',
  '제품 비고': '제품_비고',
  '제품 비고 2': '제품_비고_2',
  '수정일시': '수정일시',
  '수정자': '수정자',
};

// Default Column Settings
export const DEFAULT_COLUMN_SETTINGS: Omit<ColumnSetting, 'id' | 'created_at' | 'updated_at'>[] = [
  { column_key: '정산월', column_name: '정산월', display_order: 1, is_visible: true, is_required: true },
  { column_key: '처방월', column_name: '처방월', display_order: 2, is_visible: true, is_required: true },
  { column_key: '제품명', column_name: '제품명', display_order: 3, is_visible: true, is_required: true },
  { column_key: '수량', column_name: '수량', display_order: 4, is_visible: true, is_required: false },
  { column_key: '단가', column_name: '단가', display_order: 5, is_visible: true, is_required: false },
  { column_key: '금액', column_name: '금액', display_order: 6, is_visible: true, is_required: true },
  { column_key: '제약_수수료', column_name: '제약 수수료', display_order: 7, is_visible: true, is_required: true },
  { column_key: '담당_수수료', column_name: '담당 수수료', display_order: 8, is_visible: true, is_required: true },
  { column_key: '제약수수료_합계', column_name: '제약수수료 합계', display_order: 9, is_visible: true, is_required: false },
  { column_key: '담당수수료_합계', column_name: '담당수수료 합계', display_order: 10, is_visible: true, is_required: false },
  { column_key: '거래처명', column_name: '거래처명', display_order: 11, is_visible: false, is_required: false },
  { column_key: 'CSO관리업체', column_name: 'CSO 관리업체', display_order: 12, is_visible: false, is_required: false },
  { column_key: '부서1', column_name: '부서', display_order: 13, is_visible: false, is_required: false },
  { column_key: '영업사원', column_name: '영업 담당자', display_order: 14, is_visible: false, is_required: false },
  { column_key: '제조사', column_name: '제조사', display_order: 15, is_visible: false, is_required: false },
  { column_key: '보험코드', column_name: '보험 코드', display_order: 16, is_visible: false, is_required: false },
  { column_key: '웹코드', column_name: '웹코드', display_order: 17, is_visible: false, is_required: false },
  { column_key: '자체코드', column_name: '자체코드', display_order: 18, is_visible: false, is_required: false },
  { column_key: 'CSO관리업체2', column_name: 'CSO 관리업체2', display_order: 19, is_visible: false, is_required: false },
  { column_key: '부서2', column_name: '부서2', display_order: 20, is_visible: false, is_required: false },
  { column_key: '부서3', column_name: '부서3', display_order: 21, is_visible: false, is_required: false },
  { column_key: '제약수수료_제한금액', column_name: '제약수수료 제한금액', display_order: 22, is_visible: false, is_required: false },
  { column_key: '제약_수수료율', column_name: '제약 수수료율', display_order: 23, is_visible: false, is_required: false },
  { column_key: '추가수수료율_제약', column_name: '추가수수료율(제약)', display_order: 24, is_visible: false, is_required: false },
  { column_key: '제약수수료율_통합', column_name: '제약수수료율(통합)', display_order: 25, is_visible: false, is_required: false },
  { column_key: '거래처제품_인센티브율_제약', column_name: '거래처/제품 인센티브율(제약)', display_order: 26, is_visible: false, is_required: false },
  { column_key: '거래처제품_제약', column_name: '거래처/제품(제약)', display_order: 27, is_visible: false, is_required: false },
  { column_key: '관리업체_인센티브율_제약', column_name: '관리업체 인센티브율(제약)', display_order: 28, is_visible: false, is_required: false },
  { column_key: '관리업체_제약', column_name: '관리업체(제약)', display_order: 29, is_visible: false, is_required: false },
  { column_key: '담당_수수료율', column_name: '담당 수수료율', display_order: 30, is_visible: false, is_required: false },
  { column_key: '추가수수료율_담당', column_name: '추가수수료율(담당)', display_order: 31, is_visible: false, is_required: false },
  { column_key: '담당수수료율_통합', column_name: '담당수수료율(통합)', display_order: 32, is_visible: false, is_required: false },
  { column_key: '거래처제품_인센티브율_담당', column_name: '거래처/제품 인센티브율(담당)', display_order: 33, is_visible: false, is_required: false },
  { column_key: '거래처제품_담당', column_name: '거래처/제품(담당)', display_order: 34, is_visible: false, is_required: false },
  { column_key: '관리업체_인센티브율_담당', column_name: '관리업체 인센티브율(담당)', display_order: 35, is_visible: false, is_required: false },
  { column_key: '관리업체_담당', column_name: '관리업체(담당)', display_order: 36, is_visible: false, is_required: false },
  { column_key: '처방전_비고', column_name: '처방전 비고', display_order: 37, is_visible: false, is_required: false },
  { column_key: '처방전_상세_비고', column_name: '처방전 상세 비고', display_order: 38, is_visible: false, is_required: false },
  { column_key: '제품_비고', column_name: '제품 비고', display_order: 39, is_visible: false, is_required: false },
  { column_key: '제품_비고_2', column_name: '제품 비고 2', display_order: 40, is_visible: false, is_required: false },
  { column_key: '수정일시', column_name: '수정일시', display_order: 41, is_visible: false, is_required: false },
  { column_key: '수정자', column_name: '수정자', display_order: 42, is_visible: false, is_required: false },
];

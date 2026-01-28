import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 환경변수는 getSupabase() 함수 내에서 직접 읽음

// 서버 사이드에서 사용하는 Supabase 클라이언트 (service_role 키 사용)
// 빌드 시 환경변수가 없을 수 있으므로 lazy initialization 사용
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      console.error('Supabase config missing - URL:', !!url, 'Key:', !!key);
      throw new Error(`Supabase 환경변수가 설정되지 않았습니다. URL: ${!!url}, KEY: ${!!key}`);
    }
    _supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabase;
}

// 기존 코드와의 호환성을 위한 getter
export const supabase = {
  from: (table: string) => getSupabase().from(table),
};

// 타입 정의
export interface DbUser {
  id: string;
  business_number: string;
  company_name: string;
  email: string;
  email_verified: boolean;
  password_hash: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbSettlement {
  id: number;
  business_number: string;
  처방월: string | null;
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
  upload_date: string;
}

export interface DbColumnSetting {
  id: string;
  column_key: string;
  column_name: string;
  is_visible: boolean;
  is_required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbEmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  template_type: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface DbCompanySettings {
  id: string;
  company_name: string | null;
  ceo_name: string | null;
  business_number: string | null;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  copyright: string | null;
  additional_info: string | null;
  updated_at: string;
}

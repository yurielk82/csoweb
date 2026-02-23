// ============================================
// Settlement Domain Types
// ============================================

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

export interface SettlementSummary {
  총_금액: number;
  총_수수료: number;
  제약수수료_합계: number;
  담당수수료_합계: number;
  데이터_건수: number;
  총_수량: number;
}

export interface SettlementStats {
  totalRows: number;
  settlementMonths: { month: string; count: number }[];
  businessCount: number;
}

export interface SettlementStatsByMonth {
  totalRows: number;
  totalBusinesses: number;
  months: {
    month: string;
    prescriptionMonth: string;
    count: number;
    csoCount: number;
    totalQuantity: number;
    totalAmount: number;
    totalCommission: number;
  }[];
}

export interface InsertSettlementsResult {
  rowCount: number;
  settlementMonths: string[];
}

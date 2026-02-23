// ============================================
// CSO Matching Domain Types
// ============================================

export type CSOMatchingStatus = 'normal' | 'unregistered' | 'pending_join' | 'missing_match';

export interface CSOMatching {
  cso_company_name: string;
  business_number: string;
  created_at?: string;
  updated_at?: string;
}

export interface IntegrityCheckResult {
  id: string;
  cso_company_name: string;
  business_number: string | null;
  status: CSOMatchingStatus;
  erp_company_name: string | null;
  last_settlement_month: string | null;
  is_approved: boolean | null;
  row_count: number;
}

export interface MatchingUploadItem {
  cso_company_name: string;
  business_number: string;
}

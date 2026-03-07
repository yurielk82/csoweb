// CSO 매칭 무결성 검사 — 공유 타입

export type RegistrationStatus = 'registered' | 'unregistered' | 'pending_approval';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type FilterStatus = 'all' | 'settlement' | 'complete' | 'not_registered' | 'no_cso' | 'unprocessed';

export interface IntegrityRow {
  id: string;
  business_number: string;
  business_name: string | null;
  registration_status: RegistrationStatus;
  cso_company_names: string[];
  last_settlement_month: string | null;
  row_count: number;
  is_readonly: boolean;
  // UI state
  saveState?: SaveState;
}

export interface MatchingUploadItem {
  cso_company_name: string;
  business_number: string;
}

export interface IntegrityStats {
  total: number;
  settlement: number;
  complete: number;
  notRegistered: number;
  noCso: number;
  unprocessed: number;
}

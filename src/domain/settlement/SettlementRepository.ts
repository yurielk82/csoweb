// ============================================
// Settlement Repository Interface
// ============================================

import type {
  Settlement,
  SettlementSummary,
  SettlementStats,
  SettlementStatsByMonth,
  InsertSettlementsResult,
} from './types';

/** DB 레벨 페이지네이션 결과 */
export interface PaginatedSettlements {
  data: Settlement[];
  total: number;
}

/** DB 레벨 합계 */
export interface SettlementTotals {
  수량: number;
  금액: number;
  제약수수료_합계: number;
  담당수수료_합계: number;
}

/** 페이지네이션 + 검색 파라미터 */
export interface SettlementQueryParams {
  settlementMonth?: string;
  selectColumns?: string;
  page: number;
  pageSize: number;
  search?: string;
}

export interface SettlementRepository {
  insert(data: Partial<Settlement>[]): Promise<InsertSettlementsResult>;
  findByBusinessNumber(businessNumber: string, settlementMonth?: string, selectColumns?: string): Promise<Settlement[]>;
  findAll(settlementMonth?: string, selectColumns?: string): Promise<Settlement[]>;
  findByCSOMatching(matchedNames: string[], settlementMonth?: string, selectColumns?: string): Promise<Settlement[]>;
  getAvailableMonths(): Promise<string[]>;
  getAvailableMonthsByCSOMatching(matchedNames: string[]): Promise<string[]>;

  /** DB 레벨 페이지네이션 — 전체 조회 */
  findAllPaginated(params: SettlementQueryParams): Promise<PaginatedSettlements>;
  /** DB 레벨 페이지네이션 — CSO 매칭 기반 */
  findByCSOMatchingPaginated(matchedNames: string[], params: SettlementQueryParams): Promise<PaginatedSettlements>;
  /** DB 레벨 합계 — 전체 */
  getTotals(settlementMonth?: string): Promise<SettlementTotals>;
  /** DB 레벨 합계 — CSO 매칭 기반 */
  getTotalsByCSOMatching(matchedNames: string[], settlementMonth?: string): Promise<SettlementTotals>;
  getBusinessNumbersForMonth(settlementMonth: string): Promise<string[]>;
  getCSOCompanyNamesForMonth(settlementMonth: string): Promise<string[]>;
  getSummary(businessNumber: string, settlementMonth: string): Promise<SettlementSummary>;
  getSummaryByCSOMatching(matchedNames: string[], settlementMonth: string): Promise<SettlementSummary>;
  getStats(): Promise<SettlementStats>;
  getStatsByMonth(): Promise<SettlementStatsByMonth>;
  deleteByMonth(month: string): Promise<number>;
  getMonthlySummaryByBusinessNumber(businessNumber: string, summaryColumnKeys: string[]): Promise<Map<string, { summaries: Record<string, number>; count: number }>>;
  getMonthlySummaryByCSOMatching(matchedNames: string[], summaryColumnKeys: string[]): Promise<Map<string, { summaries: Record<string, number>; count: number }>>;
}

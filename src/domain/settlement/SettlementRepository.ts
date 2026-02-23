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

export interface SettlementRepository {
  insert(data: Partial<Settlement>[]): Promise<InsertSettlementsResult>;
  findByBusinessNumber(businessNumber: string, settlementMonth?: string, selectColumns?: string): Promise<Settlement[]>;
  findAll(settlementMonth?: string, selectColumns?: string): Promise<Settlement[]>;
  findByCSOMatching(matchedNames: string[], settlementMonth?: string, selectColumns?: string): Promise<Settlement[]>;
  getAvailableMonths(): Promise<string[]>;
  getAvailableMonthsByCSOMatching(matchedNames: string[]): Promise<string[]>;
  getBusinessNumbersForMonth(settlementMonth: string): Promise<string[]>;
  getSummary(businessNumber: string, settlementMonth: string): Promise<SettlementSummary>;
  getSummaryByCSOMatching(matchedNames: string[], settlementMonth: string): Promise<SettlementSummary>;
  getStats(): Promise<SettlementStats>;
  getStatsByMonth(): Promise<SettlementStatsByMonth>;
  deleteByMonth(month: string): Promise<number>;
  getMonthlySummaryByBusinessNumber(businessNumber: string, summaryColumnKeys: string[]): Promise<Map<string, { summaries: Record<string, number>; count: number }>>;
  getMonthlySummaryByCSOMatching(matchedNames: string[], summaryColumnKeys: string[]): Promise<Map<string, { summaries: Record<string, number>; count: number }>>;
}

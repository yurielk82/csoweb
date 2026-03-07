// ============================================
// Get Monthly Summary Use Case
// ============================================

import { getSettlementRepository, getCSOMatchingRepository, getColumnSettingRepository } from '@/infrastructure/supabase';
import type { ColumnSetting } from '@/domain/column-setting';

interface MonthlySummaryResult {
  months: Array<{
    settlement_month: string;
    summaries: Record<string, number>;
    row_count: number;
  }>;
  summary_columns: ColumnSetting[];
  latest_distinct: { clients: number; products: number } | null;
}

export async function getMonthlySummary(
  businessNumber: string,
  isAdmin: boolean
): Promise<MonthlySummaryResult> {
  const columnSettingRepo = getColumnSettingRepository();
  const settlementRepo = getSettlementRepository();
  const csoMatchingRepo = getCSOMatchingRepository();

  // 1. is_summary가 true인 컬럼 조회
  const summaryColumns = await columnSettingRepo.findSummaryColumns();
  const summaryColumnKeys = summaryColumns.map(c => c.column_key);

  if (summaryColumnKeys.length === 0) {
    return { months: [], summary_columns: [], latest_distinct: null };
  }

  let monthlyData: Map<string, { summaries: Record<string, number>; count: number }>;
  let matchedNames: string[] | null = null;

  if (isAdmin) {
    // 관리자: business_number 기반
    monthlyData = await settlementRepo.getMonthlySummaryByBusinessNumber(businessNumber, summaryColumnKeys);
  } else {
    // 일반 회원: CSO 매칭 기반
    matchedNames = await csoMatchingRepo.getMatchedCompanyNames(businessNumber);
    if (matchedNames.length === 0) {
      return { months: [], summary_columns: summaryColumns, latest_distinct: null };
    }
    monthlyData = await settlementRepo.getMonthlySummaryByCSOMatching(matchedNames, summaryColumnKeys);
  }

  // 정산월 기준 내림차순 정렬
  const months = Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      settlement_month: month,
      summaries: data.summaries,
      row_count: data.count,
    }))
    .sort((a, b) => b.settlement_month.localeCompare(a.settlement_month));

  // 최신 월의 거래처/제품 distinct 카운트
  let latestDistinct: { clients: number; products: number } | null = null;
  if (months.length > 0) {
    const latestMonth = months[0].settlement_month;
    const totals = matchedNames
      ? await settlementRepo.getTotalsByCSOMatching(matchedNames, latestMonth)
      : await settlementRepo.getTotals(latestMonth);
    latestDistinct = { clients: totals.거래처수, products: totals.제품수 };
  }

  return { months, summary_columns: summaryColumns, latest_distinct: latestDistinct };
}

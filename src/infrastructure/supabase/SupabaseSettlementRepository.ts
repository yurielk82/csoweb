// ============================================
// Supabase Settlement Repository Implementation
// ============================================

import { supabase } from './client';
import type { SettlementRepository } from '@/domain/settlement/SettlementRepository';
import type {
  Settlement,
  SettlementSummary,
  SettlementStats,
  SettlementStatsByMonth,
  InsertSettlementsResult,
} from '@/domain/settlement/types';

/**
 * Supabase 페이지네이션으로 전체 데이터 조회 헬퍼
 */
async function fetchAllPaginated<T>(
  queryBuilder: (page: number, pageSize: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const allRows: T[] = [];
  const pageSize = 1000;
  let page = 0;

  while (true) {
    const { data, error } = await queryBuilder(page, pageSize);
    if (error || !data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  return allRows;
}

export class SupabaseSettlementRepository implements SettlementRepository {
  async insert(data: Partial<Settlement>[]): Promise<InsertSettlementsResult> {
    const settlementMonthsSet = new Set<string>();
    for (const row of data) {
      if (row.정산월) {
        settlementMonthsSet.add(row.정산월);
      }
    }
    const settlementMonths = Array.from(settlementMonthsSet).sort().reverse();

    // 해당 정산월의 기존 데이터 삭제
    for (const month of settlementMonths) {
      await supabase.from('settlements').delete().eq('정산월', month);
    }

    // 새 데이터 삽입 (배치)
    const validData = data.filter(d => d.정산월);
    const batchSize = 500;

    for (let i = 0; i < validData.length; i += batchSize) {
      const batch = validData.slice(i, i + batchSize).map(row => ({
        business_number: row.business_number || '',
        처방월: row.처방월 || null,
        정산월: row.정산월 || '',
        웹코드: row.웹코드 || null,
        거래처명: row.거래처명 || null,
        자체코드: row.자체코드 || null,
        CSO관리업체: row.CSO관리업체 || null,
        CSO관리업체2: row.CSO관리업체2 || null,
        부서1: row.부서1 || null,
        부서2: row.부서2 || null,
        부서3: row.부서3 || null,
        영업사원: row.영업사원 || null,
        제조사: row.제조사 || null,
        보험코드: row.보험코드 || null,
        제품명: row.제품명 || null,
        수량: row.수량 ?? null,
        단가: row.단가 ?? null,
        금액: row.금액 ?? null,
        제약수수료_제한금액: row.제약수수료_제한금액 ?? null,
        제약_수수료율: row.제약_수수료율 ?? null,
        추가수수료율_제약: row.추가수수료율_제약 ?? null,
        제약수수료율_통합: row.제약수수료율_통합 ?? null,
        제약_수수료: row.제약_수수료 ?? null,
        거래처제품_인센티브율_제약: row.거래처제품_인센티브율_제약 ?? null,
        거래처제품_제약: row.거래처제품_제약 ?? null,
        관리업체_인센티브율_제약: row.관리업체_인센티브율_제약 ?? null,
        관리업체_제약: row.관리업체_제약 ?? null,
        제약수수료_합계: row.제약수수료_합계 ?? null,
        담당_수수료율: row.담당_수수료율 ?? null,
        추가수수료율_담당: row.추가수수료율_담당 ?? null,
        담당수수료율_통합: row.담당수수료율_통합 ?? null,
        담당_수수료: row.담당_수수료 ?? null,
        거래처제품_인센티브율_담당: row.거래처제품_인센티브율_담당 ?? null,
        거래처제품_담당: row.거래처제품_담당 ?? null,
        관리업체_인센티브율_담당: row.관리업체_인센티브율_담당 ?? null,
        관리업체_담당: row.관리업체_담당 ?? null,
        담당수수료_합계: row.담당수수료_합계 ?? null,
        처방전_비고: row.처방전_비고 || null,
        처방전_상세_비고: row.처방전_상세_비고 || null,
        제품_비고: row.제품_비고 || null,
        제품_비고_2: row.제품_비고_2 || null,
        수정일시: row.수정일시 || null,
        수정자: row.수정자 || null,
      }));

      const { error } = await supabase.from('settlements').insert(batch);
      if (error) {
        console.error('Settlement insert error:', error);
        throw new Error(error.message);
      }
    }

    return { rowCount: validData.length, settlementMonths };
  }

  async findByBusinessNumber(
    businessNumber: string,
    settlementMonth?: string,
    selectColumns?: string
  ): Promise<Settlement[]> {
    return fetchAllPaginated(async (page, pageSize) => {
      let query = supabase
        .from('settlements')
        .select(selectColumns || '*')
        .eq('business_number', businessNumber);

      if (settlementMonth) {
        query = query.eq('정산월', settlementMonth);
      }

      const result = await query
        .order('id', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      return result as { data: Settlement[] | null; error: { message: string } | null };
    });
  }

  async findAll(settlementMonth?: string, selectColumns?: string): Promise<Settlement[]> {
    return fetchAllPaginated(async (page, pageSize) => {
      let query = supabase.from('settlements').select(selectColumns || '*');

      if (settlementMonth) {
        query = query.eq('정산월', settlementMonth);
      }

      const result = await query
        .order('id', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      return result as { data: Settlement[] | null; error: { message: string } | null };
    });
  }

  async findByCSOMatching(
    matchedNames: string[],
    settlementMonth?: string,
    selectColumns?: string
  ): Promise<Settlement[]> {
    return fetchAllPaginated(async (page, pageSize) => {
      let query = supabase
        .from('settlements')
        .select(selectColumns || '*')
        .in('CSO관리업체', matchedNames);

      if (settlementMonth) {
        query = query.eq('정산월', settlementMonth);
      }

      const result = await query
        .order('id', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      return result as { data: Settlement[] | null; error: { message: string } | null };
    });
  }

  async getAvailableMonths(): Promise<string[]> {
    const rows = await fetchAllPaginated<{ 정산월: string }>(async (page, pageSize) => {
      const result = await supabase
        .from('settlements')
        .select('정산월')
        .not('정산월', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      return result as { data: { 정산월: string }[] | null; error: { message: string } | null };
    });

    const months = [...new Set(rows.map(d => d.정산월))].filter(Boolean);
    return months.sort().reverse();
  }

  async getAvailableMonthsByCSOMatching(matchedNames: string[]): Promise<string[]> {
    const rows = await fetchAllPaginated<{ 정산월: string }>(async (page, pageSize) => {
      const result = await supabase
        .from('settlements')
        .select('정산월')
        .in('CSO관리업체', matchedNames)
        .not('정산월', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      return result as { data: { 정산월: string }[] | null; error: { message: string } | null };
    });

    const months = [...new Set(rows.map(d => d.정산월))].filter(Boolean);
    return months.sort().reverse();
  }

  async getBusinessNumbersForMonth(settlementMonth: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('settlements')
      .select('business_number')
      .eq('정산월', settlementMonth);

    if (error || !data) return [];
    return [...new Set(data.map(d => d.business_number))];
  }

  async getSummary(businessNumber: string, settlementMonth: string): Promise<SettlementSummary> {
    const { data, error } = await supabase
      .from('settlements')
      .select('금액, 수량, 제약수수료_합계, 담당수수료_합계')
      .eq('business_number', businessNumber)
      .eq('정산월', settlementMonth);

    return this.calculateSummary(data as unknown as Record<string, unknown>[] | null, error);
  }

  async getSummaryByCSOMatching(matchedNames: string[], settlementMonth: string): Promise<SettlementSummary> {
    const { data, error } = await supabase
      .from('settlements')
      .select('금액, 수량, 제약수수료_합계, 담당수수료_합계')
      .in('CSO관리업체', matchedNames)
      .eq('정산월', settlementMonth);

    return this.calculateSummary(data as unknown as Record<string, unknown>[] | null, error);
  }

  private calculateSummary(
    data: Record<string, unknown>[] | null,
    error: { message: string } | null
  ): SettlementSummary {
    if (error || !data) {
      return { 총_금액: 0, 총_수수료: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 데이터_건수: 0, 총_수량: 0 };
    }

    type SummaryRow = { 금액: number | null; 수량: number | null; 제약수수료_합계: number | null; 담당수수료_합계: number | null };
    const rows = data as unknown as SummaryRow[];

    const 제약수수료_합계 = rows.reduce((sum, s) => sum + (Number(s.제약수수료_합계) || 0), 0);
    const 담당수수료_합계 = rows.reduce((sum, s) => sum + (Number(s.담당수수료_합계) || 0), 0);

    return {
      총_금액: rows.reduce((sum, s) => sum + (Number(s.금액) || 0), 0),
      총_수수료: 제약수수료_합계,
      제약수수료_합계,
      담당수수료_합계,
      데이터_건수: data.length,
      총_수량: rows.reduce((sum, s) => sum + (Number(s.수량) || 0), 0),
    };
  }

  async getStats(): Promise<SettlementStats> {
    const { count: totalCount } = await supabase
      .from('settlements')
      .select('*', { count: 'exact', head: true });

    type StatsRow = { 정산월: string | null; business_number: string };
    const allRows = await fetchAllPaginated<StatsRow>(async (page, pageSize) => {
      const result = await supabase
        .from('settlements')
        .select('정산월, business_number')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      return result as { data: StatsRow[] | null; error: { message: string } | null };
    });

    const monthCounts = new Map<string, number>();
    const businessNumbers = new Set<string>();

    for (const s of allRows) {
      if (s.정산월) {
        monthCounts.set(s.정산월, (monthCounts.get(s.정산월) || 0) + 1);
      }
      businessNumbers.add(s.business_number);
    }

    const settlementMonths = Array.from(monthCounts.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return {
      totalRows: totalCount || allRows.length,
      settlementMonths,
      businessCount: businessNumbers.size,
    };
  }

  async getStatsByMonth(): Promise<SettlementStatsByMonth> {
    const { count: totalCount } = await supabase
      .from('settlements')
      .select('*', { count: 'exact', head: true });

    type MonthRow = {
      정산월: string | null;
      처방월: string | null;
      business_number: string;
      CSO관리업체: string | null;
      수량: number | null;
      금액: number | null;
      제약수수료_합계: number | null;
    };

    const allRows = await fetchAllPaginated<MonthRow>(async (page, pageSize) => {
      const result = await supabase
        .from('settlements')
        .select('정산월, 처방월, business_number, CSO관리업체, 수량, 금액, 제약수수료_합계')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      return result as { data: MonthRow[] | null; error: { message: string } | null };
    });

    const monthData = new Map<string, {
      prescriptionMonth: string;
      count: number;
      csoSet: Set<string>;
      quantity: number;
      amount: number;
      commission: number;
    }>();
    const allBusinesses = new Set<string>();

    for (const s of allRows) {
      if (s.정산월) {
        const existing = monthData.get(s.정산월) || {
          prescriptionMonth: s.처방월 || '',
          count: 0,
          csoSet: new Set<string>(),
          quantity: 0,
          amount: 0,
          commission: 0,
        };
        existing.count++;
        if (s.CSO관리업체) {
          existing.csoSet.add(s.CSO관리업체);
        }
        existing.quantity += Number(s.수량) || 0;
        existing.amount += Number(s.금액) || 0;
        existing.commission += Number(s.제약수수료_합계) || 0;
        if (!existing.prescriptionMonth && s.처방월) {
          existing.prescriptionMonth = s.처방월;
        }
        monthData.set(s.정산월, existing);
      }
      allBusinesses.add(s.business_number);
    }

    const months = Array.from(monthData.entries())
      .map(([month, d]) => ({
        month,
        prescriptionMonth: d.prescriptionMonth,
        count: d.count,
        csoCount: d.csoSet.size,
        totalQuantity: d.quantity,
        totalAmount: d.amount,
        totalCommission: d.commission,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return {
      totalRows: totalCount || allRows.length,
      totalBusinesses: allBusinesses.size,
      months,
    };
  }

  async deleteByMonth(month: string): Promise<number> {
    const { count } = await supabase
      .from('settlements')
      .select('*', { count: 'exact', head: true })
      .eq('정산월', month);

    const { error } = await supabase
      .from('settlements')
      .delete()
      .eq('정산월', month);

    if (error) return 0;
    return count || 0;
  }

  async getMonthlySummaryByBusinessNumber(
    businessNumber: string,
    summaryColumnKeys: string[]
  ): Promise<Map<string, { summaries: Record<string, number>; count: number }>> {
    const selectColumns = ['정산월', ...summaryColumnKeys].join(', ');

    const allRows = await fetchAllPaginated<Record<string, unknown>>(async (page, pageSize) => {
      const result = await supabase
        .from('settlements')
        .select(selectColumns)
        .eq('business_number', businessNumber)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      return result as { data: Record<string, unknown>[] | null; error: { message: string } | null };
    });

    return this.aggregateMonthlyData(allRows, summaryColumnKeys);
  }

  async getMonthlySummaryByCSOMatching(
    matchedNames: string[],
    summaryColumnKeys: string[]
  ): Promise<Map<string, { summaries: Record<string, number>; count: number }>> {
    const selectColumns = ['정산월', ...summaryColumnKeys].join(', ');

    const allRows = await fetchAllPaginated<Record<string, unknown>>(async (page, pageSize) => {
      const result = await supabase
        .from('settlements')
        .select(selectColumns)
        .in('CSO관리업체', matchedNames)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      return result as { data: Record<string, unknown>[] | null; error: { message: string } | null };
    });

    return this.aggregateMonthlyData(allRows, summaryColumnKeys);
  }

  private aggregateMonthlyData(
    allRows: Record<string, unknown>[],
    summaryColumnKeys: string[]
  ): Map<string, { summaries: Record<string, number>; count: number }> {
    const monthlyData = new Map<string, { summaries: Record<string, number>; count: number }>();

    for (const row of allRows) {
      const month = row.정산월 as string;
      if (!month) continue;

      if (!monthlyData.has(month)) {
        monthlyData.set(month, {
          summaries: Object.fromEntries(summaryColumnKeys.map(k => [k, 0])),
          count: 0,
        });
      }

      const data = monthlyData.get(month)!;
      data.count++;

      for (const key of summaryColumnKeys) {
        const value = Number(row[key]) || 0;
        data.summaries[key] += value;
      }
    }

    return monthlyData;
  }
}

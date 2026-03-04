// ============================================
// Supabase Settlement Repository Implementation
// ============================================

import { supabase } from './client';
import type {
  SettlementRepository,
  PaginatedSettlements,
  SettlementTotals,
  SettlementQueryParams,
} from '@/domain/settlement/SettlementRepository';
import type {
  Settlement,
  SettlementSummary,
  SettlementStats,
  SettlementStatsByMonth,
  InsertSettlementsResult,
  SettlementUpload,
} from '@/domain/settlement/types';
import { SUPABASE_PAGE_SIZE, SUPABASE_BATCH_SIZE } from '@/constants/defaults';

/**
 * Supabase 페이지네이션으로 전체 데이터 조회 헬퍼
 */
async function fetchAllPaginated<T>(
  queryBuilder: (page: number, pageSize: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const allRows: T[] = [];
  const pageSize = SUPABASE_PAGE_SIZE;
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
    const batchSize = SUPABASE_BATCH_SIZE;

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
    // RPC: DB에서 DISTINCT 정산월 직접 반환 (전체 행 로드 제거)
    const { data, error } = await supabase.rpc('get_distinct_settlement_months', {
      p_matched_names: null,
    });
    if (error || !data) {
      console.error('getAvailableMonths RPC error:', error);
      return [];
    }
    return (data as { month: string }[]).map(r => r.month).filter(Boolean);
  }

  async getAvailableMonthsByCSOMatching(matchedNames: string[]): Promise<string[]> {
    // RPC: DB에서 DISTINCT 정산월 (CSO 필터) 직접 반환
    const { data, error } = await supabase.rpc('get_distinct_settlement_months', {
      p_matched_names: matchedNames,
    });
    if (error || !data) {
      console.error('getAvailableMonthsByCSOMatching RPC error:', error);
      return [];
    }
    return (data as { month: string }[]).map(r => r.month).filter(Boolean);
  }

  async getBusinessNumbersForMonth(settlementMonth: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('settlements')
      .select('business_number')
      .eq('정산월', settlementMonth);

    if (error || !data) return [];
    return [...new Set(data.map(d => d.business_number))];
  }

  async getCSOCompanyNamesForMonth(settlementMonth: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('settlements')
      .select('CSO관리업체')
      .eq('정산월', settlementMonth);

    if (error || !data) return [];
    return [...new Set(
      (data as unknown as Record<string, unknown>[]).map(d => d.CSO관리업체 as string).filter(Boolean)
    )];
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
    const { data, error } = await supabase.rpc('get_settlement_stats_by_month');

    if (error) {
      console.error('get_settlement_stats_by_month RPC error:', error);
      throw new Error(error.message);
    }

    return data as SettlementStatsByMonth;
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
    return this.getMonthlySummaryViaRPC(businessNumber, null, summaryColumnKeys);
  }

  async getMonthlySummaryByCSOMatching(
    matchedNames: string[],
    summaryColumnKeys: string[]
  ): Promise<Map<string, { summaries: Record<string, number>; count: number }>> {
    return this.getMonthlySummaryViaRPC(null, matchedNames, summaryColumnKeys);
  }

  private async getMonthlySummaryViaRPC(
    businessNumber: string | null,
    matchedNames: string[] | null,
    summaryColumnKeys: string[]
  ): Promise<Map<string, { summaries: Record<string, number>; count: number }>> {
    const { data, error } = await supabase.rpc('get_monthly_summary', {
      p_business_number: businessNumber,
      p_matched_names: matchedNames,
    });

    if (error) {
      console.error('get_monthly_summary RPC error:', error);
      return new Map();
    }

    const rows = (data || []) as Array<Record<string, unknown>>;
    const monthlyData = new Map<string, { summaries: Record<string, number>; count: number }>();

    for (const row of rows) {
      const month = row.settlement_month as string;
      if (!month) continue;

      const summaries: Record<string, number> = {};
      for (const key of summaryColumnKeys) {
        summaries[key] = Number(row[key]) || 0;
      }

      monthlyData.set(month, {
        summaries,
        count: Number(row.row_count) || 0,
      });
    }

    return monthlyData;
  }

  // ============================================
  // DB 레벨 페이지네이션 메서드 (신규)
  // ============================================

  async findAllPaginated(params: SettlementQueryParams): Promise<PaginatedSettlements> {
    return this.paginatedQuery(null, params);
  }

  async findByCSOMatchingPaginated(matchedNames: string[], params: SettlementQueryParams): Promise<PaginatedSettlements> {
    return this.paginatedQuery(matchedNames, params);
  }

  private async paginatedQuery(
    matchedNames: string[] | null,
    params: SettlementQueryParams
  ): Promise<PaginatedSettlements> {
    const { settlementMonth, selectColumns, page, pageSize, search } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 데이터 쿼리
    let query = supabase
      .from('settlements')
      .select(selectColumns || '*', { count: 'exact' });

    if (matchedNames) {
      query = query.in('CSO관리업체', matchedNames);
    }
    if (settlementMonth) {
      query = query.eq('정산월', settlementMonth);
    }
    if (search) {
      query = query.or(`제품명.ilike.%${search}%,거래처명.ilike.%${search}%,영업사원.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('Paginated query error:', error);
      return { data: [], total: 0 };
    }

    return {
      data: (data || []) as unknown as Settlement[],
      total: count || 0,
    };
  }

  async getTotals(settlementMonth?: string): Promise<SettlementTotals> {
    return this.totalsQuery(null, settlementMonth);
  }

  async getTotalsByCSOMatching(matchedNames: string[], settlementMonth?: string): Promise<SettlementTotals> {
    return this.totalsQuery(matchedNames, settlementMonth);
  }

  private async totalsQuery(matchedNames: string[] | null, settlementMonth?: string): Promise<SettlementTotals> {
    // RPC: DB에서 SUM 직접 계산 (전체 행 로드 제거)
    const { data, error } = await supabase.rpc('get_settlement_totals', {
      p_settlement_month: settlementMonth || null,
      p_matched_names: matchedNames || null,
      p_search: null,
    });

    if (error || !data || (data as unknown[]).length === 0) {
      console.error('totalsQuery RPC error:', error);
      return { 수량: 0, 금액: 0, 제약수수료_합계: 0, 담당수수료_합계: 0 };
    }

    const row = (data as Record<string, string | number>[])[0];
    return {
      수량: Number(row['total_수량']) || 0,
      금액: Number(row['total_금액']) || 0,
      제약수수료_합계: Number(row['total_제약수수료_합계']) || 0,
      담당수수료_합계: Number(row['total_담당수수료_합계']) || 0,
    };
  }

  // ============================================
  // 업로드 스냅샷 메서드
  // ============================================

  async upsertUploadSnapshot(data: {
    settlement_month: string;
    row_count: number;
    cso_business_numbers: string[];
    accessed_business_numbers: string[];
  }): Promise<void> {
    const { error } = await supabase
      .from('settlement_uploads')
      .upsert(
        {
          settlement_month: data.settlement_month,
          uploaded_at: new Date().toISOString(),
          row_count: data.row_count,
          cso_business_numbers: data.cso_business_numbers,
          accessed_business_numbers: data.accessed_business_numbers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'settlement_month' }
      );

    if (error) {
      console.error('upsertUploadSnapshot error:', error);
      throw new Error(error.message);
    }
  }

  async getUploadSnapshot(settlementMonth: string): Promise<SettlementUpload | null> {
    const { data, error } = await supabase
      .from('settlement_uploads')
      .select('*')
      .eq('settlement_month', settlementMonth)
      .single();

    if (error || !data) return null;
    return data as unknown as SettlementUpload;
  }

  async getAllUploadSnapshots(): Promise<SettlementUpload[]> {
    const { data, error } = await supabase
      .from('settlement_uploads')
      .select('*')
      .order('settlement_month', { ascending: false });

    if (error || !data) return [];
    return data as unknown as SettlementUpload[];
  }

  async addAccessedBusinessNumber(businessNumber: string): Promise<void> {
    // cso_business_numbers에 해당 bn이 포함된 스냅샷 조회
    const { data: snapshots, error: fetchError } = await supabase
      .from('settlement_uploads')
      .select('settlement_month, cso_business_numbers, accessed_business_numbers');

    if (fetchError || !snapshots) return;

    for (const snapshot of snapshots) {
      const csoBns: string[] = snapshot.cso_business_numbers || [];
      const accessedBns: string[] = snapshot.accessed_business_numbers || [];

      // 해당 월의 CSO 업체이고, 아직 접속 기록이 없는 경우만 업데이트
      if (csoBns.includes(businessNumber) && !accessedBns.includes(businessNumber)) {
        const updatedAccessed = [...accessedBns, businessNumber];

        await supabase
          .from('settlement_uploads')
          .update({ accessed_business_numbers: updatedAccessed })
          .eq('settlement_month', snapshot.settlement_month);
      }
    }
  }

}

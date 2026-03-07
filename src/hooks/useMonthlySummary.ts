import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_ROUTES } from '@/constants/api';

export interface SummaryColumn {
  column_key: string;
  column_name: string;
  display_order: number;
}

export interface MonthlyData {
  settlement_month: string;
  summaries: Record<string, number>;
  row_count: number;
}

interface MonthlySummaryResponse {
  months: MonthlyData[];
  summary_columns: SummaryColumn[];
}

/** 컬럼 정렬 우선순위: 수량 → 금액 → 수수료 → 합계 */
const ORDER_수량 = 1;
const ORDER_금액 = 2;
const ORDER_수수료 = 3;
const ORDER_합계 = 4;
const ORDER_기타 = 5;

function getColumnOrder(name: string): number {
  if (name.includes('수량')) return ORDER_수량;
  if (name.includes('금액')) return ORDER_금액;
  if (name.includes('합계')) return ORDER_합계;
  if (name.includes('수수료')) return ORDER_수수료;
  return ORDER_기타;
}

export function useMonthlySummary() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<MonthlySummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const res = await fetch(API_ROUTES.SETTLEMENTS.MONTHLY_SUMMARY);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatNumber = useCallback((value: number) => {
    return value.toLocaleString('ko-KR');
  }, []);

  /** 전체 월에서 합계가 0인 컬럼 필터링 + 순서 재배치 */
  const visibleColumns = useMemo((): SummaryColumn[] => {
    if (!data?.months || !data?.summary_columns) return [];

    const filtered = data.summary_columns.filter(col =>
      data.months.some(month => (month.summaries[col.column_key] || 0) !== 0),
    );

    return filtered.sort((a, b) => getColumnOrder(a.column_name) - getColumnOrder(b.column_name));
  }, [data]);

  const calculateGrandTotal = useCallback((key: string): number => {
    if (!data?.months) return 0;
    return data.months.reduce((sum, month) => sum + (month.summaries[key] || 0), 0);
  }, [data]);

  const totalRowCount = useMemo(
    () => data?.months?.reduce((sum, m) => sum + m.row_count, 0) || 0,
    [data],
  );

  return {
    loading, refreshing, data, error,
    visibleColumns, totalRowCount,
    formatNumber, calculateGrandTotal, fetchData,
  };
}

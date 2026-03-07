'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';

// ── Types ──

export interface SettlementMonthData {
  month: string;
  prescriptionMonth: string;
  count: number;
  csoCount: number;
  totalQuantity: number;
  totalAmount: number;
  totalCommission: number;
}

export interface TotalStats {
  totalRows: number;
  totalMonths: number;
  totalBusinesses: number;
}

// ── Hook ──

export function useDataManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SettlementMonthData[]>([]);
  const [totalStats, setTotalStats] = useState<TotalStats>({ totalRows: 0, totalMonths: 0, totalBusinesses: 0 });
  const [deleteMonth, setDeleteMonth] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.SETTLEMENTS.STATS);
      const result = await res.json();
      if (result.success) {
        setData(result.data.months);
        setTotalStats({
          totalRows: result.data.totalRows,
          totalMonths: result.data.months.length,
          totalBusinesses: result.data.totalBusinesses,
        });
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = useCallback(async () => {
    if (!deleteMonth) return;
    setDeleting(true);
    try {
      const res = await fetch(API_ROUTES.SETTLEMENTS.byMonth(deleteMonth), { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        toast({
          title: '삭제 완료',
          description: `${deleteMonth} 정산 데이터가 삭제되었습니다. (${result.data.deletedCount.toLocaleString()}건)`,
        });
        setDeleteMonth(null);
        fetchData();
      } else {
        toast({ variant: 'destructive', title: '삭제 실패', description: result.error });
      }
    } catch (error) {
      console.error('데이터 삭제 오류:', error);
      toast({ variant: 'destructive', title: '오류', description: '데이터 삭제 중 오류가 발생했습니다.' });
    } finally {
      setDeleting(false);
    }
  }, [deleteMonth, fetchData, toast]);

  return {
    loading, data, totalStats,
    deleteMonth, setDeleteMonth, deleting,
    fetchData, handleDelete,
  };
}

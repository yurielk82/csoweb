'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Settlement } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/constants/defaults';
import { API_ROUTES } from '@/constants/api';
import type { CSOOption } from '@/hooks/useCsoSearch';

// ── Types ──

export interface SettlementResponse {
  settlements: Settlement[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  totals: {
    수량: number;
    금액: number;
    제약수수료_합계: number;
    담당수수료_합계: number;
  };
}

// ── Hook ──

export function useMasterSettlements(
  selectedMonth: string,
  selectedCSO: CSOOption | null,
) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [data, setData] = useState<SettlementResponse | null>(null);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [queryStarted, setQueryStarted] = useState(false);

  // 정산월 변경 시 리셋
  useEffect(() => {
    if (selectedMonth) { setQueryStarted(false); setData(null); }
  }, [selectedMonth]);

  const fetchSettlements = useCallback(async () => {
    if (!selectedMonth || !queryStarted) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        settlement_month: selectedMonth,
        page: page.toString(),
        page_size: String(DEFAULT_PAGE_SIZE),
      });
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCSO) params.set('business_number', selectedCSO.business_number);

      const res = await fetch(`${API_ROUTES.SETTLEMENTS.LIST}?${params}`);
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (error) {
      console.error('Fetch settlements error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, page, searchQuery, selectedCSO, queryStarted]);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  const startQuery = useCallback(() => { setQueryStarted(true); }, []);
  const resetQuery = useCallback(() => { setQueryStarted(false); setData(null); }, []);

  const handleSearch = useCallback(() => {
    setSearchQuery(search);
    setPage(1);
    if (!queryStarted) setQueryStarted(true);
  }, [search, queryStarted]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSearch();
  }, [handleSearch]);

  return {
    loading, downloading, setDownloading, data,
    search, setSearch, page, setPage, queryStarted,
    fetchSettlements, startQuery, resetQuery,
    handleSearch, handleSearchKeyDown,
  };
}

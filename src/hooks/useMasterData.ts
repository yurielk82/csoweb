'use client';

import { useEffect, useCallback } from 'react';
import { useMasterInit } from '@/hooks/useMasterInit';
import { useCsoSearch, type CSOOption } from '@/hooks/useCsoSearch';
import { useMasterNotice } from '@/hooks/useMasterNotice';
import { useMasterSettlements } from '@/hooks/useMasterSettlements';
import { API_ROUTES } from '@/constants/api';

// Re-export for consumers
export type { CSOOption } from '@/hooks/useCsoSearch';
export type { NoticeSettings } from '@/hooks/useMasterNotice';
export type { SettlementResponse } from '@/hooks/useMasterSettlements';

// 엑셀 다운로드 헬퍼
async function downloadExport(month: string, columns: string[], selectedCSO: CSOOption | null) {
  const params = new URLSearchParams({ settlement_month: month, columns: columns.join(',') });
  if (selectedCSO) params.set('business_number', selectedCSO.business_number);
  const res = await fetch(`${API_ROUTES.SETTLEMENTS.EXPORT}?${params}`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = selectedCSO ? `정산서_${selectedCSO.company_name}_${month}.xlsx` : `정산서_전체_${month}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * 마스터 조회 통합 훅 — 서브훅 4개를 조합
 */
export function useMasterData() {
  const init = useMasterInit();
  const cso = useCsoSearch(init.selectedMonth);
  const notice = useMasterNotice(init.selectedMonth);
  const settlements = useMasterSettlements(init.selectedMonth, cso.selectedCSO);

  useEffect(() => {
    if (init.initNotice) notice.initNotice(init.initNotice);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init.initNotice]);

  const handleCsoSelect = useCallback((opt: CSOOption) => {
    cso.handleCsoSelect(opt); settlements.setPage(1); settlements.startQuery();
  }, [cso, settlements]);

  const handleSelectAll = useCallback(() => {
    cso.clearCsoSelection(); settlements.setPage(1); settlements.startQuery();
  }, [cso, settlements]);

  const clearCsoSelection = useCallback(() => {
    cso.clearCsoSelection(); settlements.setPage(1); settlements.resetQuery();
  }, [cso, settlements]);

  const handleExport = useCallback(async () => {
    settlements.setDownloading(true);
    try { await downloadExport(init.selectedMonth, init.selectedColumns, cso.selectedCSO); }
    catch (error) { console.error('Export error:', error); }
    finally { settlements.setDownloading(false); }
  }, [init.selectedMonth, init.selectedColumns, cso.selectedCSO, settlements]);

  return {
    // init
    initLoading: init.initLoading,
    columns: init.columns,
    yearMonths: init.yearMonths,
    selectedMonth: init.selectedMonth,
    setSelectedMonth: init.setSelectedMonth,
    selectedColumns: init.selectedColumns,
    toggleColumn: init.toggleColumn,
    // CSO
    ...cso,
    // Notice
    ...notice,
    // Settlements
    loading: settlements.loading,
    downloading: settlements.downloading,
    data: settlements.data,
    search: settlements.search,
    setSearch: settlements.setSearch,
    page: settlements.page,
    setPage: settlements.setPage,
    queryStarted: settlements.queryStarted,
    fetchSettlements: settlements.fetchSettlements,
    handleSearch: settlements.handleSearch,
    handleSearchKeyDown: settlements.handleSearchKeyDown,
    // Combined
    handleCsoSelect,
    handleSelectAll,
    clearCsoSelection,
    handleExport,
  };
}

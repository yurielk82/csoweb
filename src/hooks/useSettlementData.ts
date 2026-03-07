'use client';

import { useState } from 'react';
import type { Settlement, ColumnSetting } from '@/types';
import { DEFAULT_PAGE_SIZE, CSO_FULL_PAGE_SIZE } from '@/constants/defaults';
import { useToast } from '@/hooks/use-toast';
import { replaceNoticeVariables, downloadExcel, triggerBlobDownload } from './settlement/helpers';
import { useSettlementInit } from './settlement/useSettlementInit';
import { useSettlementFetch } from './settlement/useSettlementFetch';

export interface SettlementResponse {
  settlements: Settlement[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  totals: { 수량: number; 금액: number; 제약수수료_합계: number; 담당수수료_합계: number; 거래처수: number; 제품수: number };
}

export interface NoticeSettings { notice_content: string; ceo_name: string }
export type ErrorType = 'network' | 'auth' | 'no_data' | 'no_matching' | null;

function computeDisplayColumns(columns: ColumnSetting[], selectedColumns: string[]) {
  const display = columns
    .filter(c => selectedColumns.includes(c.column_key))
    .sort((a, b) => a.display_order - b.display_order);
  const ci = display.findIndex(c => c.column_key === '거래처명');
  const cso = display.findIndex(c => c.column_key === 'CSO관리업체');
  const label = ci >= 0 ? ci : (cso >= 0 ? cso : 0);
  return { displayColumns: display, labelColumnIndex: label };
}

export function useSettlementData(isAdmin: boolean) {
  const { toast } = useToast();
  const pageSize = isAdmin ? DEFAULT_PAGE_SIZE : CSO_FULL_PAGE_SIZE;
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [dataLoading, setDataLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const init = useSettlementInit(pageSize);
  const { fetchSettlements } = useSettlementFetch({
    selectedMonth: init.selectedMonth, page, searchQuery, pageSize,
    errorType: init.errorType, initialLoading: init.initialLoading,
    initDataLoaded: init.initDataLoaded, setInitDataLoaded: init.setInitDataLoaded,
    setData: init.setData, setDataLoading, setError: init.setError, setErrorType: init.setErrorType,
  });

  const handleSearch = () => { setSearchQuery(searchInput); setPage(1); };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSearch();
  };
  const toggleColumn = (columnKey: string) => {
    const column = init.columns.find(c => c.column_key === columnKey);
    if (column?.is_required) return;
    init.setSelectedColumns(prev =>
      prev.includes(columnKey) ? prev.filter(k => k !== columnKey) : [...prev, columnKey]
    );
  };
  const handleExport = async () => {
    setDownloading(true);
    try {
      const result = await downloadExcel(init.selectedMonth, init.selectedColumns);
      if (!result.ok) {
        toast({ variant: 'destructive', title: result.status === 429 ? '다운로드 제한' : '다운로드 오류', description: result.error! });
        return;
      }
      triggerBlobDownload(result.blob!, `정산서_${init.selectedMonth}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      toast({ variant: 'destructive', title: '다운로드 오류', description: '네트워크 오류가 발생했습니다. 다시 시도해주세요.' });
    } finally {
      setDownloading(false);
    }
  };
  const replaceNoticeVars = (text: string) =>
    replaceNoticeVariables(text, init.selectedMonth, init.noticeSettings?.ceo_name || '대표자');

  const { displayColumns, labelColumnIndex } = computeDisplayColumns(init.columns, init.selectedColumns);

  return {
    initialLoading: init.initialLoading, dataLoading, downloading,
    data: init.data, columns: init.columns, yearMonths: init.yearMonths,
    selectedMonth: init.selectedMonth, selectedColumns: init.selectedColumns,
    searchInput, searchQuery, page, noticeSettings: init.noticeSettings,
    error: init.error, errorType: init.errorType, displayColumns, labelColumnIndex,
    setSelectedMonth: init.setSelectedMonth, setSearchInput, setPage,
    fetchSettlements, handleSearch, handleKeyDown, toggleColumn, handleExport, replaceNoticeVars,
  };
}

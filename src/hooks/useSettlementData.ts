'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ColumnSetting } from '@/types';
import { DEFAULT_PAGE_SIZE, CSO_FULL_PAGE_SIZE } from '@/constants/defaults';
import { API_ROUTES } from '@/constants/api';
import { fetchWithTimeout } from '@/lib/fetch';
import { useToast } from '@/hooks/use-toast';
import {
  processInitResult,
  replaceNoticeVariables,
  downloadExcel,
  triggerBlobDownload,
} from './settlement/helpers';
import type { InitResult } from './settlement/helpers';

// ── Types (re-export for consumers) ──

export interface SettlementResponse {
  settlements: import('@/types').Settlement[];
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
    거래처수: number;
    제품수: number;
  };
}

export interface NoticeSettings {
  notice_content: string;
  ceo_name: string;
}

export type ErrorType = 'network' | 'auth' | 'no_data' | 'no_matching' | null;

// ── Hook ──

export function useSettlementData(isAdmin: boolean) {
  const { toast } = useToast();
  const pageSize = isAdmin ? DEFAULT_PAGE_SIZE : CSO_FULL_PAGE_SIZE;
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [data, setData] = useState<SettlementResponse | null>(null);
  const [columns, setColumns] = useState<ColumnSetting[]>([]);
  const [yearMonths, setYearMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [noticeSettings, setNoticeSettings] = useState<NoticeSettings | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [initDataLoaded, setInitDataLoaded] = useState(false);

  // ── 초기화 결과 적용 ──
  function applyInitResult(processed: InitResult) {
    setColumns(processed.columns);
    setSelectedColumns(processed.selectedColumns);
    setYearMonths(processed.yearMonths);
    if (processed.selectedMonth) setSelectedMonth(processed.selectedMonth);
    if (processed.errorType) setErrorType(processed.errorType);
    if (processed.notice) setNoticeSettings(processed.notice);
    if (processed.data) {
      setData(processed.data);
      setInitDataLoaded(true);
    }
  }

  // ── 초기화 ──
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetchWithTimeout(`${API_ROUTES.DASHBOARD.INIT}?page=1&page_size=${pageSize}`);

        if (res.status === 401) {
          setError('로그인이 필요합니다. 다시 로그인해주세요.');
          setErrorType('auth');
          return;
        }
        if (!res.ok) {
          setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
          setErrorType('network');
          return;
        }

        const result = await res.json();
        if (!result.success) {
          setError(result.error || '초기화 중 오류가 발생했습니다.');
          setErrorType('no_data');
          return;
        }

        applyInitResult(processInitResult(result));
      } catch (err) {
        console.error('Init error:', err);
        setError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
        setErrorType('network');
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, []);

  // ── 이후 페이지/월/검색 변경 시 settlements API 호출 ──
  const fetchSettlements = useCallback(async () => {
    if (!selectedMonth) return;

    setDataLoading(true);
    if (errorType !== 'no_matching' && errorType !== 'auth') setError(null);

    try {
      const params = new URLSearchParams({
        settlement_month: selectedMonth,
        page: page.toString(),
        page_size: String(pageSize),
      });
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetchWithTimeout(`${API_ROUTES.SETTLEMENTS.LIST}?${params}`);

      if (res.status === 401) {
        setError('세션이 만료되었습니다. 다시 로그인해주세요.');
        setErrorType('auth');
        setDataLoading(false);
        return;
      }
      if (!res.ok) {
        setError('정산 데이터를 불러오는 중 서버 오류가 발생했습니다.');
        setErrorType('network');
        setDataLoading(false);
        return;
      }

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        if (errorType !== 'no_matching') { setError(null); setErrorType(null); }
      } else {
        setError(result.error || '정산 데이터를 불러오는 중 오류가 발생했습니다.');
        setErrorType('no_data');
      }
    } catch (err) {
      console.error('Fetch settlements error:', err);
      setError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
      setErrorType('network');
    } finally {
      setDataLoading(false);
    }
  }, [selectedMonth, page, searchQuery, errorType]);

  useEffect(() => {
    if (initDataLoaded) {
      setInitDataLoaded(false);
      return;
    }
    if (!initialLoading) fetchSettlements();
  }, [fetchSettlements, initialLoading, initDataLoaded]);

  // ── Handlers ──
  const handleSearch = () => { setSearchQuery(searchInput); setPage(1); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSearch();
  };

  const toggleColumn = (columnKey: string) => {
    const column = columns.find(c => c.column_key === columnKey);
    if (column?.is_required) return;
    setSelectedColumns(prev =>
      prev.includes(columnKey) ? prev.filter(k => k !== columnKey) : [...prev, columnKey]
    );
  };

  const handleExport = async () => {
    setDownloading(true);
    try {
      const result = await downloadExcel(selectedMonth, selectedColumns);
      if (!result.ok) {
        toast({
          variant: 'destructive',
          title: result.status === 429 ? '다운로드 제한' : '다운로드 오류',
          description: result.error!,
        });
        return;
      }
      triggerBlobDownload(result.blob!, `정산서_${selectedMonth}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      toast({ variant: 'destructive', title: '다운로드 오류', description: '네트워크 오류가 발생했습니다. 다시 시도해주세요.' });
    } finally {
      setDownloading(false);
    }
  };

  const replaceNoticeVars = (text: string) =>
    replaceNoticeVariables(text, selectedMonth, noticeSettings?.ceo_name || '대표자');

  // ── Computed ──
  const displayColumns = columns
    .filter(c => selectedColumns.includes(c.column_key))
    .sort((a, b) => a.display_order - b.display_order);

  const customerColumnIndex = displayColumns.findIndex(c => c.column_key === '거래처명');
  const csoColumnIndex = displayColumns.findIndex(c => c.column_key === 'CSO관리업체');
  const labelColumnIndex = customerColumnIndex >= 0 ? customerColumnIndex : (csoColumnIndex >= 0 ? csoColumnIndex : 0);

  return {
    initialLoading, dataLoading, downloading,
    data, columns, yearMonths, selectedMonth, selectedColumns,
    searchInput, searchQuery, page, noticeSettings,
    error, errorType,
    displayColumns, labelColumnIndex,
    setSelectedMonth, setSearchInput, setPage,
    fetchSettlements, handleSearch, handleKeyDown, toggleColumn, handleExport, replaceNoticeVars,
  };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Settlement, ColumnSetting } from '@/types';

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

export interface NoticeSettings {
  notice_content: string;
  ceo_name: string;
}

export type ErrorType = 'network' | 'auth' | 'no_data' | 'no_matching' | null;

export function useSettlementData() {
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

  // 초기화: 3개 API 병렬 호출 (직렬 → Promise.all)
  useEffect(() => {
    const init = async () => {
      try {
        const [columnsRes, yearMonthsRes, noticeRes] = await Promise.all([
          fetch('/api/columns').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/settlements/year-months').then(r => {
            if (r.status === 401) return { success: false, _authError: true };
            if (!r.ok) return { success: false, _networkError: true };
            return r.json();
          }).catch(() => ({ success: false, _networkError: true })),
          fetch('/api/settings/company', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ success: false })),
        ]);

        // 컬럼 설정
        if (columnsRes.success) {
          const visibleColumns = columnsRes.data.filter((c: ColumnSetting) => c.is_visible);
          setColumns(visibleColumns);
          const requiredKeys = visibleColumns
            .filter((c: ColumnSetting) => c.is_required)
            .map((c: ColumnSetting) => c.column_key);
          setSelectedColumns(requiredKeys.length > 0 ? requiredKeys : visibleColumns.map((c: ColumnSetting) => c.column_key));
        }

        // 정산월 목록
        if (yearMonthsRes._authError) {
          setError('로그인이 필요합니다. 다시 로그인해주세요.');
          setErrorType('auth');
        } else if (yearMonthsRes._networkError) {
          setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
          setErrorType('network');
        } else if (yearMonthsRes.success) {
          const months = yearMonthsRes.data || [];
          setYearMonths(months);
          if (months.length > 0) {
            setSelectedMonth(months[0]);
          } else {
            setErrorType('no_matching');
          }
        } else {
          setError(yearMonthsRes.error || '정산월 목록을 불러올 수 없습니다.');
          setErrorType('no_data');
        }

        // Notice
        if (noticeRes.success && noticeRes.data) {
          setNoticeSettings(noticeRes.data);
        }
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

  // Fetch settlements — 검색/페이지네이션은 서버에서 처리
  const fetchSettlements = useCallback(async () => {
    if (!selectedMonth) return;

    setDataLoading(true);
    if (errorType !== 'no_matching' && errorType !== 'auth') {
      setError(null);
    }

    try {
      const params = new URLSearchParams({
        settlement_month: selectedMonth,
        page: page.toString(),
        page_size: '50',
      });
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/settlements?${params}`);

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
        if (errorType !== 'no_matching') {
          setError(null);
          setErrorType(null);
        }
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
    fetchSettlements();
  }, [fetchSettlements]);

  // Handlers
  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      handleSearch();
    }
  };

  const toggleColumn = (columnKey: string) => {
    const column = columns.find(c => c.column_key === columnKey);
    if (column?.is_required) return;
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleExport = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        settlement_month: selectedMonth,
        columns: selectedColumns.join(','),
      });
      const res = await fetch(`/api/settlements/export?${params}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `정산서_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const replaceNoticeVars = (text: string) => {
    if (!selectedMonth) return text;
    const [, monthStr] = selectedMonth.split('-');
    const month = Number(monthStr);
    const settlementMonth = `${month}월`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthStr = `${nextMonth}월`;
    const ceoName = noticeSettings?.ceo_name || '대표자';

    return text
      .replace(/{{정산월}}/g, settlementMonth)
      .replace(/{{정산월\+1}}/g, nextMonthStr)
      .replace(/{{대표자명}}/g, ceoName);
  };

  // Computed
  const displayColumns = columns
    .filter(c => selectedColumns.includes(c.column_key))
    .sort((a, b) => a.display_order - b.display_order);

  const customerColumnIndex = displayColumns.findIndex(c => c.column_key === '거래처명');
  const csoColumnIndex = displayColumns.findIndex(c => c.column_key === 'CSO관리업체');
  const labelColumnIndex = customerColumnIndex >= 0 ? customerColumnIndex : (csoColumnIndex >= 0 ? csoColumnIndex : 0);

  return {
    // State
    initialLoading, dataLoading, downloading,
    data, columns, yearMonths, selectedMonth, selectedColumns,
    searchInput, searchQuery, page, noticeSettings,
    error, errorType,
    // Computed
    displayColumns, labelColumnIndex,
    // Setters
    setSelectedMonth, setSearchInput, setPage,
    // Handlers
    fetchSettlements, handleSearch, handleKeyDown, toggleColumn, handleExport, replaceNoticeVars,
  };
}

'use client';

import { useState, useEffect } from 'react';
import type { ColumnSetting } from '@/types';
import { API_ROUTES } from '@/constants/api';
import { fetchWithTimeout } from '@/lib/fetch';
import type { SettlementResponse, NoticeSettings, ErrorType } from '../useSettlementData';
import { processInitResult } from './helpers';

export function useSettlementInit(pageSize: number) {
  const [initialLoading, setInitialLoading] = useState(true);

  const [data, setData] = useState<SettlementResponse | null>(null);
  const [columns, setColumns] = useState<ColumnSetting[]>([]);
  const [yearMonths, setYearMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [noticeSettings, setNoticeSettings] = useState<NoticeSettings | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [initDataLoaded, setInitDataLoaded] = useState(false);

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

        const processed = processInitResult(result);
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
      } catch (err) {
        console.error('Init error:', err);
        setError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
        setErrorType('network');
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, [pageSize]);

  return {
    initialLoading, initDataLoaded, setInitDataLoaded,
    data, setData, columns, yearMonths,
    selectedMonth, setSelectedMonth,
    selectedColumns, setSelectedColumns,
    noticeSettings,
    error, setError, errorType, setErrorType,
  };
}

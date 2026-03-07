'use client';

import { useEffect, useCallback } from 'react';
import { API_ROUTES } from '@/constants/api';
import { fetchWithTimeout } from '@/lib/fetch';
import type { SettlementResponse, ErrorType } from '../useSettlementData';

interface FetchDeps {
  selectedMonth: string;
  page: number;
  searchQuery: string;
  pageSize: number;
  errorType: ErrorType;
  initialLoading: boolean;
  initDataLoaded: boolean;
  setInitDataLoaded: (v: boolean) => void;
  setData: (data: SettlementResponse) => void;
  setDataLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setErrorType: (v: ErrorType) => void;
}

export function useSettlementFetch(deps: FetchDeps) {
  const {
    selectedMonth, page, searchQuery, pageSize,
    errorType, initialLoading, initDataLoaded,
    setInitDataLoaded, setData, setDataLoading,
    setError, setErrorType,
  } = deps;

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
  }, [selectedMonth, page, searchQuery, errorType, pageSize, setDataLoading, setError, setErrorType, setData]);

  useEffect(() => {
    if (initDataLoaded) {
      setInitDataLoaded(false);
      return;
    }
    if (!initialLoading) fetchSettlements();
  }, [fetchSettlements, initialLoading, initDataLoaded, setInitDataLoaded]);

  return { fetchSettlements };
}

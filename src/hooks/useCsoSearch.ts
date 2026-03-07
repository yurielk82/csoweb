'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_ROUTES } from '@/constants/api';

export interface CSOOption {
  business_number: string;
  company_name: string;
}

/**
 * CSO 거래처 검색/선택 훅 — 드롭다운 자동완성 포함
 */
export function useCsoSearch(selectedMonth: string) {
  const [csoList, setCsoList] = useState<CSOOption[]>([]);
  const [csoSearch, setCsoSearch] = useState('');
  const [selectedCSO, setSelectedCSO] = useState<CSOOption | null>(null);
  const [showCsoDropdown, setShowCsoDropdown] = useState(false);
  const [csoLoading, setCsoLoading] = useState(false);
  const csoInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCsoList = csoSearch
    ? csoList.filter(cso =>
        cso.company_name.toLowerCase().includes(csoSearch.toLowerCase()) ||
        cso.business_number.includes(csoSearch)
      )
    : csoList;

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        csoInputRef.current && !csoInputRef.current.contains(e.target as Node)
      ) {
        setShowCsoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 정산월별 CSO 목록 조회
  const fetchCsoList = useCallback(async (month: string) => {
    if (!month) return;
    setCsoLoading(true);
    try {
      const res = await fetch(API_ROUTES.SETTLEMENTS.csoCompanies(month));
      const result = await res.json();
      if (result.success) setCsoList(result.data);
    } finally {
      setCsoLoading(false);
    }
  }, []);

  // 정산월 변경 시 리셋
  useEffect(() => {
    if (selectedMonth) {
      fetchCsoList(selectedMonth);
      setSelectedCSO(null);
      setCsoSearch('');
    }
  }, [selectedMonth, fetchCsoList]);

  const handleCsoSelect = useCallback((cso: CSOOption) => {
    setSelectedCSO(cso);
    setCsoSearch(cso.company_name);
    setShowCsoDropdown(false);
  }, []);

  const clearCsoSelection = useCallback(() => {
    setSelectedCSO(null);
    setCsoSearch('');
  }, []);

  return {
    csoList, csoSearch, setCsoSearch, selectedCSO,
    showCsoDropdown, setShowCsoDropdown, csoLoading,
    csoInputRef, dropdownRef, filteredCsoList,
    handleCsoSelect, clearCsoSelection,
  };
}

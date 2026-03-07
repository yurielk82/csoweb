'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';
import type { IntegrityRow, FilterStatus } from '@/components/admin/settlement-integrity/types';
import { applyFilters, computeStats } from './integrity/helpers';
import { useIntegrityCSOActions } from './integrity/useIntegrityCSOActions';
import { useIntegrityUpload } from './integrity/useIntegrityUpload';
import { useIntegrityRowActions } from './integrity/useIntegrityRowActions';
import { useIntegrityExport } from './integrity/useIntegrityExport';

// ── Hook ──

export function useIntegrityData() {
  const { toast } = useToast();

  // ── Core state ──
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<IntegrityRow[]>([]);
  const [csoMapping, setCsoMapping] = useState<Record<string, string>>({});

  // ── Filter state ──
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'settlement'>('settlement');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('settlement');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // ── Data Fetching ──
  const fetchIntegrityData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.ADMIN.CSO_MATCHING.INTEGRITY);
      const result = await res.json();

      if (result.success) {
        setTableData(result.data.results);
        setCsoMapping(result.data.csoMapping || {});
        const months = [...new Set(
          result.data.results
            .map((r: IntegrityRow) => r.last_settlement_month)
            .filter(Boolean)
        )].sort().reverse() as string[];
        setAvailableMonths(months);
      } else {
        toast({ variant: 'destructive', title: '데이터 로드 실패', description: result.error });
      }
    } catch (error) {
      console.error('Fetch integrity data error:', error);
      toast({ variant: 'destructive', title: '오류', description: '거래처 매핑 데이터를 불러오는 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchIntegrityData(); }, [fetchIntegrityData]);

  // ── Computed ──
  const filteredData = useMemo(
    () => applyFilters(tableData, searchQuery, filterStatus, scope, selectedMonth),
    [tableData, searchQuery, filterStatus, scope, selectedMonth],
  );

  const stats = useMemo(
    () => computeStats(tableData, selectedMonth, scope),
    [tableData, selectedMonth, scope],
  );

  const unmappedRegisteredUsers = useMemo(
    () => tableData
      .filter(r => r.registration_status === 'registered' && r.cso_company_names.length === 0)
      .sort((a, b) => (a.business_name ?? '').localeCompare(b.business_name ?? '')),
    [tableData],
  );

  // ── Sub-hooks ──
  const csoActions = useIntegrityCSOActions({ tableData, csoMapping, setTableData, setCsoMapping, toast });
  const upload = useIntegrityUpload(toast, fetchIntegrityData);
  const rowActions = useIntegrityRowActions(toast, fetchIntegrityData);
  const { handleExportIssues } = useIntegrityExport(toast, filteredData);

  // ── Search handlers ──
  const handleSearch = () => setSearchQuery(searchInput);
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };
  const clearSearch = () => { setSearchInput(''); setSearchQuery(''); };

  return {
    loading,
    filteredData, stats, csoMapping, unmappedRegisteredUsers, availableMonths,
    searchInput, setSearchInput, searchQuery, scope, setScope,
    filterStatus, setFilterStatus, selectedMonth, setSelectedMonth,
    handleSearch, handleSearchKeyDown, clearSearch,
    ...csoActions,
    fetchIntegrityData,
    ...rowActions,
    handleExportIssues,
    ...upload,
  };
}

'use client';

import { useState, useEffect } from 'react';
import type { ColumnSetting } from '@/types';
import { API_ROUTES } from '@/constants/api';
import type { NoticeSettings } from '@/hooks/useMasterNotice';

export interface MasterInitResult {
  columns: ColumnSetting[];
  selectedColumns: string[];
  yearMonths: string[];
  initialMonth: string;
  notice: NoticeSettings | null;
}

/**
 * 마스터 조회 초기화 훅 — init API 1회 호출
 */
export function useMasterInit() {
  const [initLoading, setInitLoading] = useState(true);
  const [columns, setColumns] = useState<ColumnSetting[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [yearMonths, setYearMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [initNotice, setInitNotice] = useState<NoticeSettings | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`${API_ROUTES.DASHBOARD.INIT}?include_settlements=false`);
        const initRes = await res.json();
        if (!initRes.success) return;

        const d = initRes.data;
        if (d.columns) {
          const visible = d.columns as ColumnSetting[];
          setColumns(visible);
          const required = visible.filter(c => c.is_required).map(c => c.column_key);
          setSelectedColumns(required.length > 0 ? required : visible.map(c => c.column_key));
        }
        const months = d.yearMonths || [];
        setYearMonths(months);
        if (months.length > 0) setSelectedMonth(months[0]);
        if (d.notice) setInitNotice(d.notice);
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, []);

  const toggleColumn = (key: string) => {
    const col = columns.find(c => c.column_key === key);
    if (col?.is_required) return;
    setSelectedColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return {
    initLoading, columns, selectedColumns, yearMonths,
    selectedMonth, setSelectedMonth, initNotice, toggleColumn,
  };
}

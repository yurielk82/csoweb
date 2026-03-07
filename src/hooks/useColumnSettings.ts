'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';
import type { ColumnSetting } from '@/types';
import { NUMERIC_COLUMN_KEYS } from '@/types';

// ── 순수 헬퍼 ──

function updateColumn(columns: ColumnSetting[], key: string, updater: (col: ColumnSetting) => ColumnSetting) {
  return columns.map(col => col.column_key === key ? updater(col) : col);
}

async function fetchColumnsApi(): Promise<ColumnSetting[]> {
  const response = await fetch(API_ROUTES.COLUMNS);
  const result = await response.json();
  return result.success ? result.data : [];
}

async function saveColumnsApi(columns: ColumnSetting[]) {
  const response = await fetch(API_ROUTES.COLUMNS, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columns }),
  });
  return response.json();
}

async function resetColumnsApi() {
  const response = await fetch(API_ROUTES.COLUMNS, { method: 'DELETE' });
  return response.json();
}

// ── Hook ──

export function useColumnSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [columns, setColumns] = useState<ColumnSetting[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchColumns = useCallback(async () => {
    setLoading(true);
    try { setColumns(await fetchColumnsApi()); }
    catch (error) { console.error('Fetch columns error:', error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchColumns(); }, [fetchColumns]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColumns(items => {
      const oldIdx = items.findIndex(i => i.column_key === active.id);
      const newIdx = items.findIndex(i => i.column_key === over.id);
      return arrayMove(items, oldIdx, newIdx).map((item, i) => ({ ...item, display_order: i + 1 }));
    });
    setHasChanges(true);
  }, []);

  const toggle = useCallback((key: string, field: 'is_visible' | 'is_required' | 'is_summary') => {
    if (field === 'is_summary' && !NUMERIC_COLUMN_KEYS.includes(key)) return;
    setColumns(prev => updateColumn(prev, key, col => {
      if (field === 'is_visible') return { ...col, is_visible: !col.is_visible, is_required: !col.is_visible ? col.is_required : false };
      if (field === 'is_required' && !col.is_visible) return col;
      return { ...col, [field]: !col[field] };
    }));
    setHasChanges(true);
  }, []);

  const toggleVisible = useCallback((key: string) => toggle(key, 'is_visible'), [toggle]);
  const toggleRequired = useCallback((key: string) => toggle(key, 'is_required'), [toggle]);
  const toggleSummary = useCallback((key: string) => toggle(key, 'is_summary'), [toggle]);

  const changeName = useCallback((key: string, name: string) => {
    setColumns(prev => updateColumn(prev, key, col => ({ ...col, column_name: name })));
    setHasChanges(true);
  }, []);

  const showAll = useCallback(() => { setColumns(prev => prev.map(col => ({ ...col, is_visible: true }))); setHasChanges(true); }, []);
  const hideAll = useCallback(() => { setColumns(prev => prev.map(col => ({ ...col, is_visible: false, is_required: false }))); setHasChanges(true); }, []);

  const resetDefaults = useCallback(async () => {
    try {
      const result = await resetColumnsApi();
      if (result.success) { await fetchColumns(); setHasChanges(false); toast({ title: '초기화 완료', description: '컬럼 설정이 기본값으로 초기화되었습니다.' }); }
    } catch { toast({ variant: 'destructive', title: '오류', description: '초기화 중 오류가 발생했습니다.' }); }
  }, [fetchColumns, toast]);

  const saveChanges = useCallback(async () => {
    setSaving(true);
    try {
      const result = await saveColumnsApi(columns);
      if (result.success) { setHasChanges(false); toast({ title: '저장 완료', description: '컬럼 설정이 저장되었습니다.' }); }
      else throw new Error(result.error);
    } catch { toast({ variant: 'destructive', title: '저장 실패', description: '컬럼 설정 저장 중 오류가 발생했습니다.' }); }
    finally { setSaving(false); }
  }, [columns, toast]);

  return {
    loading, saving, columns, hasChanges, sensors,
    visibleCount: columns.filter(c => c.is_visible).length,
    requiredCount: columns.filter(c => c.is_required).length,
    summaryCount: columns.filter(c => c.is_summary).length,
    handleDragEnd, toggleVisible, toggleRequired, toggleSummary,
    changeName, showAll, hideAll, resetDefaults, saveChanges,
  };
}

'use client';

import { useCallback } from 'react';
import { formatBusinessNumber } from '@/components/admin/settlement-integrity/CSOTagComponents';
import type { IntegrityRow, ToastFn, SetTableData, SetCsoMapping } from './types';
import { setRowSaveState, resetRowSaveState, upsertCSOMatching, deleteCSOMatching } from './helpers';

interface CSOActionsDeps {
  tableData: IntegrityRow[];
  csoMapping: Record<string, string>;
  setTableData: SetTableData;
  setCsoMapping: SetCsoMapping;
  toast: ToastFn;
}

// ── 중복 검증 ──

function validateDuplicate(
  row: IntegrityRow,
  csoName: string,
  csoMapping: Record<string, string>,
  toast: ToastFn,
): boolean {
  const existingBizNum = csoMapping[csoName];
  if (existingBizNum && existingBizNum !== row.business_number) {
    toast({ variant: 'destructive', title: '중복 매핑', description: `"${csoName}"은(는) 이미 다른 사업자(${formatBusinessNumber(existingBizNum)})에 매핑되어 있습니다.` });
    return false;
  }
  return true;
}

// ── CSO 태그 추가 ──

async function addCSOTag(
  deps: CSOActionsDeps,
  rowId: string,
  csoName: string,
) {
  const { tableData, csoMapping, setTableData, setCsoMapping, toast } = deps;
  const row = tableData.find(r => r.id === rowId);
  if (!row) return;

  if (row.cso_company_names.includes(csoName)) {
    toast({ variant: 'destructive', title: '중복 업체명', description: `"${csoName}"은(는) 이미 추가되어 있습니다.` });
    return;
  }
  if (!validateDuplicate(row, csoName, csoMapping, toast)) return;

  setTableData(prev => prev.map(r =>
    r.id === rowId ? { ...r, cso_company_names: [...r.cso_company_names, csoName], saveState: 'saving' } : r
  ));

  try {
    const result = await upsertCSOMatching(csoName, row.business_number);
    if (!result.success) throw new Error(result.error);
    setRowSaveState(setTableData, rowId, 'saved');
    setCsoMapping(prev => ({ ...prev, [csoName]: row.business_number }));
    resetRowSaveState(setTableData, rowId);
    toast({ title: '저장 완료', description: `"${csoName}" 태그가 추가되었습니다.` });
  } catch (error) {
    setTableData(prev => prev.map(r =>
      r.id === rowId ? { ...r, cso_company_names: r.cso_company_names.filter(c => c !== csoName), saveState: 'error' } : r
    ));
    toast({ variant: 'destructive', title: '저장 실패', description: error instanceof Error ? error.message : '오류가 발생했습니다.' });
  }
}

// ── CSO 태그 수정 ──

async function editCSOTag(
  deps: CSOActionsDeps,
  rowId: string,
  oldName: string,
  newName: string,
) {
  const { tableData, csoMapping, setTableData, setCsoMapping, toast } = deps;
  const row = tableData.find(r => r.id === rowId);
  if (!row) return;
  if (!validateDuplicate(row, newName, csoMapping, toast)) return;

  setTableData(prev => prev.map(r =>
    r.id === rowId ? { ...r, cso_company_names: r.cso_company_names.map(c => c === oldName ? newName : c), saveState: 'saving' } : r
  ));

  try {
    await deleteCSOMatching(oldName);
    const result = await upsertCSOMatching(newName, row.business_number);
    if (!result.success) throw new Error(result.error);
    setRowSaveState(setTableData, rowId, 'saved');
    setCsoMapping(prev => {
      const m = { ...prev };
      delete m[oldName];
      m[newName] = row.business_number;
      return m;
    });
    resetRowSaveState(setTableData, rowId);
    toast({ title: '수정 완료', description: `"${oldName}" → "${newName}"` });
  } catch (error) {
    setTableData(prev => prev.map(r =>
      r.id === rowId ? { ...r, cso_company_names: r.cso_company_names.map(c => c === newName ? oldName : c), saveState: 'error' } : r
    ));
    toast({ variant: 'destructive', title: '수정 실패', description: error instanceof Error ? error.message : '오류가 발생했습니다.' });
  }
}

// ── CSO 태그 삭제 ──

async function removeCSOTag(
  deps: CSOActionsDeps,
  rowId: string,
  csoName: string,
) {
  const { tableData, setTableData, setCsoMapping, toast } = deps;
  const row = tableData.find(r => r.id === rowId);
  if (!row) return;

  setTableData(prev => prev.map(r =>
    r.id === rowId ? { ...r, cso_company_names: r.cso_company_names.filter(c => c !== csoName), saveState: 'saving' } : r
  ));

  try {
    const res = await deleteCSOMatching(csoName);
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    setRowSaveState(setTableData, rowId, 'saved');
    setCsoMapping(prev => {
      const m = { ...prev };
      delete m[csoName];
      return m;
    });
    resetRowSaveState(setTableData, rowId);
    toast({ title: '삭제 완료', description: `"${csoName}" 태그가 삭제되었습니다.` });
  } catch (error) {
    setTableData(prev => prev.map(r =>
      r.id === rowId ? { ...r, cso_company_names: [...r.cso_company_names, csoName], saveState: 'error' } : r
    ));
    toast({ variant: 'destructive', title: '삭제 실패', description: error instanceof Error ? error.message : '오류가 발생했습니다.' });
  }
}

// ── Hook ──

export function useIntegrityCSOActions(deps: CSOActionsDeps) {
  const handleAddCSOTag = useCallback(
    (rowId: string, csoName: string) => addCSOTag(deps, rowId, csoName),
    [deps],
  );
  const handleEditCSOTag = useCallback(
    (rowId: string, oldName: string, newName: string) => editCSOTag(deps, rowId, oldName, newName),
    [deps],
  );
  const handleDeleteCSOTag = useCallback(
    (rowId: string, csoName: string) => removeCSOTag(deps, rowId, csoName),
    [deps],
  );

  return { handleAddCSOTag, handleEditCSOTag, handleDeleteCSOTag };
}

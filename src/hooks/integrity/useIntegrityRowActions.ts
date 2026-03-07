'use client';

import { useState } from 'react';
import { formatBusinessNumber } from '@/components/admin/settlement-integrity/CSOTagComponents';
import type { IntegrityRow, ToastFn } from './types';
import { upsertCSOMatching, deleteCSOMatching } from './helpers';

export function useIntegrityRowActions(toast: ToastFn, fetchIntegrityData: () => Promise<void>) {
  // 행 삭제 다이얼로그
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IntegrityRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 행 추가 다이얼로그
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUnmappedBizNum, setSelectedUnmappedBizNum] = useState('');
  const [newCsoName, setNewCsoName] = useState('');
  const [addingRow, setAddingRow] = useState(false);

  const handleDeleteRow = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      for (const csoName of deleteTarget.cso_company_names) {
        await deleteCSOMatching(csoName);
      }
      toast({ title: '삭제 완료', description: `사업자번호 ${formatBusinessNumber(deleteTarget.business_number)}의 모든 매핑이 삭제되었습니다.` });
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      fetchIntegrityData();
    } catch (error) {
      console.error('Delete row error:', error);
      toast({ variant: 'destructive', title: '삭제 실패', description: '매핑 삭제 중 오류가 발생했습니다.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddNewRow = async () => {
    if (!selectedUnmappedBizNum) {
      toast({ variant: 'destructive', title: '입력 오류', description: '회원을 선택해주세요.' });
      return;
    }
    if (!newCsoName.trim()) {
      toast({ variant: 'destructive', title: '입력 오류', description: 'CSO관리업체명을 입력해주세요.' });
      return;
    }

    setAddingRow(true);
    try {
      const result = await upsertCSOMatching(newCsoName.trim(), selectedUnmappedBizNum);
      if (result.success) {
        toast({ title: '추가 완료', description: '새 매핑이 추가되었습니다.' });
        setShowAddDialog(false);
        setSelectedUnmappedBizNum('');
        setNewCsoName('');
        fetchIntegrityData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: '추가 실패', description: error instanceof Error ? error.message : '오류가 발생했습니다.' });
    } finally {
      setAddingRow(false);
    }
  };

  return {
    showDeleteDialog, setShowDeleteDialog, deleteTarget, setDeleteTarget, deleting,
    handleDeleteRow,
    showAddDialog, setShowAddDialog, selectedUnmappedBizNum, setSelectedUnmappedBizNum,
    newCsoName, setNewCsoName, addingRow,
    handleAddNewRow,
  };
}

'use client';

import React, { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';
import type { User } from '@/hooks/useMembers';

async function postJson<T = Record<string, unknown>>(url: string, body: T) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}

export interface ApprovalParams {
  fetchUsers: () => Promise<void>;
  setProcessing: (v: string | null) => void;
  setBatchProcessing: (v: boolean) => void;
  setRejectDialog: (v: { open: boolean; user: User | null }) => void;
  setRejectReason: (v: string) => void;
  selectedUsers: Set<string>;
  setSelectedUsers: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useMemberApproval(p: ApprovalParams) {
  const { toast } = useToast();

  const handleApprove = useCallback(async (user: User) => {
    p.setProcessing(user.business_number);
    try {
      const result = await postJson(API_ROUTES.USERS.APPROVE, { business_number: user.business_number });
      if (result.success) { toast({ title: '승인 완료', description: `${user.company_name}의 회원가입이 승인되었습니다.` }); p.fetchUsers(); }
      else { toast({ variant: 'destructive', title: '승인 실패', description: result.error }); }
    } catch { toast({ variant: 'destructive', title: '오류', description: '승인 처리 중 오류가 발생했습니다.' }); }
    finally { p.setProcessing(null); }
  }, [p, toast]);

  const handleBatchApprove = useCallback(async () => {
    if (p.selectedUsers.size === 0) { toast({ variant: 'destructive', title: '선택 필요', description: '승인할 회원을 선택해주세요.' }); return; }
    p.setBatchProcessing(true);
    try {
      const result = await postJson(API_ROUTES.USERS.APPROVE_BATCH, { business_numbers: Array.from(p.selectedUsers) });
      if (result.success) {
        const { approved, failed, emailFailed } = result.data;
        p.setSelectedUsers(new Set());
        let desc = `${approved}건 승인 완료`;
        if (failed > 0) desc += `, ${failed}건 실패`;
        if (emailFailed > 0) desc += ` (이메일 ${emailFailed}건 발송 실패)`;
        toast({ title: '일괄 승인 완료', description: desc }); p.fetchUsers();
      } else { toast({ variant: 'destructive', title: '일괄 승인 실패', description: result.error || '처리 중 오류가 발생했습니다.' }); }
    } catch { toast({ variant: 'destructive', title: '오류', description: '일괄 승인 처리 중 오류가 발생했습니다.' }); }
    finally { p.setBatchProcessing(false); }
  }, [p, toast]);

  const handleReject = useCallback(async (user: User | null, reason: string) => {
    if (!user) return;
    p.setProcessing(user.business_number);
    try {
      const result = await postJson(API_ROUTES.USERS.REJECT, { business_number: user.business_number, reason: reason || undefined });
      if (result.success) { toast({ title: '거부 완료', description: `${user.company_name}의 회원가입이 거부되었습니다.` }); p.fetchUsers(); }
      else { toast({ variant: 'destructive', title: '거부 실패', description: result.error }); }
    } catch { toast({ variant: 'destructive', title: '오류', description: '거부 처리 중 오류가 발생했습니다.' }); }
    finally { p.setProcessing(null); p.setRejectDialog({ open: false, user: null }); p.setRejectReason(''); }
  }, [p, toast]);

  return { handleApprove, handleBatchApprove, handleReject };
}

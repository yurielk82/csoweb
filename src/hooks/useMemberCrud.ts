'use client';

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';
import type { User } from '@/hooks/useMembers';

async function exportMembersToExcel(users: User[]) {
  const XLSX = await import('xlsx');
  const data = users.map(u => ({
    '업체명': u.company_name, '대표자명': u.ceo_name || '', '사업자번호': u.business_number,
    '우편번호': u.zipcode || '', '주소': u.address1 || '', '상세주소': u.address2 || '',
    '연락처1': u.phone1 || '', '연락처2': u.phone2 || '', '이메일': u.email, '이메일2': u.email2 || '',
    '상태': u.is_admin ? '관리자' : (u.is_approved ? '승인됨' : '대기중'),
    '가입일': new Date(u.created_at).toLocaleDateString('ko-KR'),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '회원목록');
  XLSX.writeFile(wb, `회원목록_${new Date().toISOString().split('T')[0]}.xlsx`);
  return users.length;
}

export interface CrudParams {
  fetchUsers: () => Promise<void>;
  setDeleteUser: (v: User | null) => void;
  setDeleting: (v: boolean) => void;
  setResetUser: (v: User | null) => void;
  setResetting: (v: boolean) => void;
  setExporting: (v: boolean) => void;
  filteredUsers: User[];
}

export function useMemberCrud(p: CrudParams) {
  const { toast } = useToast();

  const handleDelete = useCallback(async (user: User | null) => {
    if (!user) return;
    p.setDeleting(true);
    try {
      const res = await fetch(API_ROUTES.USERS.byBusinessNumber(user.business_number), { method: 'DELETE' });
      const result = await res.json();
      if (result.success) { toast({ title: '삭제 완료', description: '회원이 삭제되었습니다.' }); p.setDeleteUser(null); p.fetchUsers(); }
      else { toast({ variant: 'destructive', title: '삭제 실패', description: result.error }); }
    } catch { toast({ variant: 'destructive', title: '오류', description: '회원 삭제 중 오류가 발생했습니다.' }); }
    finally { p.setDeleting(false); }
  }, [p, toast]);

  const handleResetPassword = useCallback(async (user: User | null) => {
    if (!user) return;
    p.setResetting(true);
    try {
      const res = await fetch(API_ROUTES.USERS.RESET_PASSWORD, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_number: user.business_number }) });
      const result = await res.json();
      if (result.success) { toast({ title: '비밀번호 초기화 완료', description: `${result.data.company_name}의 비밀번호가 초기화되었습니다.` }); p.setResetUser(null); }
      else { toast({ variant: 'destructive', title: '초기화 실패', description: result.error }); }
    } catch { toast({ variant: 'destructive', title: '오류', description: '비밀번호 초기화 중 오류가 발생했습니다.' }); }
    finally { p.setResetting(false); }
  }, [p, toast]);

  const handleExportExcel = useCallback(async () => {
    p.setExporting(true);
    try {
      const count = await exportMembersToExcel(p.filteredUsers);
      toast({ title: '다운로드 완료', description: `${count}명의 회원 정보가 다운로드되었습니다.` });
    } catch { toast({ variant: 'destructive', title: '다운로드 실패', description: '엑셀 파일 생성 중 오류가 발생했습니다.' }); }
    finally { p.setExporting(false); }
  }, [p, toast]);

  return { handleDelete, handleResetPassword, handleExportExcel };
}

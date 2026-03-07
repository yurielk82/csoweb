'use client';

import { useCallback } from 'react';
import { formatBusinessNumber } from '@/components/admin/settlement-integrity/CSOTagComponents';
import type { IntegrityRow, ToastFn } from './types';

export function useIntegrityExport(toast: ToastFn, filteredData: IntegrityRow[]) {
  const handleExportIssues = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const exportData = filteredData
        .filter(r => r.registration_status !== 'registered' || r.cso_company_names.length === 0)
        .map(r => ({
          '사업자번호': formatBusinessNumber(r.business_number),
          '사업자명': r.business_name || '-',
          '가입 상태': r.registration_status === 'registered' ? '가입완료' : '미가입',
          'CSO 매핑': r.cso_company_names.join(', ') || '-',
          '마지막정산월': r.last_settlement_month || '-',
          '정산건수': r.row_count,
        }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '문제항목');

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `거래처매핑_문제항목_${today}.xlsx`);

      toast({ title: '다운로드 완료', description: `${exportData.length}건의 문제 항목이 다운로드되었습니다.` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ variant: 'destructive', title: '다운로드 실패', description: '엑셀 파일 생성 중 오류가 발생했습니다.' });
    }
  }, [filteredData, toast]);

  return { handleExportIssues };
}

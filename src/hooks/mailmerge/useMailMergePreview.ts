import { useState, useCallback } from 'react';
import { API_ROUTES } from '@/constants/api';

import type { PreviewData, TestCompany, EmailSection } from './types';
import { getSectionsPayload } from './types';

type ToastFn = ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'];

interface PreviewDeps {
  subject: string;
  body: string;
  recipientType: 'all' | 'year_month';
  selectedYearMonth: string;
  includeSettlementTable: boolean;
  sections: EmailSection[];
  toast: ToastFn;
}

function buildMailPayload(
  subject: string,
  body: string,
  recipientType: 'all' | 'year_month',
  selectedYearMonth: string,
  includeSettlementTable: boolean,
  sections: EmailSection[],
  extra?: Record<string, unknown>,
) {
  const sectionsPayload = includeSettlementTable ? getSectionsPayload(sections) : undefined;
  return {
    subject,
    body,
    year_month: recipientType === 'year_month' ? selectedYearMonth : undefined,
    include_settlement_table: includeSettlementTable,
    sections: sectionsPayload,
    ...extra,
  };
}

function buildRecipientParams(
  recipientType: 'all' | 'year_month',
  selectedYearMonth: string,
): URLSearchParams | null {
  const params = new URLSearchParams();
  if (recipientType === 'all') {
    params.set('type', 'all');
  } else if (recipientType === 'year_month' && selectedYearMonth) {
    params.set('type', 'year_month');
    params.set('year_month', selectedYearMonth);
  } else {
    return null;
  }
  return params;
}

export { buildMailPayload, buildRecipientParams };

export function useMailMergePreview(deps: PreviewDeps) {
  const { subject, body, recipientType, selectedYearMonth, includeSettlementTable, sections, toast } = deps;

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testCompanies, setTestCompanies] = useState<TestCompany[]>([]);
  const [selectedTestBn, setSelectedTestBn] = useState<string>('');

  const fetchPreview = useCallback(async (testBn?: string) => {
    const payload = buildMailPayload(subject, body, recipientType, selectedYearMonth, includeSettlementTable, sections, {
      test_business_number: testBn && testBn !== '__sample__' ? testBn : undefined,
    });
    const previewRes = await fetch(API_ROUTES.EMAIL.MAILMERGE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const previewData = await previewRes.json();
    if (previewData.success) setPreview(previewData.data);
    return previewData;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, body, recipientType, selectedYearMonth, includeSettlementTable, sections]);

  const handlePreview = async () => {
    try {
      const params = buildRecipientParams(recipientType, selectedYearMonth) ?? new URLSearchParams();
      params.set('include_list', 'true');

      const [previewData, listRes] = await Promise.all([
        fetchPreview(),
        fetch(`${API_ROUTES.EMAIL.MAILMERGE}?${params.toString()}`),
      ]);
      const listData = await listRes.json();

      if (previewData.success) {
        setPreviewOpen(true);
      } else {
        toast({ variant: 'destructive', title: '미리보기 실패', description: previewData.error });
      }

      if (listData.success && listData.data.companies) {
        setTestCompanies(listData.data.companies);
        setSelectedTestBn('');
      }
    } catch (error) {
      console.error('미리보기 생성 오류:', error);
      toast({ variant: 'destructive', title: '오류', description: '미리보기 생성 중 오류가 발생했습니다.' });
    }
  };

  const handleTestCompanyChange = async (bn: string) => {
    setSelectedTestBn(bn);
    try {
      await fetchPreview(bn);
    } catch (error) {
      console.error('미리보기 갱신 오류:', error);
    }
  };

  const handleTestSend = async () => {
    setTestSending(true);
    try {
      const payload = buildMailPayload(subject, body, recipientType, selectedYearMonth, includeSettlementTable, sections, {
        test_business_number: selectedTestBn && selectedTestBn !== '__sample__' ? selectedTestBn : undefined,
      });
      const response = await fetch(API_ROUTES.EMAIL.MAILMERGE, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: '테스트 발송 완료', description: `${data.data.email}로 "${data.data.company_name}" 데이터가 발송되었습니다.` });
      } else {
        toast({ variant: 'destructive', title: '테스트 발송 실패', description: data.error });
      }
    } catch (error) {
      console.error('테스트 발송 오류:', error);
      toast({ variant: 'destructive', title: '오류', description: '테스트 발송 중 오류가 발생했습니다.' });
    } finally {
      setTestSending(false);
    }
  };

  return {
    preview, previewOpen, setPreviewOpen,
    testSending, testCompanies, selectedTestBn,
    handlePreview, handleTestCompanyChange, handleTestSend,
  };
}

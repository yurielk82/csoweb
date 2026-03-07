import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';

import type {
  SectionId,
  EmailSection,
  SendLog,
  SendResult,
  SendProgress,
  PreviewData,
  TestCompany,
} from './types';
import { DEFAULT_SECTIONS, formatTime, getSectionsPayload } from './types';
import { parseSSEStream } from './parseSSE';

export function useMailMerge() {
  const { toast } = useToast();

  // 수신 대상
  const [recipientType, setRecipientType] = useState<'all' | 'year_month'>('all');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('');
  const [includeSettlementTable, setIncludeSettlementTable] = useState(false);
  const [sections, setSections] = useState<EmailSection[]>(DEFAULT_SECTIONS);

  // 메일 내용
  const [subject, setSubject] = useState('{{정산월}} 정산 안내 - {{업체명}}');
  const [body, setBody] = useState(`{{업체명}} 담당자님께,

{{정산월}} 정산 내역을 안내드립니다.

★ 총 수수료(세금계산서 발행 금액): {{총_수수료}}

자세한 내용은 정산서 포털에서 확인해 주세요.

감사합니다.`);

  // 미리보기
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testCompanies, setTestCompanies] = useState<TestCompany[]>([]);
  const [selectedTestBn, setSelectedTestBn] = useState<string>('');

  // 수신 대상 수
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // 발송
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<SendProgress | null>(null);
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);
  const [result, setResult] = useState<SendResult | null>(null);

  // 정산월 옵션
  const [yearMonthOptions, setYearMonthOptions] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ─── Effects ──────────────────────────────────────────

  useEffect(() => {
    async function fetchAvailableMonths() {
      try {
        const res = await fetch(`${API_ROUTES.EMAIL.MAILMERGE}?type=available_months`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data.months)) {
          setYearMonthOptions(data.data.months);
        }
      } catch (error) {
        console.error('정산월 목록 조회 오류:', error);
      }
    }
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    if (recipientType !== 'year_month') {
      setIncludeSettlementTable(false);
      setSections(DEFAULT_SECTIONS);
    }
  }, [recipientType]);

  const fetchRecipientCount = useCallback(async () => {
    setLoadingCount(true);
    try {
      const params = new URLSearchParams();
      if (recipientType === 'all') {
        params.set('type', 'all');
      } else if (recipientType === 'year_month' && selectedYearMonth) {
        params.set('type', 'year_month');
        params.set('year_month', selectedYearMonth);
      } else {
        setRecipientCount(null);
        setLoadingCount(false);
        return;
      }
      const res = await fetch(`${API_ROUTES.EMAIL.MAILMERGE}?${params.toString()}`);
      const data = await res.json();
      if (data.success) setRecipientCount(data.data.count);
    } catch (error) {
      console.error('수신 대상 수 조회 오류:', error);
      setRecipientCount(null);
    } finally {
      setLoadingCount(false);
    }
  }, [recipientType, selectedYearMonth]);

  useEffect(() => { fetchRecipientCount(); }, [fetchRecipientCount]);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [sendLogs]);

  // ─── 유틸리티 ─────────────────────────────────────────

  const insertVariable = (key: string, target: 'subject' | 'body') => {
    const variable = `{{${key}}}`;
    if (target === 'subject') setSubject(prev => prev + variable);
    else setBody(prev => prev + variable);
  };

  const toggleSection = (id: SectionId) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    const newSections = [...sections];
    [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
    setSections(newSections);
  };

  // ─── 계산값 ───────────────────────────────────────────

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  const remainingTime = progress && progress.delay > 0
    ? Math.ceil(((progress.total - progress.current) * progress.delay) / 1000) : 0;

  // ─── 핸들러 ───────────────────────────────────────────

  const fetchPreview = useCallback(async (testBn?: string) => {
    const sectionsPayload = includeSettlementTable ? getSectionsPayload(sections) : undefined;
    const previewRes = await fetch(API_ROUTES.EMAIL.MAILMERGE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        body,
        year_month: recipientType === 'year_month' ? selectedYearMonth : undefined,
        include_settlement_table: includeSettlementTable,
        sections: sectionsPayload,
        test_business_number: testBn && testBn !== '__sample__' ? testBn : undefined,
      }),
    });
    const previewData = await previewRes.json();
    if (previewData.success) {
      setPreview(previewData.data);
    }
    return previewData;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, body, recipientType, selectedYearMonth, includeSettlementTable, sections]);

  const handlePreview = async () => {
    try {
      const params = new URLSearchParams();
      if (recipientType === 'all') {
        params.set('type', 'all');
      } else if (recipientType === 'year_month' && selectedYearMonth) {
        params.set('type', 'year_month');
        params.set('year_month', selectedYearMonth);
      }
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
      const sectionsPayload = includeSettlementTable ? getSectionsPayload(sections) : undefined;
      const response = await fetch(API_ROUTES.EMAIL.MAILMERGE, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          year_month: recipientType === 'year_month' ? selectedYearMonth : undefined,
          include_settlement_table: includeSettlementTable,
          sections: sectionsPayload,
          test_business_number: selectedTestBn && selectedTestBn !== '__sample__' ? selectedTestBn : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: '테스트 발송 완료',
          description: `${data.data.email}로 "${data.data.company_name}" 데이터가 발송되었습니다.`,
        });
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

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    setProgress(null);
    setSendLogs([]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const sectionsPayload = includeSettlementTable ? getSectionsPayload(sections) : undefined;
      const recipientsList = recipientType === 'all'
        ? ['all']
        : [`year_month:${selectedYearMonth}`];

      const response = await fetch(API_ROUTES.EMAIL.MAILMERGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipientsList,
          subject,
          body,
          year_month: recipientType === 'year_month' ? selectedYearMonth : undefined,
          include_settlement_table: includeSettlementTable,
          sections: sectionsPayload,
        }),
        signal: abortController.signal,
      });

      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('응답 스트림을 읽을 수 없습니다.');
        await parseSSEStream(reader, { setProgress, setSendLogs, setResult });
      } else {
        const data = await response.json();
        if (!data.success) {
          toast({ variant: 'destructive', title: '발송 실패', description: data.error });
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast({ title: '발송 취소', description: '발송이 취소되었습니다. 이미 발송된 건은 취소되지 않습니다.' });
      } else {
        toast({ variant: 'destructive', title: '오류', description: '이메일 발송 중 오류가 발생했습니다.' });
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => { abortControllerRef.current?.abort(); };

  // ─── 반환 ─────────────────────────────────────────────

  return {
    // 수신 대상 상태
    recipientType, setRecipientType,
    selectedYearMonth, setSelectedYearMonth,
    includeSettlementTable, setIncludeSettlementTable,
    sections, yearMonthOptions,
    // 메일 내용 상태
    subject, setSubject,
    body, setBody,
    // 미리보기 상태
    preview, previewOpen, setPreviewOpen,
    testSending, testCompanies, selectedTestBn,
    // 수신 대상 수
    recipientCount, loadingCount,
    // 발송 상태
    sending, progress, sendLogs, result, logsEndRef,
    // 계산값
    progressPercent, remainingTime,
    // 핸들러
    insertVariable, toggleSection, moveSection,
    handlePreview, handleTestCompanyChange, handleTestSend,
    handleSend, handleCancel, formatTime,
  };
}

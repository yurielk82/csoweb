import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_EMAIL_SEND_DELAY_MS } from '@/constants/defaults';
import { API_ROUTES } from '@/constants/api';

// ─── 타입 정의 ───────────────────────────────────────────

export type SectionId = 'notice' | 'dashboard' | 'table' | 'body';

export interface EmailSection {
  id: SectionId;
  label: string;
  enabled: boolean;
}

export interface ProgressEvent {
  type: 'start' | 'progress' | 'complete';
  current?: number;
  total: number;
  sent?: number;
  failed?: number;
  company_name?: string;
  status?: 'sent' | 'failed' | 'skipped';
  error?: string;
  delay?: number;
  row_count?: number;
}

export interface SendLog {
  company_name: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  row_count?: number;
}

export interface SendResult {
  sent: number;
  failed: number;
  total: number;
}

export interface SendProgress {
  current: number;
  total: number;
  sent: number;
  failed: number;
  delay: number;
}

export interface PreviewData {
  subject: string;
  contentHtml?: string;
  hasSettlementData?: boolean;
}

export interface TestCompany {
  business_number: string;
  company_name: string;
}

// ─── 상수 ───────────────────────────────────────────────

export const AVAILABLE_VARIABLES = [
  { key: '업체명', description: '업체명' },
  { key: '사업자번호', description: '사업자번호' },
  { key: '이메일', description: '이메일 주소' },
  { key: '대표자명', description: '회사 대표자 이름' },
  { key: '정산월', description: '정산 년월 (예: 2026년 01월)' },
  { key: '정산월+1', description: '정산 다음월 (예: 2월)' },
  { key: '총_금액', description: '총 금액 (= 전체 금액 합계)' },
  { key: '총_수수료', description: '제약수수료 합계 (= 세금계산서 발행 금액)' },
  { key: '제약수수료_합계', description: '제약수수료 합계 (상세)' },
  { key: '담당수수료_합계', description: '담당수수료 합계' },
  { key: '총_수량', description: '총 수량 합계' },
  { key: '데이터_건수', description: '정산 데이터 행 개수' },
] as const;

export const DEFAULT_SECTIONS: EmailSection[] = [
  { id: 'notice', label: 'Notice (공지사항)', enabled: true },
  { id: 'dashboard', label: '대시보드 (합계 요약)', enabled: true },
  { id: 'table', label: '정산서 테이블', enabled: true },
  { id: 'body', label: '메일 내용', enabled: true },
];

// ─── 훅 ─────────────────────────────────────────────────

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

  // 정산월 옵션 (DB에서 실제 데이터가 있는 월만)
  const [yearMonthOptions, setYearMonthOptions] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ─── Effects ──────────────────────────────────────────

  // mount 시 실제 정산 데이터가 있는 월 목록 조회
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

  // 수신 대상이 all로 바뀌면 테이블 첨부 해제 + 섹션 초기화
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

  const getSectionsPayload = () =>
    sections.map(s => ({ id: s.id, enabled: s.enabled }));

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}초`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
  };

  // ─── 계산값 ───────────────────────────────────────────

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  const remainingTime = progress && progress.delay > 0
    ? Math.ceil(((progress.total - progress.current) * progress.delay) / 1000) : 0;

  // ─── 핸들러 ───────────────────────────────────────────

  const fetchPreview = useCallback(async (testBn?: string) => {
    const previewRes = await fetch(API_ROUTES.EMAIL.MAILMERGE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        body,
        year_month: recipientType === 'year_month' ? selectedYearMonth : undefined,
        include_settlement_table: includeSettlementTable,
        sections: includeSettlementTable ? getSectionsPayload() : undefined,
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
      const response = await fetch(API_ROUTES.EMAIL.MAILMERGE, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          year_month: recipientType === 'year_month' ? selectedYearMonth : undefined,
          include_settlement_table: includeSettlementTable,
          sections: includeSettlementTable ? getSectionsPayload() : undefined,
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
          sections: includeSettlementTable ? getSectionsPayload() : undefined,
        }),
        signal: abortController.signal,
      });

      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('응답 스트림을 읽을 수 없습니다.');

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const dataMatch = line.match(/^data: (.+)$/m);
            if (!dataMatch) continue;
            try {
              const event: ProgressEvent = JSON.parse(dataMatch[1]);
              if (event.type === 'start') {
                setProgress({ current: 0, total: event.total, sent: 0, failed: 0, delay: event.delay || DEFAULT_EMAIL_SEND_DELAY_MS });
              } else if (event.type === 'progress') {
                setProgress(prev => ({
                  current: event.current || 0, total: event.total,
                  sent: event.sent || 0, failed: event.failed || 0, delay: prev?.delay || DEFAULT_EMAIL_SEND_DELAY_MS,
                }));
                if (event.company_name && event.status) {
                  setSendLogs(prev => [...prev, {
                    company_name: event.company_name!, status: event.status!,
                    error: event.error, row_count: event.row_count,
                  }]);
                }
              } else if (event.type === 'complete') {
                setResult({ sent: event.sent || 0, failed: event.failed || 0, total: event.total });
              }
            } catch { /* SSE JSON 파싱: 불완전한 줄은 정상적으로 무시 */ }
          }
        }
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
    recipientType,
    setRecipientType,
    selectedYearMonth,
    setSelectedYearMonth,
    includeSettlementTable,
    setIncludeSettlementTable,
    sections,
    yearMonthOptions,

    // 메일 내용 상태
    subject,
    setSubject,
    body,
    setBody,

    // 미리보기 상태
    preview,
    previewOpen,
    setPreviewOpen,
    testSending,
    testCompanies,
    selectedTestBn,

    // 수신 대상 수
    recipientCount,
    loadingCount,

    // 발송 상태
    sending,
    progress,
    sendLogs,
    result,
    logsEndRef,

    // 계산값
    progressPercent,
    remainingTime,

    // 핸들러
    insertVariable,
    toggleSection,
    moveSection,
    handlePreview,
    handleTestCompanyChange,
    handleTestSend,
    handleSend,
    handleCancel,
    formatTime,
  };
}

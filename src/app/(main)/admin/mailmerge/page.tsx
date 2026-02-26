'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MailPlus, Send, Eye, Loader2, Users, X, CheckCircle2, XCircle, Clock, ChevronUp, ChevronDown, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

function generateYearMonthOptions() {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return options;
}

const AVAILABLE_VARIABLES = [
  { key: '업체명', description: '업체명' },
  { key: '사업자번호', description: '사업자번호' },
  { key: '이메일', description: '이메일 주소' },
  { key: '정산월', description: '정산 년월 (YYYY-MM)' },
  { key: '총_금액', description: '총 금액 (= 전체 금액 합계)' },
  { key: '총_수수료', description: '제약수수료 합계 (= 세금계산서 발행 금액)' },
  { key: '제약수수료_합계', description: '제약수수료 합계 (상세)' },
  { key: '담당수수료_합계', description: '담당수수료 합계' },
  { key: '총_수량', description: '총 수량 합계' },
  { key: '데이터_건수', description: '정산 데이터 행 개수' },
];

type SectionId = 'notice' | 'dashboard' | 'table' | 'body';

interface EmailSection {
  id: SectionId;
  label: string;
  enabled: boolean;
}

const DEFAULT_SECTIONS: EmailSection[] = [
  { id: 'notice', label: 'Notice (공지사항)', enabled: true },
  { id: 'dashboard', label: '대시보드 (합계 요약)', enabled: true },
  { id: 'table', label: '정산서 테이블', enabled: true },
  { id: 'body', label: '메일 내용', enabled: true },
];

interface ProgressEvent {
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

interface SendLog {
  company_name: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  row_count?: number;
}

export default function MailMergePage() {
  const { toast } = useToast();
  const [recipientType, setRecipientType] = useState<'all' | 'year_month'>('all');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('');
  const [includeSettlementTable, setIncludeSettlementTable] = useState(false);
  const [sections, setSections] = useState<EmailSection[]>(DEFAULT_SECTIONS);
  const [subject, setSubject] = useState('{{정산월}} 정산 안내 - {{업체명}}');
  const [body, setBody] = useState(`{{업체명}} 담당자님께,

{{정산월}} 정산 내역을 안내드립니다.

▪ 총 금액: {{총_금액}}
▪ 총 수수료: {{총_수수료}}
▪ 데이터 건수: {{데이터_건수}}

자세한 내용은 정산서 포털에서 확인해 주세요.

감사합니다.`);

  const [preview, setPreview] = useState<{ subject: string; contentHtml?: string; hasSettlementData?: boolean } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testSending, setTestSending] = useState(false);

  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    sent: number;
    failed: number;
    delay: number;
  } | null>(null);
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const yearMonthOptions = generateYearMonthOptions();

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
      const res = await fetch(`/api/email/mailmerge?${params.toString()}`);
      const data = await res.json();
      if (data.success) setRecipientCount(data.data.count);
    } catch {
      setRecipientCount(null);
    } finally {
      setLoadingCount(false);
    }
  }, [recipientType, selectedYearMonth]);

  useEffect(() => { fetchRecipientCount(); }, [fetchRecipientCount]);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [sendLogs]);

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

  const handlePreview = async () => {
    try {
      const response = await fetch('/api/email/mailmerge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          year_month: recipientType === 'year_month' ? selectedYearMonth : undefined,
          include_settlement_table: includeSettlementTable,
          sections: includeSettlementTable ? getSectionsPayload() : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setPreview(data.data);
        setPreviewOpen(true);
      } else {
        toast({ variant: 'destructive', title: '미리보기 실패', description: data.error });
      }
    } catch {
      toast({ variant: 'destructive', title: '오류', description: '미리보기 생성 중 오류가 발생했습니다.' });
    }
  };

  const handleTestSend = async () => {
    setTestSending(true);
    try {
      const response = await fetch('/api/email/mailmerge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          year_month: recipientType === 'year_month' ? selectedYearMonth : undefined,
          include_settlement_table: includeSettlementTable,
          sections: includeSettlementTable ? getSectionsPayload() : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: '테스트 발송 완료', description: `${data.data.email}로 테스트 메일이 발송되었습니다.` });
      } else {
        toast({ variant: 'destructive', title: '테스트 발송 실패', description: data.error });
      }
    } catch {
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

      const response = await fetch('/api/email/mailmerge', {
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
                setProgress({ current: 0, total: event.total, sent: 0, failed: 0, delay: event.delay || 6000 });
              } else if (event.type === 'progress') {
                setProgress(prev => ({
                  current: event.current || 0, total: event.total,
                  sent: event.sent || 0, failed: event.failed || 0, delay: prev?.delay || 6000,
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
            } catch { /* ignore */ }
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

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  const remainingTime = progress && progress.delay > 0
    ? Math.ceil(((progress.total - progress.current) * progress.delay) / 1000) : 0;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}초`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MailPlus className="h-6 w-6" />
          메일머지
        </h1>
        <p className="text-muted-foreground">업체들에게 개인화된 이메일을 일괄 발송합니다.</p>
      </div>

      {/* Recipient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            수신 대상 선택
            {recipientCount !== null && (
              <Badge variant="secondary" className="ml-2">
                {loadingCount ? '...' : `${recipientCount}개 업체`}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>이메일을 받을 업체를 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={recipientType} onValueChange={(v) => setRecipientType(v as 'all' | 'year_month')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all">전체 승인된 업체</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="year_month" id="year_month" />
              <Label htmlFor="year_month">특정 정산월 데이터가 있는 업체</Label>
            </div>
          </RadioGroup>

          {recipientType === 'year_month' && (
            <div className="ml-6 space-y-3">
              <Select value={selectedYearMonth} onValueChange={setSelectedYearMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="정산월 선택" />
                </SelectTrigger>
                <SelectContent>
                  {yearMonthOptions.map(ym => (
                    <SelectItem key={ym} value={ym}>{ym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedYearMonth && (
                <div className="flex items-center space-x-2 rounded-lg border px-3 py-2 bg-muted/30">
                  <Checkbox
                    id="includeSettlementTable"
                    checked={includeSettlementTable}
                    onCheckedChange={(checked) => setIncludeSettlementTable(checked === true)}
                    disabled={sending}
                  />
                  <Label htmlFor="includeSettlementTable" className="text-sm font-medium cursor-pointer">
                    정산서 상세 데이터 포함
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    (각 업체별 정산 데이터가 이메일에 첨부됩니다)
                  </span>
                </div>
              )}

              {/* Section order management */}
              {includeSettlementTable && (
                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">이메일 구성 순서 (드래그 또는 화살표로 변경)</p>
                  <div className="space-y-1">
                    {sections.map((section, index) => (
                      <div
                        key={section.id}
                        className="flex items-center gap-2 rounded-md border px-3 py-1.5 bg-background hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={section.enabled}
                          onCheckedChange={() => toggleSection(section.id)}
                          disabled={sending}
                        />
                        <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}.</span>
                        <span className={`text-sm flex-1 ${!section.enabled ? 'text-muted-foreground line-through' : ''}`}>
                          {section.label}
                        </span>
                        <div className="flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveSection(index, 'up')}
                            disabled={index === 0 || sending}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveSection(index, 'down')}
                            disabled={index === sections.length - 1 || sending}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">메일 작성</CardTitle>
          <CardDescription>제목과 내용을 작성하세요. 변수를 사용하면 각 업체에 맞게 치환됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">제목</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="이메일 제목" disabled={sending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">내용</Label>
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="이메일 내용" rows={12} className="font-mono text-sm" disabled={sending} />
          </div>
          <div className="space-y-2">
            <Label>사용 가능한 변수</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARIABLES.map(v => (
                <Badge key={v.key} variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => !sending && insertVariable(v.key, 'body')}>
                  {`{{${v.key}}}`}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">클릭하면 내용에 변수가 추가됩니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {(sending || result) && progress && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {result
                  ? `발송 완료 (${result.sent + result.failed}/${progress.total})`
                  : `발송 중... (${progress.current}/${progress.total})`}
              </span>
              {sending && (
                <Button variant="destructive" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />취소
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressPercent}%</span>
                <div className="flex gap-4">
                  <span className="text-green-600">성공: {progress.sent}건</span>
                  {progress.failed > 0 && <span className="text-red-600">실패: {progress.failed}건</span>}
                  {sending && remainingTime > 0 && <span>남은 시간: ~{formatTime(remainingTime)}</span>}
                </div>
              </div>
            </div>
            {sendLogs.length > 0 && (
              <ScrollArea className="h-48 rounded-md border p-3">
                <div className="space-y-1 text-sm">
                  {sendLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {log.status === 'sent' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : log.status === 'failed' ? (
                        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      )}
                      <span className={log.status === 'failed' ? 'text-red-600' : ''}>{log.company_name}</span>
                      {log.status === 'sent' && (
                        <span className="text-muted-foreground">— {log.row_count ? `${log.row_count}건 테이블 포함 ` : ''}발송 완료</span>
                      )}
                      {log.status === 'failed' && <span className="text-red-500">— {log.error || '발송 실패'}</span>}
                      {log.status === 'skipped' && <span className="text-muted-foreground">— 건너뜀</span>}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handlePreview} disabled={sending}>
          <Eye className="h-4 w-4 mr-2" />미리보기
        </Button>
        <Button onClick={handleSend} disabled={sending || (recipientType === 'year_month' && !selectedYearMonth)}>
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          발송하기
        </Button>
      </div>

      {/* Result */}
      {result && !sending && (
        <Alert variant={result.failed > 0 ? 'destructive' : 'default'}>
          <AlertTitle>발송 결과</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <p>전체 대상: {result.total}개 업체</p>
              <p className="text-green-600">발송 성공: {result.sent}건</p>
              {result.failed > 0 && <p className="text-red-600">발송 실패: {result.failed}건</p>}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className={preview?.hasSettlementData ? 'max-w-[90vw] max-h-[90vh]' : 'max-w-2xl'}>
          <DialogHeader>
            <DialogTitle>메일 미리보기</DialogTitle>
            <DialogDescription>실제 발송될 이메일의 예시입니다. (샘플 데이터 기준)</DialogDescription>
          </DialogHeader>
          {preview && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">제목</p>
                  <p className="font-medium">{preview.subject}</p>
                </div>
                {preview.contentHtml && (
                  <div className="p-4 bg-muted rounded-lg overflow-x-auto">
                    <p className="text-sm text-muted-foreground mb-2">이메일 본문</p>
                    <div dangerouslySetInnerHTML={{ __html: preview.contentHtml }} />
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>닫기</Button>
            <Button onClick={handleTestSend} disabled={testSending}>
              {testSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SendHorizonal className="h-4 w-4 mr-2" />}
              테스트 발송 (내 이메일)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileSpreadsheet, Send, Eye, Loader2, Users, X, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

interface Recipient {
  cso_name: string;
  business_number: string;
  company_name: string;
  email: string;
}

interface PreviewData {
  company_name: string;
  year_month: string;
  notice: string;
  columns: { key: string; name: string; isNumeric: boolean }[];
  row_count: number;
  summary: {
    총_금액: number;
    총_수수료: number;
    데이터_건수: number;
    총_수량: number;
  };
  preview_rows: Record<string, unknown>[];
}

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

export default function SettlementEmailPage() {
  const { toast } = useToast();
  const [selectedYearMonth, setSelectedYearMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loadingMonths, setLoadingMonths] = useState(true);
  const [subjectTemplate, setSubjectTemplate] = useState('{{정산월}} 정산서 - {{업체명}}');

  // 수신자 목록
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // 미리보기
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // 발송 진행 상태
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

  // 정산월 목록 로드
  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const res = await fetch('/api/settlements/year-months');
        const data = await res.json();
        if (data.success) {
          setAvailableMonths(data.data);
        }
      } catch {
        // ignore
      } finally {
        setLoadingMonths(false);
      }
    };
    fetchMonths();
  }, []);

  // 수신자 목록 로드
  const fetchRecipients = useCallback(async () => {
    if (!selectedYearMonth) {
      setRecipients([]);
      return;
    }
    setLoadingRecipients(true);
    try {
      const res = await fetch(`/api/email/settlement-email?year_month=${selectedYearMonth}`);
      const data = await res.json();
      if (data.success) {
        setRecipients(data.data.recipients);
      }
    } catch {
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, [selectedYearMonth]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  // 로그 자동 스크롤
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sendLogs]);

  // 미리보기
  const handlePreview = async () => {
    if (!selectedYearMonth) return;
    setLoadingPreview(true);

    try {
      const res = await fetch('/api/email/settlement-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_month: selectedYearMonth }),
      });
      const data = await res.json();

      if (data.success) {
        setPreviewData(data.data);
        setPreviewOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: '미리보기 실패',
          description: data.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '미리보기 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // 발송
  const handleSend = async () => {
    setSending(true);
    setResult(null);
    setProgress(null);
    setSendLogs([]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/email/settlement-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year_month: selectedYearMonth,
          subject_template: subjectTemplate,
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
                setProgress({
                  current: 0,
                  total: event.total,
                  sent: 0,
                  failed: 0,
                  delay: event.delay || 6000,
                });
              } else if (event.type === 'progress') {
                setProgress(prev => ({
                  current: event.current || 0,
                  total: event.total,
                  sent: event.sent || 0,
                  failed: event.failed || 0,
                  delay: prev?.delay || 6000,
                }));
                if (event.company_name && event.status) {
                  setSendLogs(prev => [...prev, {
                    company_name: event.company_name!,
                    status: event.status!,
                    error: event.error,
                    row_count: event.row_count,
                  }]);
                }
              } else if (event.type === 'complete') {
                setResult({
                  sent: event.sent || 0,
                  failed: event.failed || 0,
                  total: event.total,
                });
              }
            } catch {
              // JSON parse error
            }
          }
        }
      } else {
        const data = await response.json();
        if (!data.success) {
          toast({
            variant: 'destructive',
            title: '발송 실패',
            description: data.error,
          });
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast({
          title: '발송 취소',
          description: '발송이 취소되었습니다. 이미 발송된 건은 취소되지 않습니다.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: '오류',
          description: '정산서 이메일 발송 중 오류가 발생했습니다.',
        });
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  const remainingTime = progress && progress.delay > 0
    ? Math.ceil(((progress.total - progress.current) * progress.delay) / 1000)
    : 0;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}초`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
  };

  const formatNumber = (val: unknown): string => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toLocaleString('ko-KR');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          정산서 이메일 발송
        </h1>
        <p className="text-muted-foreground">거래처별 정산서 상세 데이터를 테이블 형태로 이메일 발송합니다.</p>
      </div>

      {/* 정산월 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            발송 설정
            {recipients.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {loadingRecipients ? '...' : `${recipients.length}개 업체`}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>정산월을 선택하면 해당 월에 데이터가 있는 CSO 업체 목록이 표시됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>정산월</Label>
            <Select
              value={selectedYearMonth}
              onValueChange={setSelectedYearMonth}
              disabled={sending}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={loadingMonths ? '로딩 중...' : '정산월 선택'} />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map(ym => (
                  <SelectItem key={ym} value={ym}>{ym}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>이메일 제목</Label>
            <Input
              value={subjectTemplate}
              onChange={e => setSubjectTemplate(e.target.value)}
              placeholder="{{정산월}} 정산서 - {{업체명}}"
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              사용 가능한 변수: {'{{정산월}}'}, {'{{업체명}}'}
            </p>
          </div>

          {/* 수신자 목록 */}
          {loadingRecipients && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              수신 대상 조회 중...
            </div>
          )}

          {!loadingRecipients && selectedYearMonth && recipients.length > 0 && (
            <div className="space-y-2">
              <Label>수신 대상 업체 ({recipients.length}개)</Label>
              <ScrollArea className="h-40 rounded-md border p-3">
                <div className="space-y-1 text-sm">
                  {recipients.map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted">
                      <span className="font-medium">{r.company_name}</span>
                      <span className="text-muted-foreground text-xs">{r.email}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {!loadingRecipients && selectedYearMonth && recipients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              해당 정산월에 매핑된 CSO 업체가 없습니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Progress Card */}
      {(sending || result) && progress && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {result
                  ? `발송 완료 (${result.sent + result.failed}/${progress.total})`
                  : `발송 중... (${progress.current}/${progress.total})`
                }
              </span>
              {sending && (
                <Button variant="destructive" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  취소
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
                  {progress.failed > 0 && (
                    <span className="text-red-600">실패: {progress.failed}건</span>
                  )}
                  {sending && remainingTime > 0 && (
                    <span>남은 시간: ~{formatTime(remainingTime)}</span>
                  )}
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
                      <span className={log.status === 'failed' ? 'text-red-600' : ''}>
                        {log.company_name}
                      </span>
                      {log.status === 'sent' && (
                        <span className="text-muted-foreground">
                          — {log.row_count}건 발송 완료
                        </span>
                      )}
                      {log.status === 'failed' && (
                        <span className="text-red-500">— {log.error || '발송 실패'}</span>
                      )}
                      {log.status === 'skipped' && (
                        <span className="text-muted-foreground">— 데이터 없음 (건너뜀)</span>
                      )}
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
        <Button
          variant="outline"
          onClick={handlePreview}
          disabled={sending || !selectedYearMonth || loadingPreview}
        >
          {loadingPreview ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Eye className="h-4 w-4 mr-2" />
          )}
          미리보기
        </Button>
        <Button
          onClick={handleSend}
          disabled={sending || !selectedYearMonth || recipients.length === 0}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          정산서 발송 ({recipients.length}건)
        </Button>
      </div>

      {/* Final Result */}
      {result && !sending && (
        <Alert variant={result.failed > 0 ? 'destructive' : 'default'}>
          <AlertTitle>발송 결과</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <p>전체 대상: {result.total}개 업체</p>
              <p className="text-green-600">발송 성공: {result.sent}건</p>
              {result.failed > 0 && (
                <p className="text-red-600">발송 실패: {result.failed}건</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>정산서 이메일 미리보기</DialogTitle>
            <DialogDescription>
              실제 발송될 이메일의 예시입니다. (첫 번째 업체 기준, 최대 20행)
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-4">
                {/* 제목 */}
                <div>
                  <p className="text-lg font-bold">
                    {previewData.company_name} - {previewData.year_month} 정산서
                  </p>
                  <p className="text-sm text-muted-foreground">
                    데이터 건수: {previewData.row_count}건
                  </p>
                </div>

                {/* Notice */}
                {previewData.notice && (
                  <div className="border-l-4 border-yellow-500 bg-yellow-50 p-3">
                    <p className="font-bold text-sm text-yellow-800 mb-1">[ Notice ]</p>
                    <pre className="text-xs text-yellow-900 whitespace-pre-wrap">{previewData.notice}</pre>
                  </div>
                )}

                {/* 합계 */}
                <div className="text-sm text-muted-foreground">
                  데이터 건수: {previewData.summary.데이터_건수.toLocaleString()}건 |
                  총 수량: {previewData.summary.총_수량.toLocaleString()} |
                  총 금액: {previewData.summary.총_금액.toLocaleString()}원 |
                  총 수수료: {previewData.summary.총_수수료.toLocaleString()}원
                </div>

                {/* 테이블 */}
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse w-auto">
                    <thead>
                      <tr>
                        {previewData.columns.map(col => (
                          <th
                            key={col.key}
                            className="border border-gray-400 bg-gray-200 px-2 py-1 whitespace-nowrap text-center font-medium"
                          >
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview_rows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {previewData.columns.map(col => (
                            <td
                              key={col.key}
                              className={`border border-gray-300 px-2 py-1 whitespace-nowrap ${col.isNumeric ? 'text-right' : 'text-left'}`}
                            >
                              {col.isNumeric
                                ? formatNumber(row[col.key])
                                : (row[col.key] as string) ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.row_count > 20 && (
                  <p className="text-xs text-muted-foreground">
                    ... 외 {previewData.row_count - 20}건 (미리보기에서는 최대 20행만 표시)
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

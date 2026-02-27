'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, Clock, Filter, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { EmailLog, EmailTemplateType, EmailStatus } from '@/types';

const TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  registration_request: '회원가입 신청',
  approval_complete: '승인 완료',
  approval_rejected: '승인 거부',
  settlement_uploaded: '정산서 업로드',
  password_reset: '비밀번호 재설정',
  mail_merge: '메일머지',
};

const STATUS_CONFIG: Record<EmailStatus, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof CheckCircle }> = {
  pending: { label: '대기중', variant: 'secondary', icon: Clock },
  sent: { label: '발송됨', variant: 'default', icon: CheckCircle },
  failed: { label: '실패', variant: 'destructive', icon: XCircle },
};

/* ─── 에러 메시지 한글 설명 ─── */
const ERROR_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /SMTP 설정 미완료/i, label: '관리자 설정에서 SMTP 호스트 또는 계정 정보가 입력되지 않았습니다' },
  { pattern: /RESEND_API_KEY/i, label: '서버 환경변수에 Resend API 키가 설정되지 않았습니다' },
  { pattern: /invalid.*(from|sender)/i, label: '발신자 이메일 주소 형식이 올바르지 않거나 인증되지 않은 도메인입니다' },
  { pattern: /invalid.*(to|recipient)/i, label: '수신자 이메일 주소 형식이 올바르지 않습니다' },
  { pattern: /rate.?limit/i, label: '이메일 API 호출 한도를 초과했습니다. 잠시 후 재시도하세요' },
  { pattern: /timeout|timed?\s*out|ETIMEDOUT/i, label: '메일 서버가 응답하지 않아 시간이 초과되었습니다' },
  { pattern: /ECONNREFUSED/i, label: '메일 서버(SMTP)에 연결이 거부되었습니다. 호스트/포트 설정을 확인하세요' },
  { pattern: /ECONNRESET/i, label: '메일 서버와의 연결이 중간에 끊어졌습니다' },
  { pattern: /ENOTFOUND/i, label: 'SMTP 호스트 주소를 찾을 수 없습니다. 서버 주소를 확인하세요' },
  { pattern: /auth|credential|login/i, label: 'SMTP 인증에 실패했습니다. 계정 또는 비밀번호를 확인하세요' },
  { pattern: /rejected|bounced|undeliverable/i, label: '수신자 메일 서버에서 수신을 거부했습니다 (메일함 용량 초과, 주소 없음 등)' },
  { pattern: /quota|limit.*exceeded/i, label: '일일 발송 한도를 초과했습니다. 다음 날 재시도하세요' },
  { pattern: /missing.*required/i, label: '이메일 발송에 필요한 필수 항목(제목, 본문 등)이 누락되었습니다' },
  { pattern: /dns|MX/i, label: '수신자 도메인의 DNS/MX 레코드를 찾을 수 없습니다. 이메일 주소를 확인하세요' },
];

function getErrorSummary(errorMessage: string | null): string | null {
  if (!errorMessage) return null;
  for (const { pattern, label } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) return label;
  }
  return '알 수 없는 오류로 발송에 실패했습니다. 원문: ' + errorMessage;
}

/* ─── 날짜 프리셋 ─── */
type DatePreset = '7d' | '30d' | '90d' | 'all';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: '90d', label: '최근 90일' },
  { value: 'all', label: '전체 기간' },
];

function getStartDate(preset: DatePreset): string | undefined {
  if (preset === 'all') return undefined;
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

/* ─── 스켈레톤 ─── */
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-12 bg-muted animate-pulse rounded" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <TableRow key={i}>
          <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
          <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
          <TableCell><div className="h-4 w-48 bg-muted animate-pulse rounded" /></TableCell>
          <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
          <TableCell><div className="h-4 w-14 bg-muted animate-pulse rounded" /></TableCell>
          <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function EmailLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');

  const startDate = useMemo(() => getStartDate(datePreset), [datePreset]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filterType !== 'all') params.set('template_type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (startDate) params.set('start_date', startDate);

      const response = await fetch(`/api/email/logs?${params}`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs);
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error('Fetch email logs error:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, startDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            이메일 발송 이력
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground">발송된 이메일 내역을 조회합니다.</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          새로고침
        </Button>
      </div>

      {/* Stats */}
      {loading && logs.length === 0 ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>전체</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>발송 성공</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.sent}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>발송 실패</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.failed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>대기중</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            필터
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          {/* 날짜 프리셋 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              기간
            </p>
            <div className="flex gap-1">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={datePreset === preset.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDatePreset(preset.value)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 템플릿 유형 */}
          <div className="w-44">
            <p className="text-xs text-muted-foreground mb-1.5">유형</p>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="템플릿 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 상태 */}
          <div className="w-36">
            <p className="text-xs text-muted-foreground mb-1.5">상태</p>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">발송일시</TableHead>
                <TableHead className="w-[170px]">수신자</TableHead>
                <TableHead>제목</TableHead>
                <TableHead className="w-[100px]">유형</TableHead>
                <TableHead className="w-[70px]">상태</TableHead>
                <TableHead className="w-[200px]">오류 내용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableSkeleton />
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {datePreset !== 'all'
                      ? `${DATE_PRESETS.find(p => p.value === datePreset)?.label} 동안 이메일 발송 내역이 없습니다.`
                      : '이메일 발송 내역이 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const statusConfig = STATUS_CONFIG[log.status];
                  const StatusIcon = statusConfig.icon;
                  const isFailed = log.status === 'failed';

                  return (
                    <TableRow key={log.id} className={cn(isFailed && 'bg-red-50/50 dark:bg-red-950/20')}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(log.created_at).toLocaleString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="truncate">{log.recipient_email}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="truncate">{log.subject}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {TEMPLATE_LABELS[log.template_type] || log.template_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={statusConfig.variant} className="text-xs">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {isFailed ? (
                          <span className="text-red-600 dark:text-red-400">
                            {getErrorSummary(log.error_message) ?? '-'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {!loading && logs.length > 0 && (
            <div className="px-4 py-3 border-t text-xs text-muted-foreground">
              {logs.length}건 표시
              {logs.length >= 200 && ' (최대 200건)'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

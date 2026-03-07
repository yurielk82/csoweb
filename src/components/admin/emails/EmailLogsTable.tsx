import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EmailLog, EmailStatus, EmailTemplateType } from '@/types';

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

interface EmailLogsTableProps {
  logs: EmailLog[];
  loading: boolean;
  emptyMessage: string;
}

export function EmailLogsTable({ logs, loading, emptyMessage }: EmailLogsTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <TooltipProvider delayDuration={200}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상태</TableHead>
                <TableHead>발송일시</TableHead>
                <TableHead>수신자</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>유형</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableSkeleton />
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => <EmailLogRow key={log.id} log={log} />)
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
        {!loading && logs.length > 0 && (
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            {logs.length}건 표시
            {logs.length >= 200 && ' (최대 200건)'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmailLogRow({ log }: { log: EmailLog }) {
  const statusConfig = STATUS_CONFIG[log.status];
  const StatusIcon = statusConfig.icon;
  const isFailed = log.status === 'failed';
  const errorSummary = isFailed ? getErrorSummary(log.error_message) : null;

  return (
    <TableRow className={cn(isFailed && 'bg-red-50/50 dark:bg-red-950/20')}>
      <TableCell className="whitespace-nowrap">
        {isFailed && errorSummary ? (
          <Tooltip>
            <TooltipTrigger className="cursor-help">
              <Badge variant={statusConfig.variant} className="text-xs gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
                <AlertCircle className="h-3 w-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              {errorSummary}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Badge variant={statusConfig.variant} className="text-xs">
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {new Date(log.created_at).toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {log.recipient_email}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {log.subject}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge variant="outline" className="text-xs">
          {TEMPLATE_LABELS[log.template_type] || log.template_type}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function TableSkeleton() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <TableRow key={i}>
          <TableCell><div className="h-5 w-14 bg-muted animate-pulse rounded-full" /></TableCell>
          <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
          <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
          <TableCell><div className="h-4 w-48 bg-muted animate-pulse rounded" /></TableCell>
          <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

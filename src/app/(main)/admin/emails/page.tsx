'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
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
import { Loading } from '@/components/shared/loading';
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

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export default function EmailLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterType !== 'all') params.set('template_type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);

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
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading && logs.length === 0) {
    return <Loading text="이메일 발송 이력을 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            이메일 발송 이력
          </h1>
          <p className="text-muted-foreground">발송된 이메일 내역을 조회합니다.</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Stats */}
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            필터
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="w-48">
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
          <div className="w-48">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>발송일시</TableHead>
                <TableHead>수신자</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const statusConfig = STATUS_CONFIG[log.status];
                const StatusIcon = statusConfig.icon;
                
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.recipient_email}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {log.subject}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TEMPLATE_LABELS[log.template_type] || log.template_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    이메일 발송 내역이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

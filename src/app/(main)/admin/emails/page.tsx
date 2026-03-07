'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Mail, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EmailLog } from '@/types';
import { API_ROUTES } from '@/constants/api';
import { EmailStatsCards, StatsSkeleton } from '@/components/admin/emails/EmailStatsCards';
import { EmailFilters, getStartDate, getDatePresetLabel, type DatePreset } from '@/components/admin/emails/EmailFilters';
import { EmailLogsTable } from '@/components/admin/emails/EmailLogsTable';

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
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');

  const startDate = useMemo(() => getStartDate(datePreset), [datePreset]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filterType !== 'all') params.set('template_type', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (startDate) params.set('start_date', startDate);

      const response = await fetch(`${API_ROUTES.EMAIL.LOGS}?${params}`);
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

  const emptyMessage = datePreset !== 'all'
    ? `${getDatePresetLabel(datePreset)} 동안 이메일 발송 내역이 없습니다.`
    : '이메일 발송 내역이 없습니다.';

  return (
    <div className="space-y-6">
      {/* 헤더 */}
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

      {/* 통계 카드 */}
      {loading && logs.length === 0 ? (
        <StatsSkeleton />
      ) : (
        <EmailStatsCards stats={stats} />
      )}

      {/* 필터 */}
      <EmailFilters
        datePreset={datePreset}
        filterType={filterType}
        filterStatus={filterStatus}
        onDatePresetChange={setDatePreset}
        onFilterTypeChange={setFilterType}
        onFilterStatusChange={setFilterStatus}
      />

      {/* 로그 테이블 */}
      <EmailLogsTable
        logs={logs}
        loading={loading}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

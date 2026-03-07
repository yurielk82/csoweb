'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminKpiCards } from './AdminKpiCards';
import { TodoAlerts } from './TodoAlerts';
import type { AdminDashboardData } from '@/hooks/useAdminDashboard';

// ── Props ──

interface OperationsTabProps {
  data: AdminDashboardData;
}

// ── Component ──

export const OperationsTab = memo(function OperationsTab({ data }: OperationsTabProps) {
  const {
    kpiLoaded,
    systemLoaded,
    selectedMonth,
    months,
    emailStats,
    pendingCount,
    unmappedCount,
    allSnapshots,
    systemStatus,
    activeProvider,
    currentMonthKey,
  } = data;

  // AdminKpiCards — accessedCount 계산
  const selectedSnapshot = allSnapshots.find(
    (s) => s.settlement_month === selectedMonth,
  );
  const accessedCount = selectedSnapshot?.accessed_business_numbers?.length ?? 0;
  const totalCsoCount = months.find(m => m.month === selectedMonth)?.csoCount ?? 0;

  // TodoAlerts — 조건값 계산
  const currentMonthUploaded = months.some((m) => m.month === currentMonthKey);

  return (
    <div className="space-y-6">
      {/* 1. KPI 카드 */}
      {kpiLoaded ? (
        <AdminKpiCards
          months={months}
          selectedMonth={selectedMonth}
          accessedCount={accessedCount}
          totalCsoCount={totalCsoCount}
          emailStats={emailStats}
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {/* 2. 할 일 알림 */}
      {kpiLoaded && (
        <TodoAlerts
          currentMonthUploaded={currentMonthUploaded}
          pendingCount={pendingCount}
          unmappedCount={unmappedCount}
        />
      )}

      {/* 3. 시스템 상태 풋터 */}
      <SystemFooter
        systemLoaded={systemLoaded}
        systemStatus={systemStatus}
        activeProvider={activeProvider}
      />
    </div>
  );
});

// ── System Footer (분리) ──

interface SystemFooterProps {
  systemLoaded: boolean;
  systemStatus: AdminDashboardData['systemStatus'];
  activeProvider: string;
}

const SystemFooter = memo(function SystemFooter({
  systemLoaded,
  systemStatus,
  activeProvider,
}: SystemFooterProps) {
  if (!systemLoaded) {
    return (
      <div className="mt-auto pt-6 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
      </div>
    );
  }

  const emailOk =
    activeProvider === 'smtp'
      ? systemStatus.smtp.configured
      : systemStatus.resend;
  const emailLabel =
    activeProvider === 'smtp'
      ? `이메일 SMTP${systemStatus.resend ? '/Resend' : ''}`
      : `이메일 Resend${systemStatus.smtp.configured ? '/SMTP' : ''}`;

  const checks = [
    { label: 'DB', ok: systemStatus.supabase },
    { label: '국세청 API', ok: systemStatus.nts_api },
    { label: '심평원 병원 API', ok: systemStatus.hira_hospital_api },
    { label: '심평원 약국 API', ok: systemStatus.hira_pharmacy_api },
    { label: emailLabel, ok: emailOk },
  ];

  const connected = checks.filter((c) => c.ok);
  const disconnected = checks.filter((c) => !c.ok);
  const sortedChecks = [...connected, ...disconnected];

  return (
    <div className="mt-auto pt-6 border-t text-xs text-muted-foreground">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="font-mono">{systemStatus.version}</span>
          <span>·</span>
          <span>{systemStatus.environment}</span>
        </span>
        {sortedChecks.map(({ label, ok }) => (
          <span key={label} className="flex items-center gap-1">
            <span
              className={ok ? 'dashboard-status-dot-ok' : 'dashboard-status-dot-fail'}
            />
            <span className={ok ? '' : 'text-destructive'}>{label}</span>
          </span>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-auto px-2 py-1 text-xs text-muted-foreground"
          asChild
        >
          <Link href="/admin/system">
            시스템 정보
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
});

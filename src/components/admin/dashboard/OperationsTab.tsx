'use client';

import { memo } from 'react';
import Link from 'next/link';
import {
  Users,
  Columns,
  Mail,
  MailPlus,
  Database,
  ArrowRight,
  Upload,
  Link2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminKpiCards } from './AdminKpiCards';
import { TodoAlerts } from './TodoAlerts';
import type { AdminDashboardData } from '@/hooks/useAdminDashboard';

// ── Quick Actions ──

const quickActions = [
  { href: '/admin/upload', icon: Upload, title: '정산서 업로드', description: '정산서 데이터 업로드', iconColor: 'glass-icon-blue' },
  { href: '/admin/members?filter=pending', icon: Users, title: '회원 승인', description: '대기 중인 회원 승인', iconColor: 'glass-icon-green' },
  { href: '/admin/integrity', icon: Link2, title: '거래처 매핑', description: 'CSO 관리업체 매칭 상태 검수', iconColor: 'glass-icon-cyan' },
  { href: '/admin/data', icon: Database, title: '데이터 관리', description: '정산 데이터 관리', iconColor: 'glass-icon-purple' },
  { href: '/admin/columns', icon: Columns, title: '컬럼 설정', description: '표시 컬럼 관리', iconColor: 'glass-icon-orange' },
  { href: '/admin/mailmerge', icon: MailPlus, title: '메일머지', description: '일괄 이메일 발송', iconColor: 'glass-icon-pink' },
  { href: '/admin/emails', icon: Mail, title: '이메일 이력', description: '발송 내역 조회', iconColor: 'glass-icon-purple' },
];

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
    filteredCsoBusinessNumbers,
    emailStats,
    badgeMap,
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
  const totalCsoCount = filteredCsoBusinessNumbers.length;

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

      {/* 3. 빠른 작업 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">빠른 작업</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const badge = badgeMap[action.href];
            return (
              <Link key={action.href} href={action.href}>
                <div className="glass-action-card">
                  <div className="flex items-center justify-between">
                    <div className={`glass-icon ${action.iconColor}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    {badge && (
                      <Badge variant={badge.variant} className="text-xs">
                        {badge.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-base font-semibold mt-3">{action.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. 시스템 상태 풋터 */}
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

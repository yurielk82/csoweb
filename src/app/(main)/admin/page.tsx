'use client';

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
  Calendar,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const MonthlyStatsChart = dynamic(
  () => import('@/components/shared/MonthlyStatsChart'),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminDashboard, monthKeyToLabel } from '@/hooks/useAdminDashboard';

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

// ── Component ──

export default function AdminDashboardPage() {
  const {
    kpiLoaded,
    systemLoaded,
    selectedMonth,
    handleMonthChange,
    monthOptions,
    enrichedChartData,
    badgeMap,
    systemStatus,
    activeProvider,
  } = useAdminDashboard();

  return (
    <div className="flex flex-col flex-1 space-y-6">
        {/* Header + Month Select */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">관리자 대시보드</h1>
            <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
          </div>
          {kpiLoaded ? (
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-36">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((key) => (
                  <SelectItem key={key} value={key}>
                    {monthKeyToLabel(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Skeleton className="h-9 w-36 rounded-xl" />
          )}
        </div>

        {/* 월별 통계 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">월별 통계</h2>
          {kpiLoaded ? (
            <MonthlyStatsChart data={enrichedChartData} />
          ) : (
            <Skeleton className="h-[300px] rounded-xl" />
          )}
        </div>

        {/* 빠른 작업 */}
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

      {/* System Footer */}
      <div className="mt-auto pt-6 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          {systemLoaded ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="font-mono">{systemStatus.version}</span>
                <span>·</span>
                <span>{systemStatus.environment}</span>
              </span>
              {(() => {
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
                return [...connected, ...disconnected].map(({ label, ok }) => (
                  <span key={label} className="flex items-center gap-1">
                    <span
                      className={ok ? 'dashboard-status-dot-ok' : 'dashboard-status-dot-fail'}
                    />
                    <span className={ok ? '' : 'text-destructive'}>{label}</span>
                  </span>
                ));
              })()}
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
            </>
          ) : (
            <>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-16 ml-auto" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

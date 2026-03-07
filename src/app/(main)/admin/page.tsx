'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Calculator, Building2, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { calculateDelta } from '@/lib/dashboard-utils';
import { KpiCard } from '@/components/admin/dashboard/KpiCard';
import { TodoPanel } from '@/components/admin/dashboard/TodoPanel';
import { EmailSystemBar } from '@/components/admin/dashboard/EmailSystemBar';
import { AccessRateChart } from '@/components/admin/dashboard/AccessRateChart';
import { AvgCommissionChart } from '@/components/admin/dashboard/AvgCommissionChart';
import { CsoCountChart } from '@/components/admin/dashboard/CsoCountChart';

const MonthlyStatsChart = dynamic(
  () => import('@/components/shared/MonthlyStatsChart'),
  { ssr: false, loading: () => <Skeleton className="h-full rounded-xl" /> },
);

function formatManWon(value: number): string {
  const man = Math.round(value / 10000);
  if (man >= 10000) return `${(man / 10000).toFixed(1)}억`;
  return `${man.toLocaleString()}만`;
}

export default function AdminDashboardPage() {
  const data = useAdminDashboard();
  const {
    kpiLoaded,
    systemLoaded,
    selectedMonth,
    months,
    enrichedChartData,
    emailStats,
    pendingCount,
    unmappedCount,
    allSnapshots,
    systemStatus,
    activeProvider,
    currentMonthKey,
  } = data;

  const sortedMonths = useMemo(
    () => [...months].sort((a, b) => a.month.localeCompare(b.month)),
    [months],
  );
  const currentMonth = sortedMonths.find((m) => m.month === selectedMonth);
  const currentIdx = sortedMonths.findIndex((m) => m.month === selectedMonth);
  const prevMonth = currentIdx > 0 ? sortedMonths[currentIdx - 1] : undefined;

  const commissionDelta = calculateDelta(currentMonth?.totalCommission ?? 0, prevMonth?.totalCommission);
  const csoDelta = calculateDelta(currentMonth?.csoCount ?? 0, prevMonth?.csoCount);

  const selectedSnapshot = allSnapshots.find((s) => s.settlement_month === selectedMonth);
  const accessedCount = selectedSnapshot?.accessed_business_numbers?.length ?? 0;
  const totalCsoCount = months.find((m) => m.month === selectedMonth)?.csoCount ?? 0;
  const accessRate = totalCsoCount > 0 ? Math.round((accessedCount / totalCsoCount) * 100) : 0;

  const currentMonthUploaded = months.some((m) => m.month === currentMonthKey);

  const accessRateData = useMemo(() => {
    return months.map((m) => {
      const snap = allSnapshots.find((s) => s.settlement_month === m.month);
      return {
        month: m.month,
        csoCount: m.csoCount,
        accessedCount: snap?.accessed_business_numbers?.length ?? 0,
      };
    });
  }, [months, allSnapshots]);

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">관리자 대시보드</h1>
        {systemLoaded && (
          <span className="text-xs text-muted-foreground font-mono">
            {systemStatus.version} · {systemStatus.environment}
          </span>
        )}
      </div>

      {/* 메인 그리드: 좌 3열 + 우 1열(할 일) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 좌측 컨텐츠 */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* KPI 카드 3장 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {kpiLoaded ? (
              <>
                <KpiCard
                  title="수수료 총액"
                  value={currentMonth ? formatManWon(currentMonth.totalCommission) : '-'}
                  suffix="원"
                  icon={Calculator}
                  iconColor="glass-icon-blue"
                  delta={commissionDelta}
                  emphasis
                />
                <KpiCard
                  title="CSO 업체"
                  value={currentMonth ? currentMonth.csoCount.toLocaleString() : '-'}
                  suffix="개"
                  icon={Building2}
                  iconColor="glass-icon-cyan"
                  delta={csoDelta}
                />
                <KpiCard
                  title="접속률"
                  value={`${accessRate}`}
                  suffix="%"
                  icon={Activity}
                  iconColor="glass-icon-green"
                  delta={null}
                  sub={`${accessedCount} / ${totalCsoCount}`}
                />
              </>
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            )}
          </div>

          {/* 월별 정산 추이 (전폭) */}
          {kpiLoaded ? (
            <MonthlyStatsChart data={enrichedChartData} title="월별 정산 추이" />
          ) : (
            <Skeleton className="h-64 rounded-xl" />
          )}

          {/* 하단 3열 차트 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AccessRateChart data={accessRateData} />
            <AvgCommissionChart data={months} />
            <CsoCountChart data={months} />
          </div>
        </div>

        {/* 우측: 할 일 + 빠른 이동 */}
        <TodoPanel
          currentMonthUploaded={currentMonthUploaded}
          pendingCount={pendingCount}
          unmappedCount={unmappedCount}
        />
      </div>

      {/* 이메일 + 시스템 상태 바 (최하단) */}
      <EmailSystemBar
        emailStats={emailStats}
        systemLoaded={systemLoaded}
        systemStatus={systemStatus}
        activeProvider={activeProvider}
      />
    </div>
  );
}

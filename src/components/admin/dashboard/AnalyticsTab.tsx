'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomCharts } from '@/components/admin/dashboard/BottomCharts';
import { CsoShareChart } from '@/components/admin/dashboard/CsoShareChart';
import { EmailStatsChart } from '@/components/admin/dashboard/EmailStatsChart';
import type { AdminDashboardData } from '@/hooks/useAdminDashboard.types';

const MonthlyStatsChart = dynamic(
  () => import('@/components/shared/MonthlyStatsChart'),
  { ssr: false, loading: () => <Skeleton className="h-full rounded-xl" /> },
);

interface AnalyticsTabProps {
  data: AdminDashboardData;
}

export function AnalyticsTab({ data }: AnalyticsTabProps) {
  const {
    kpiLoaded, months,
    enrichedChartData, allSnapshots, emailMonthlyStats,
  } = data;

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

  /* CsoShareChart용: 선택 월의 CSO별 수수료 비중 대신 월별 수수료 비중 */
  const csoShareData = useMemo(() => {
    return months.map((m) => ({
      name: m.month,
      value: m.totalCommission,
    }));
  }, [months]);

  return (
    <div className="flex flex-col gap-4">
      {/* 월별 정산 추이 */}
      {kpiLoaded ? (
        <MonthlyStatsChart data={enrichedChartData} title="월별 정산 추이" />
      ) : (
        <Skeleton className="h-64 rounded-xl" />
      )}

      {/* 미니 차트 3종 */}
      <BottomCharts accessRateData={accessRateData} months={months} />

      {/* 도넛 차트 + 이메일 추이 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CsoShareChart data={csoShareData} title="월별 수수료 비중" />
        <EmailStatsChart data={emailMonthlyStats} />
      </div>
    </div>
  );
}

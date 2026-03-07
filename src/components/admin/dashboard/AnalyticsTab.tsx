'use client';

import { memo, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Hash, Activity } from 'lucide-react';
import { calculateDelta, formatDelta, getDeltaColor } from '@/lib/dashboard-utils';
import { CsoShareChart } from './CsoShareChart';
import { EmailStatsChart } from './EmailStatsChart';
import type { AdminDashboardData, SettlementMonth } from '@/hooks/useAdminDashboard';
import type { DeltaResult } from '@/lib/dashboard-utils';
import type { LucideIcon } from 'lucide-react';

const MonthlyStatsChart = dynamic(
  () => import('@/components/shared/MonthlyStatsChart'),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> },
);

// ── Types ──

interface AnalyticsTabProps {
  data: AdminDashboardData;
}

interface DeltaCard {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  delta: DeltaResult | null;
}

// ── Helpers ──

const RECENT_SHARE_MONTHS = 6;

/** 만원 단위 포맷 */
function formatManWon(value: number): string {
  const man = Math.round(value / 10000);
  if (man >= 10000) {
    return `${(man / 10000).toFixed(1)}억`;
  }
  return `${man.toLocaleString()}만`;
}

/** SettlementMonth 배열을 시간순 정렬하여 반환 */
function sortMonths(months: SettlementMonth[]): SettlementMonth[] {
  return [...months].sort((a, b) => a.month.localeCompare(b.month));
}

/** 정렬된 월 배열에서 선택월·전월을 추출 */
function findCurrentAndPrev(
  sorted: SettlementMonth[],
  selectedMonth: string,
): { current: SettlementMonth | undefined; prev: SettlementMonth | undefined } {
  const idx = sorted.findIndex((m) => m.month === selectedMonth);
  return {
    current: idx >= 0 ? sorted[idx] : undefined,
    prev: idx > 0 ? sorted[idx - 1] : undefined,
  };
}

/** CSO 수수료 비중 도넛 데이터 생성 (최근 N개월) */
function buildCsoShareData(
  sorted: SettlementMonth[],
): { name: string; value: number }[] {
  return sorted
    .filter((m) => m.totalCommission > 0)
    .slice(-RECENT_SHARE_MONTHS)
    .map((m) => ({
      name: `${m.month.split('-')[1]}월`,
      value: m.totalCommission,
    }));
}

// ── Component ──

export const AnalyticsTab = memo(function AnalyticsTab({ data }: AnalyticsTabProps) {
  const { months, selectedMonth, enrichedChartData, emailMonthlyStats, kpiLoaded } = data;

  const sorted = useMemo(() => sortMonths(months), [months]);
  const { current, prev } = useMemo(
    () => findCurrentAndPrev(sorted, selectedMonth),
    [sorted, selectedMonth],
  );

  const commissionDelta = calculateDelta(current?.totalCommission ?? 0, prev?.totalCommission);
  const countDelta = calculateDelta(current?.count ?? 0, prev?.count);
  const csoDelta = calculateDelta(current?.csoCount ?? 0, prev?.csoCount);

  const csoShareData = useMemo(() => buildCsoShareData(sorted), [sorted]);

  const deltaCards: DeltaCard[] = [
    {
      title: '수수료',
      value: current ? `${formatManWon(current.totalCommission)}원` : '-',
      icon: TrendingUp,
      iconColor: 'glass-icon-blue',
      delta: commissionDelta,
    },
    {
      title: '데이터 건수',
      value: current ? `${current.count.toLocaleString()}건` : '-',
      icon: Hash,
      iconColor: 'glass-icon-cyan',
      delta: countDelta,
    },
    {
      title: 'CSO 업체 수',
      value: current ? `${current.csoCount}개` : '-',
      icon: Activity,
      iconColor: 'glass-icon-green',
      delta: csoDelta,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 월별 추이 차트 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">월별 정산 추이</h2>
        {kpiLoaded ? (
          <MonthlyStatsChart data={enrichedChartData} />
        ) : (
          <Skeleton className="h-[300px] rounded-xl" />
        )}
      </div>

      {/* 전월 대비 증감 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {deltaCards.map((card) => (
          <div key={card.title} className="glass-kpi-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                <span className="text-sm text-muted-foreground">{card.title}</span>
              </div>
              {card.delta !== null && card.delta.percent !== null && (
                <span className={`text-xs font-medium ${getDeltaColor(card.delta.percent)}`}>
                  {formatDelta(card.delta.percent)}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* 하단 차트 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CsoShareChart data={csoShareData} title="월별 수수료 비중" />
        <EmailStatsChart data={emailMonthlyStats} />
      </div>
    </div>
  );
});

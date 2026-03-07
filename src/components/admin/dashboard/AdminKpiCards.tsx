'use client';

import { memo } from 'react';
import { Calculator, Building2, Activity, Mail } from 'lucide-react';
import { calculateDelta, formatDelta, getDeltaColor } from '@/lib/dashboard-utils';

interface SettlementMonth {
  month: string;
  count: number;
  csoCount: number;
  totalQuantity: number;
  totalAmount: number;
  totalCommission: number;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

interface AdminKpiCardsProps {
  months: SettlementMonth[];
  selectedMonth: string;
  accessedCount: number;
  totalCsoCount: number;
  emailStats: EmailStats | null;
}

/** 만원 단위 포맷 (1억 이상이면 억 단위) */
function formatManWon(value: number): string {
  const man = Math.round(value / 10000);
  if (man >= 10000) {
    return `${(man / 10000).toFixed(1)}억`;
  }
  return `${man.toLocaleString()}만`;
}

export const AdminKpiCards = memo(function AdminKpiCards({
  months,
  selectedMonth,
  accessedCount,
  totalCsoCount,
  emailStats,
}: AdminKpiCardsProps) {
  const currentMonth = months.find((m) => m.month === selectedMonth);

  // 전월 찾기
  const sortedMonths = [...months].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  const currentIndex = sortedMonths.findIndex(
    (m) => m.month === selectedMonth,
  );
  const prevMonth =
    currentIndex > 0 ? sortedMonths[currentIndex - 1] : undefined;

  // 접속률
  const accessRate =
    totalCsoCount > 0
      ? Math.round((accessedCount / totalCsoCount) * 100)
      : 0;

  // 증감 계산
  const commissionDelta = calculateDelta(
    currentMonth?.totalCommission ?? 0,
    prevMonth?.totalCommission,
  );
  const csoDelta = calculateDelta(
    currentMonth?.csoCount ?? 0,
    prevMonth?.csoCount,
  );

  const cards = [
    {
      title: '수수료 총액',
      value: currentMonth ? formatManWon(currentMonth.totalCommission) : '-',
      suffix: '원',
      icon: Calculator,
      iconColor: 'glass-icon-blue',
      delta: commissionDelta,
      emphasis: true,
    },
    {
      title: 'CSO 업체 수',
      value: currentMonth ? currentMonth.csoCount.toLocaleString() : '-',
      suffix: '개',
      icon: Building2,
      iconColor: 'glass-icon-cyan',
      delta: csoDelta,
      emphasis: false,
    },
    {
      title: '접속률',
      value: `${accessRate}`,
      suffix: '%',
      icon: Activity,
      iconColor: 'glass-icon-green',
      delta: null,
      emphasis: false,
      sub: `${accessedCount} / ${totalCsoCount}`,
    },
    {
      title: '이메일 발송',
      value: emailStats ? emailStats.sent.toLocaleString() : '-',
      suffix: '건',
      icon: Mail,
      iconColor: 'glass-icon-purple',
      delta: null,
      emphasis: false,
      sub:
        emailStats && emailStats.failed > 0
          ? `실패 ${emailStats.failed}건`
          : undefined,
      subColor:
        emailStats && emailStats.failed > 0
          ? 'text-destructive'
          : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`glass-kpi-card ${card.emphasis ? 'border-primary/20' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              <span className="text-sm text-muted-foreground">
                {card.title}
              </span>
            </div>
            {card.delta?.percent !== undefined &&
              card.delta?.percent !== null && (
                <span
                  className={`text-xs font-medium ${getDeltaColor(card.delta.percent)}`}
                >
                  {formatDelta(card.delta.percent)}
                </span>
              )}
          </div>
          <p
            className={`text-2xl font-bold font-mono tabular-nums ${card.emphasis ? 'text-primary' : ''}`}
          >
            {card.value}
            <span className="text-base font-normal ml-0.5">
              {card.suffix}
            </span>
          </p>
          {card.sub && (
            <p
              className={`text-xs mt-1 ${card.subColor || 'text-muted-foreground'}`}
            >
              {card.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
});

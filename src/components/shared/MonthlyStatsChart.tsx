'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { WAN_UNIT } from '@/constants/defaults';

export interface MonthlyStatData {
  month: string;
  totalAmount?: number;
  totalCommission: number;
  /** CSO 업체 수 (admin 전용) */
  csoCount?: number;
  /** 거래처 수 (회원 전용) */
  clientCount?: number;
  /** 접속 업체 수 (admin 전용) */
  accessedCount?: number;
  /** 이메일 발송 수 (admin 전용) */
  emailSentCount?: number;
}

interface MonthlyStatsChartProps {
  data: MonthlyStatData[];
  compact?: boolean;
  title?: string;
}

// 만원 단위 포맷
function formatManWon(value: number): string {
  const man = Math.round(value / WAN_UNIT);
  if (man >= WAN_UNIT) {
    return `${(man / WAN_UNIT).toFixed(1)}억`;
  }
  return `${man.toLocaleString()}`;
}

// "YYYY-MM" → "M월"
function toMonthLabel(monthKey: string): string {
  const mm = monthKey.split('-')[1];
  return `${parseInt(mm, 10)}월`;
}

const RECENT_MONTHS = 12;

interface SeriesFlags {
  hasCsoData: boolean;
  hasClientData: boolean;
  hasAccessedData: boolean;
  hasEmailData: boolean;
}

function buildChartConfig(flags: SeriesFlags): ChartConfig {
  const config: ChartConfig = {
    totalCommission: { label: '수수료(만원)', color: 'var(--chart-1)' },
  };
  if (flags.hasCsoData) {
    config.csoCount = { label: 'CSO 업체 수', color: 'var(--chart-2)' };
  }
  if (flags.hasClientData) {
    config.clientCount = { label: '거래처 수', color: 'var(--chart-2)' };
  }
  if (flags.hasAccessedData) {
    config.accessedCount = { label: '접속 업체 수', color: 'var(--chart-3)' };
  }
  if (flags.hasEmailData) {
    config.emailSentCount = { label: '이메일 발송', color: 'var(--chart-5)' };
  }
  return config;
}

function tooltipFormatter(value: number | string | Array<number | string>, name: string | number): [ReactNode, string | number] {
  if (name === 'csoCount') return [value as ReactNode, 'CSO 업체 수'];
  if (name === 'clientCount') return [value as ReactNode, '거래처 수'];
  if (name === 'accessedCount') return [value as ReactNode, '접속 업체 수'];
  if (name === 'emailSentCount') return [value as ReactNode, '이메일 발송'];
  return [`${formatManWon(value as number)}만원`, '수수료'];
}

/* 추가 시계열 라인 (CSO/거래처/접속/이메일) */
function CountLines({ hasCsoData, hasClientData, hasAccessedData, hasEmailData }: SeriesFlags) {
  return (
    <>
      {hasCsoData && (
        <Line yAxisId="count" type="monotone" dataKey="csoCount" stroke="var(--color-csoCount)" strokeWidth={2} dot={{ r: 3 }} />
      )}
      {hasClientData && (
        <Line yAxisId="count" type="monotone" dataKey="clientCount" stroke="var(--color-clientCount)" strokeWidth={2} dot={{ r: 3 }} />
      )}
      {hasAccessedData && (
        <Line yAxisId="count" type="monotone" dataKey="accessedCount" stroke="var(--color-accessedCount)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
      )}
      {hasEmailData && (
        <Line yAxisId="count" type="monotone" dataKey="emailSentCount" stroke="var(--color-emailSentCount)" strokeWidth={2} dot={{ r: 3 }} />
      )}
    </>
  );
}

export default function MonthlyStatsChart({ data, compact, title }: MonthlyStatsChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
    return sorted.slice(-RECENT_MONTHS).map((d) => ({ ...d, label: toMonthLabel(d.month) }));
  }, [data]);

  const flags: SeriesFlags = {
    hasCsoData: chartData.some((d) => (d.csoCount ?? 0) > 0),
    hasClientData: chartData.some((d) => (d.clientCount ?? 0) > 0),
    hasAccessedData: chartData.some((d) => d.accessedCount !== undefined),
    hasEmailData: chartData.some((d) => d.emailSentCount !== undefined),
  };
  const hasCountAxis = flags.hasCsoData || flags.hasClientData || flags.hasAccessedData || flags.hasEmailData;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- flags는 매 렌더 새 객체지만 개별 boolean 값으로 메모이제이션
  const chartConfig = useMemo(() => buildChartConfig(flags), [flags.hasCsoData, flags.hasClientData, flags.hasAccessedData, flags.hasEmailData]);

  if (chartData.length === 0) {
    return (
      <div className="glass-chart-card flex flex-col items-center justify-center h-52 text-muted-foreground">
        <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">아직 통계 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="glass-chart-card">
      {title && <h3 className={`font-semibold mb-1 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>}
      <ChartContainer config={chartConfig} className={`${compact ? 'h-44 lg:h-48' : 'h-60 lg:h-64'} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart accessibilityLayer data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillCommission" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-totalCommission)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-totalCommission)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} tickMargin={10} axisLine={false} />
            <YAxis yAxisId="amount" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatManWon} width={55} />
            {hasCountAxis && <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />}
            <ChartTooltip content={<ChartTooltipContent formatter={tooltipFormatter} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area yAxisId="amount" type="monotone" dataKey="totalCommission" stroke="var(--color-totalCommission)" strokeWidth={2} fill="url(#fillCommission)" />
            <CountLines {...flags} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

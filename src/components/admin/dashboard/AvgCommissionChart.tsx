'use client';

import { memo, useMemo } from 'react';
import { Calculator } from 'lucide-react';
import {
  BarChart,
  Bar,
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
} from '@/components/ui/chart';
import type { SettlementMonth } from '@/hooks/useAdminDashboard';

interface AvgCommissionChartProps {
  data: SettlementMonth[];
}

const RECENT_MONTHS = 12;

function toMonthLabel(monthKey: string): string {
  const mm = monthKey.split('-')[1];
  return `${parseInt(mm, 10)}월`;
}

const chartConfig: ChartConfig = {
  avgCommission: {
    label: '평균 수수료',
    color: 'var(--chart-1)',
  },
};

export const AvgCommissionChart = memo(function AvgCommissionChart({
  data,
}: AvgCommissionChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
    return sorted
      .filter((d) => d.csoCount > 0)
      .slice(-RECENT_MONTHS)
      .map((d) => ({
        label: toMonthLabel(d.month),
        avgCommission: Math.round(d.totalCommission / d.csoCount / 10000),
      }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="glass-chart-card flex flex-col items-center justify-center h-32 text-muted-foreground">
        <Calculator className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">평균 수수료 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="glass-chart-card">
      <div className="px-3 pt-3 pb-1">
        <h3 className="text-sm font-semibold">업체당 평균 수수료</h3>
      </div>
      <ChartContainer config={chartConfig} className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillAvgCommission" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-avgCommission)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-avgCommission)"
                  stopOpacity={0.4}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={false}
              tickMargin={4}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={35}
              tickFormatter={(v) => `${v}만`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`${Number(value).toLocaleString()}만원`, '평균 수수료']}
                />
              }
            />
            <Bar
              dataKey="avgCommission"
              fill="url(#fillAvgCommission)"
              radius={[6, 6, 0, 0]}
              barSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
});

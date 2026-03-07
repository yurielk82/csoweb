'use client';

import { memo, useMemo } from 'react';
import { Building2 } from 'lucide-react';
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

interface CsoCountChartProps {
  data: SettlementMonth[];
}

const RECENT_MONTHS = 12;

function toMonthLabel(monthKey: string): string {
  const mm = monthKey.split('-')[1];
  return `${parseInt(mm, 10)}월`;
}

const chartConfig: ChartConfig = {
  csoCount: {
    label: 'CSO 업체 수',
    color: 'var(--chart-4)',
  },
};

export const CsoCountChart = memo(function CsoCountChart({
  data,
}: CsoCountChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
    return sorted.slice(-RECENT_MONTHS).map((d) => ({
      label: toMonthLabel(d.month),
      csoCount: d.csoCount,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="glass-chart-card flex flex-col items-center justify-center h-32 text-muted-foreground">
        <Building2 className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">CSO 업체 수 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="glass-chart-card">
      <div className="px-3 pt-3 pb-1">
        <h3 className="text-sm font-semibold">CSO 업체 수 추이</h3>
      </div>
      <ChartContainer config={chartConfig} className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillCsoCount" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-csoCount)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-csoCount)"
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
              width={30}
              tickFormatter={(v) => `${v}개`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`${value}개`, 'CSO 업체 수']}
                />
              }
            />
            <Bar
              dataKey="csoCount"
              fill="url(#fillCsoCount)"
              radius={[6, 6, 0, 0]}
              barSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
});

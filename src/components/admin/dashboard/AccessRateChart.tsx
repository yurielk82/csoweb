'use client';

import { memo, useMemo } from 'react';
import { Users } from 'lucide-react';
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

interface AccessRateChartProps {
  data: { month: string; csoCount: number; accessedCount?: number }[];
}

const RECENT_MONTHS = 12;

function toMonthLabel(monthKey: string): string {
  const mm = monthKey.split('-')[1];
  return `${parseInt(mm, 10)}월`;
}

const chartConfig: ChartConfig = {
  accessRate: {
    label: '접속률',
    color: 'var(--chart-3)',
  },
};

export const AccessRateChart = memo(function AccessRateChart({
  data,
}: AccessRateChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
    return sorted.slice(-RECENT_MONTHS).map((d) => ({
      label: toMonthLabel(d.month),
      accessRate:
        d.csoCount > 0
          ? Math.round(((d.accessedCount ?? 0) / d.csoCount) * 100)
          : 0,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="glass-chart-card flex flex-col items-center justify-center h-32 text-muted-foreground">
        <Users className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">접속률 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="glass-chart-card">
      <div className="px-3 pt-3 pb-1">
        <h3 className="text-sm font-semibold">CSO 접속률 추이</h3>
      </div>
      <ChartContainer config={chartConfig} className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillAccessRate" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-accessRate)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-accessRate)"
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
              tickFormatter={(v) => `${v}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`${value}%`, '접속률']}
                />
              }
            />
            <Bar
              dataKey="accessRate"
              fill="url(#fillAccessRate)"
              radius={[6, 6, 0, 0]}
              barSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
});

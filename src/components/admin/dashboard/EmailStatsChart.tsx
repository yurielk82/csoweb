'use client';

import { memo, useMemo } from 'react';
import { Mail } from 'lucide-react';
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

interface EmailMonthlyStat {
  month: string;
  total: number;
}

interface EmailStatsChartProps {
  data: EmailMonthlyStat[];
}

const RECENT_MONTHS_COUNT = 12;

// "YYYY-MM" -> "M월"
function toMonthLabel(monthKey: string): string {
  const mm = monthKey.split('-')[1];
  return `${parseInt(mm, 10)}월`;
}

const chartConfig: ChartConfig = {
  total: {
    label: '발송 건수',
    color: 'var(--chart-4)',
  },
};

export const EmailStatsChart = memo(function EmailStatsChart({
  data,
}: EmailStatsChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
    return sorted.slice(-RECENT_MONTHS_COUNT).map((d) => ({
      ...d,
      label: toMonthLabel(d.month),
    }));
  }, [data]);

  const totalSent = useMemo(
    () => chartData.reduce((sum, d) => sum + d.total, 0),
    [chartData],
  );

  if (chartData.length === 0) {
    return (
      <div className="glass-chart-card flex flex-col items-center justify-center h-52 text-muted-foreground">
        <Mail className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">이메일 발송 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="glass-chart-card">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-base font-semibold">이메일 발송 현황</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          총 <span className="font-medium text-foreground">{totalSent.toLocaleString()}건</span> 발송
        </p>
      </div>
      <ChartContainer config={chartConfig} className="h-48 lg:h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillEmail" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.9} />
                <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`${value}건`, '발송']}
                />
              }
            />
            <Bar
              dataKey="total"
              fill="url(#fillEmail)"
              radius={[6, 6, 0, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
});

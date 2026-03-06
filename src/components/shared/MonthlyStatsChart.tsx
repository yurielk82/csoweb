'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
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

export interface MonthlyStatData {
  month: string;
  totalAmount: number;
  totalCommission: number;
  csoCount: number;
  /** 접속 업체 수 (optional — admin 전용) */
  accessedCount?: number;
  /** 이메일 발송 수 (optional — admin 전용) */
  emailSentCount?: number;
}

interface MonthlyStatsChartProps {
  data: MonthlyStatData[];
}

// 만원 단위 포맷
function formatManWon(value: number): string {
  const man = Math.round(value / 10000);
  if (man >= 10000) {
    return `${(man / 10000).toFixed(1)}억`;
  }
  return `${man.toLocaleString()}`;
}

// "YYYY-MM" → "M월"
function toMonthLabel(monthKey: string): string {
  const mm = monthKey.split('-')[1];
  return `${parseInt(mm, 10)}월`;
}

export default function MonthlyStatsChart({ data }: MonthlyStatsChartProps) {
  // 최근 12개월 슬라이스, 시간순 정렬 (오래된 → 최근)
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
    return sorted.slice(-12).map((d) => ({
      ...d,
      label: toMonthLabel(d.month),
    }));
  }, [data]);

  // 접속업체/이메일 데이터가 하나라도 있는지 확인
  const hasAccessedData = chartData.some((d) => d.accessedCount !== undefined);
  const hasEmailData = chartData.some((d) => d.emailSentCount !== undefined);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      totalAmount: {
        label: '금액(만원)',
        color: 'hsl(var(--chart-1))',
      },
      totalCommission: {
        label: '수수료(만원)',
        color: 'hsl(var(--chart-2))',
      },
      csoCount: {
        label: 'CSO 업체 수',
        color: 'hsl(var(--chart-3))',
      },
    };
    if (hasAccessedData) {
      config.accessedCount = {
        label: '접속 업체 수',
        color: 'hsl(var(--chart-4))',
      };
    }
    if (hasEmailData) {
      config.emailSentCount = {
        label: '이메일 발송',
        color: 'hsl(var(--chart-5))',
      };
    }
    return config;
  }, [hasAccessedData, hasEmailData]);

  if (chartData.length === 0) {
    return (
      <div className="glass-chart-card flex flex-col items-center justify-center h-[300px] text-muted-foreground">
        <BarChart3 className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">아직 통계 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="glass-chart-card">
      <ChartContainer config={chartConfig} className="h-[300px] sm:h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="amount"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatManWon}
              width={55}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    if (name === 'csoCount') return [value, 'CSO 업체 수'];
                    if (name === 'accessedCount') return [value, '접속 업체 수'];
                    if (name === 'emailSentCount') return [value, '이메일 발송'];
                    return [formatManWon(value as number) + '만원', name === 'totalAmount' ? '금액' : '수수료'];
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              yAxisId="amount"
              dataKey="totalAmount"
              fill="var(--color-totalAmount)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar
              yAxisId="amount"
              dataKey="totalCommission"
              fill="var(--color-totalCommission)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Line
              yAxisId="count"
              dataKey="csoCount"
              stroke="var(--color-csoCount)"
              strokeWidth={2}
              dot={{ r: 3 }}
              type="monotone"
            />
            {hasAccessedData && (
              <Line
                yAxisId="count"
                dataKey="accessedCount"
                stroke="var(--color-accessedCount)"
                strokeWidth={2}
                dot={{ r: 3 }}
                type="monotone"
                strokeDasharray="5 3"
              />
            )}
            {hasEmailData && (
              <Line
                yAxisId="count"
                dataKey="emailSentCount"
                stroke="var(--color-emailSentCount)"
                strokeWidth={2}
                dot={{ r: 3 }}
                type="monotone"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

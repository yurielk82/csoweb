'use client';

import { memo, useMemo } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

interface CsoShareChartProps {
  data: { name: string; value: number }[];
  title?: string;
}

const MAX_SLICES = 6;
const TOP_SLICE_COUNT = 5;

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted))',
];

// 만원 단위 포맷
function formatManWon(value: number): string {
  const man = Math.round(value / 10000);
  if (man >= 10000) {
    return `${(man / 10000).toFixed(1)}억원`;
  }
  return `${man.toLocaleString()}만원`;
}

export const CsoShareChart = memo(function CsoShareChart({
  data,
  title = '월별 수수료 비중',
}: CsoShareChartProps) {
  // 상위 5개 + 나머지를 '기타'로 그룹핑
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    if (sorted.length <= MAX_SLICES) return sorted;

    const top5 = sorted.slice(0, TOP_SLICE_COUNT);
    const others = sorted.slice(TOP_SLICE_COUNT);
    const otherSum = others.reduce((sum, item) => sum + item.value, 0);
    return [...top5, { name: '기타', value: otherSum }];
  }, [data]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="glass-chart-card flex flex-col items-center justify-center h-[300px] text-muted-foreground">
        <PieChartIcon className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">비중 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="glass-chart-card">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [formatManWon(value as number), '']}
                />
              }
            />
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
});

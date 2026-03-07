'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { API_ROUTES } from '@/constants/api';
import { UserKpiCards } from '@/components/home/UserKpiCards';
import { QuickLinks } from '@/components/home/QuickLinks';
import type { MonthlyStatData } from '@/components/shared/MonthlyStatsChart';

const MonthlyStatsChart = dynamic(
  () => import('@/components/shared/MonthlyStatsChart'),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);

export default function UserHomePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<MonthlyStatData[]>([]);
  const [latestMonth, setLatestMonth] = useState('');
  const [latestCommission, setLatestCommission] = useState(0);
  const [latestClientCount, setLatestClientCount] = useState(0);
  const [latestProductCount, setLatestProductCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(API_ROUTES.SETTLEMENTS.MONTHLY_SUMMARY);
        const json = await res.json();

        if (json.success && json.data?.months) {
          const months = json.data.months as Array<{
            settlement_month: string;
            summaries: Record<string, number>;
            row_count: number;
            distinct_clients: number;
            distinct_products: number;
          }>;

          const transformed: MonthlyStatData[] = months.map(m => ({
            month: m.settlement_month,
            totalCommission: m.summaries['제약수수료_합계'] || 0,
            clientCount: m.distinct_clients,
          }));

          setChartData(transformed);

          if (months.length > 0) {
            const sorted = [...months].sort((a, b) => b.settlement_month.localeCompare(a.settlement_month));
            const latest = sorted[0];
            setLatestMonth(latest.settlement_month);
            setLatestCommission(latest.summaries['제약수수료_합계'] || 0);
            setLatestClientCount(latest.distinct_clients);
            setLatestProductCount(latest.distinct_products);
          }
        }
      } catch (error) {
        console.error('홈 데이터 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold">
          {user?.company_name ? `${user.company_name}님` : '홈'}
        </h1>
        <p className="text-sm text-muted-foreground">연간 정산 현황</p>
      </div>

      {/* KPI 카드 3장 */}
      <UserKpiCards
        loading={loading}
        latestMonth={latestMonth}
        latestCommission={latestCommission}
        latestClientCount={latestClientCount}
        latestProductCount={latestProductCount}
      />

      {/* 수수료 추이 차트 */}
      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <MonthlyStatsChart data={chartData} title="월별 추이" />
      )}

      {/* 바로가기 */}
      <QuickLinks />
    </div>
  );
}

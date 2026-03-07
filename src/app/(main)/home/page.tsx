'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Banknote,
  FileSpreadsheet,
  Calculator,
  User,
  ArrowRight,
  Building2,
  Package,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import type { MonthlyStatData } from '@/components/shared/MonthlyStatsChart';

const MonthlyStatsChart = dynamic(
  () => import('@/components/shared/MonthlyStatsChart'),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);

function formatManWon(value: number): string {
  const man = Math.round(value / 10000);
  if (man >= 10000) return `${(man / 10000).toFixed(1)}억`;
  return `${man.toLocaleString()}만`;
}

function monthKeyToLabel(monthKey: string): string {
  const [year, mm] = monthKey.split('-');
  return `${year}년 ${parseInt(mm, 10)}월`;
}

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
        const res = await fetch('/api/settlements/monthly-summary');
        const json = await res.json();

        if (json.success && json.data?.months) {
          const months = json.data.months as Array<{
            settlement_month: string;
            summaries: Record<string, number>;
            row_count: number;
          }>;
          const latestDistinct = json.data.latest_distinct as { clients: number; products: number } | null;

          const transformed: MonthlyStatData[] = months.map(m => ({
            month: m.settlement_month,
            totalCommission: m.summaries['제약수수료_합계'] || 0,
          }));

          setChartData(transformed);

          if (transformed.length > 0) {
            const sorted = [...transformed].sort((a, b) => b.month.localeCompare(a.month));
            const latest = sorted[0];
            setLatestMonth(latest.month);
            setLatestCommission(latest.totalCommission);
            setLatestClientCount(latestDistinct?.clients ?? 0);
            setLatestProductCount(latestDistinct?.products ?? 0);
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-kpi-card py-5 px-6 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 glass-icon-orange" />
              <span className="text-sm text-muted-foreground">수수료</span>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-24" />
          ) : latestMonth ? (
            <>
              <p className="text-3xl font-bold font-mono tabular-nums text-primary">
                {formatManWon(latestCommission)}
                <span className="text-base font-normal ml-0.5">원</span>
              </p>
              <p className="text-sm mt-1 text-muted-foreground">{monthKeyToLabel(latestMonth)}</p>
            </>
          ) : (
            <p className="text-3xl font-bold text-muted-foreground">&mdash;</p>
          )}
        </div>

        <div className="glass-kpi-card py-5 px-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 glass-icon-cyan" />
              <span className="text-sm text-muted-foreground">거래처 수</span>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : latestMonth ? (
            <>
              <p className="text-3xl font-bold font-mono tabular-nums">
                {latestClientCount.toLocaleString()}
                <span className="text-base font-normal ml-0.5">곳</span>
              </p>
              <p className="text-sm mt-1 text-muted-foreground">{monthKeyToLabel(latestMonth)}</p>
            </>
          ) : (
            <p className="text-3xl font-bold text-muted-foreground">&mdash;</p>
          )}
        </div>

        <div className="glass-kpi-card py-5 px-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 glass-icon-green" />
              <span className="text-sm text-muted-foreground">제품 수</span>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-9 w-20" />
          ) : latestMonth ? (
            <>
              <p className="text-3xl font-bold font-mono tabular-nums">
                {latestProductCount.toLocaleString()}
                <span className="text-base font-normal ml-0.5">종</span>
              </p>
              <p className="text-sm mt-1 text-muted-foreground">{monthKeyToLabel(latestMonth)}</p>
            </>
          ) : (
            <p className="text-3xl font-bold text-muted-foreground">&mdash;</p>
          )}
        </div>
      </div>

      {/* 수수료 추이 차트 */}
      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <MonthlyStatsChart data={chartData} title="월별 수수료 추이" />
      )}

      {/* 바로가기 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: '/dashboard', icon: FileSpreadsheet, label: '정산서 조회', description: '정산 데이터 상세 조회' },
          { href: '/monthly-summary', icon: Calculator, label: '월별 합계', description: '월별 수수료 합계표' },
          { href: '/profile', icon: User, label: '내 정보', description: '회원 정보 수정' },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <div className="glass-action-card">
              <div className="flex items-center gap-3">
                <div className="glass-icon glass-icon-blue">
                  <link.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

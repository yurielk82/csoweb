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

// 만원 단위 포맷
function formatManWon(value: number): string {
  const man = Math.round(value / 10000);
  if (man >= 10000) {
    return `${(man / 10000).toFixed(1)}억`;
  }
  return `${man.toLocaleString()}만`;
}

// "YYYY-MM" → "YYYY년 M월"
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
            distinct_clients?: number;
            distinct_products?: number;
          }>;
          const latestDistinct = json.data.latest_distinct as { clients: number; products: number } | null;

          // 차트 데이터 변환: 제약수수료_합계만 표시 (세금계산서 발행 금액)
          const transformed: MonthlyStatData[] = months.map(m => ({
            month: m.settlement_month,
            totalCommission: m.summaries['제약수수료_합계'] || 0,
            csoCount: m.row_count,
          }));

          setChartData(transformed);

          // 최신 월 요약
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

  const quickLinks = [
    { href: '/dashboard', icon: FileSpreadsheet, label: '정산서 조회', description: '정산 데이터 조회' },
    { href: '/monthly-summary', icon: Calculator, label: '월별 합계', description: '월별 수수료 합계' },
    { href: '/profile', icon: User, label: '내 정보', description: '회원 정보 수정' },
  ];

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">
          {user?.company_name ? `${user.company_name}님` : '홈'}
        </h1>
        <p className="text-muted-foreground">연간 정산 현황</p>
      </div>

      {/* 요약 카드 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 최신 수수료 */}
        <div className="glass-kpi-card border-primary/20">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">수수료</span>
            <Banknote className="h-4 w-4 glass-icon-orange" />
          </div>
          {loading ? (
            <>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : latestMonth ? (
            <>
              <div className="text-2xl font-bold text-primary">{formatManWon(latestCommission)}</div>
              <p className="text-xs text-muted-foreground">{monthKeyToLabel(latestMonth)}</p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-muted-foreground">&mdash;</div>
              <p className="text-xs text-muted-foreground">데이터 없음</p>
            </>
          )}
        </div>

        {/* 거래처 수 */}
        <div className="glass-kpi-card">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">거래처 수</span>
            <Building2 className="h-4 w-4 glass-icon-cyan" />
          </div>
          {loading ? (
            <>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : latestMonth ? (
            <>
              <div className="text-2xl font-bold">{latestClientCount.toLocaleString()}<span className="text-base font-normal ml-0.5">곳</span></div>
              <p className="text-xs text-muted-foreground">{monthKeyToLabel(latestMonth)}</p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-muted-foreground">&mdash;</div>
              <p className="text-xs text-muted-foreground">데이터 없음</p>
            </>
          )}
        </div>

        {/* 제품 수 */}
        <div className="glass-kpi-card">
          <div className="flex items-center justify-between pb-2">
            <span className="text-sm font-medium">제품 수</span>
            <Package className="h-4 w-4 glass-icon-green" />
          </div>
          {loading ? (
            <>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : latestMonth ? (
            <>
              <div className="text-2xl font-bold">{latestProductCount.toLocaleString()}<span className="text-base font-normal ml-0.5">종</span></div>
              <p className="text-xs text-muted-foreground">{monthKeyToLabel(latestMonth)}</p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-muted-foreground">&mdash;</div>
              <p className="text-xs text-muted-foreground">데이터 없음</p>
            </>
          )}
        </div>
      </div>

      {/* 차트 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">월별 추이</h2>
        {loading ? (
          <Skeleton className="h-60 rounded-xl" />
        ) : (
          <MonthlyStatsChart data={chartData} />
        )}
      </div>

      {/* 빠른 링크 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">바로가기</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div className="glass-action-card">
                <div className="flex items-center gap-3">
                  <div className="glass-icon glass-icon-blue">
                    <link.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold">{link.label}</p>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

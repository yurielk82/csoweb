'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Upload,
  Users,
  Columns,
  Mail,
  MailPlus,
  TrendingUp,
  AlertTriangle,
  Link2,
  Database,
  ArrowRight,
  Banknote,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SystemStatus } from '@/types';

interface DashboardStats {
  pendingApprovals: number;
  totalUsers: number;
  currentMonthCompanies: number;
  currentMonthCommission: number;
  recentActivityTotal: number;
}

interface TodoItem {
  label: string;
  href: string;
  severity: 'warning' | 'info';
}

interface TodoStats {
  currentMonthUploaded: boolean;
  unmappedCount: number;
  recentEmailFailed: number;
}

interface SettlementMonth {
  month: string;
  csoCount: number;
  totalCommission: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value);
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    pendingApprovals: 0,
    totalUsers: 0,
    currentMonthCompanies: 0,
    currentMonthCommission: 0,
    recentActivityTotal: 0,
  });
  const [todoStats, setTodoStats] = useState<TodoStats>({
    currentMonthUploaded: true,
    unmappedCount: 0,
    recentEmailFailed: 0,
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    supabase: false,
    resend: false,
    smtp: { configured: false, host: null },
    email_provider: 'resend',
    version: '',
    environment: 'Production',
    nts_api: false,
    hira_hospital_api: false,
    hira_pharmacy_api: false,
    next_version: '',
    node_version: '',
    deploy_platform: 'Unknown',
    deploy_url: null,
    jwt_configured: false,
  });

  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${now.getFullYear()}${String(currentMonthNum).padStart(2, '0')}`;

  useEffect(() => {
    async function fetchStats() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

      try {
        const [usersRes, allUsersRes, statusRes, settlementStatsRes, integrityRes, recentEmailRes] =
          await Promise.all([
            fetch('/api/users?pending=true'),
            fetch('/api/users'),
            fetch('/api/system/status'),
            fetch('/api/settlements/stats'),
            fetch('/api/admin/cso-matching/integrity'),
            fetch(`/api/email/logs?start_date=${sevenDaysAgo}&limit=1`),
          ]);

        const [usersData, allUsersData, statusData, settlementStatsData, integrityData, recentEmailData] =
          await Promise.all([
            usersRes.json(),
            allUsersRes.json(),
            statusRes.json(),
            settlementStatsRes.json(),
            integrityRes.json(),
            recentEmailRes.json(),
          ]);

        if (statusData.success) {
          setSystemStatus(statusData.data);
        }

        // 당월 정산 데이터 추출
        let currentMonthCompanies = 0;
        let currentMonthCommission = 0;
        let currentMonthUploaded = false;

        if (settlementStatsData.success && settlementStatsData.data?.months) {
          const currentMonthData = settlementStatsData.data.months.find(
            (m: SettlementMonth) => m.month === currentMonthKey
          );
          if (currentMonthData) {
            currentMonthUploaded = true;
            currentMonthCompanies = currentMonthData.csoCount;
            currentMonthCommission = currentMonthData.totalCommission;
          }
        }

        // 미매핑 건수
        const unmappedCount = integrityData.success
          ? integrityData.data?.stats?.noCsoMappingCount ?? 0
          : 0;

        // 최근 7일 이메일 활동
        const recentActivityTotal = recentEmailData.success
          ? recentEmailData.data?.stats?.total ?? 0
          : 0;
        const recentEmailFailed = recentEmailData.success
          ? recentEmailData.data?.stats?.failed ?? 0
          : 0;

        setStats({
          pendingApprovals: usersData.success ? usersData.data.length : 0,
          totalUsers: allUsersData.success
            ? allUsersData.data.filter((u: { is_admin: boolean }) => !u.is_admin).length
            : 0,
          currentMonthCompanies,
          currentMonthCommission,
          recentActivityTotal,
        });

        setTodoStats({
          currentMonthUploaded,
          unmappedCount,
          recentEmailFailed,
        });
      } catch (error) {
        console.error('Fetch stats error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 할 일 목록 생성
  const todoItems: TodoItem[] = [];

  if (!todoStats.currentMonthUploaded) {
    todoItems.push({
      label: `${currentMonthNum}월 정산서 미업로드`,
      href: '/admin/upload',
      severity: 'warning',
    });
  }
  if (todoStats.unmappedCount > 0) {
    todoItems.push({
      label: `거래처 미매핑 ${todoStats.unmappedCount}건`,
      href: '/admin/integrity',
      severity: 'warning',
    });
  }
  if (stats.pendingApprovals > 0) {
    todoItems.push({
      label: `회원 승인 대기 ${stats.pendingApprovals}건`,
      href: '/admin/members?filter=pending',
      severity: 'warning',
    });
  }
  if (todoStats.recentEmailFailed > 0) {
    todoItems.push({
      label: `최근 7일 이메일 실패 ${todoStats.recentEmailFailed}건`,
      href: '/admin/emails',
      severity: 'warning',
    });
  }

  const quickActions = [
    {
      href: '/admin/upload',
      icon: Upload,
      title: '정산서 업로드',
      description: '정산서 데이터 업로드',
      color: 'bg-blue-500',
    },
    {
      href: '/admin/integrity',
      icon: Link2,
      title: '거래처 매핑',
      description: 'CSO 관리업체 매칭 상태 검수',
      color: 'bg-red-500',
    },
    {
      href: '/admin/members?filter=pending',
      icon: Users,
      title: '회원 승인',
      description: '대기 중인 회원 승인',
      color: 'bg-green-500',
    },
    {
      href: '/admin/data',
      icon: Database,
      title: '데이터 관리',
      description: '정산 데이터 관리',
      color: 'bg-cyan-500',
    },
    {
      href: '/admin/columns',
      icon: Columns,
      title: '컬럼 설정',
      description: '표시 컬럼 관리',
      color: 'bg-purple-500',
    },
    {
      href: '/admin/mailmerge',
      icon: MailPlus,
      title: '메일머지',
      description: '일괄 이메일 발송',
      color: 'bg-orange-500',
    },
    {
      href: '/admin/emails',
      icon: Mail,
      title: '이메일 이력',
      description: '발송 내역 조회',
      color: 'bg-pink-500',
    },
  ];

  const activeProvider = systemStatus.email_provider;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
        </div>
        {/* KPI 스켈레톤 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* 할 일 스켈레톤 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-16" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        {/* 빠른 작업 스켈레톤 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">빠른 작업</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-base mt-2">{action.title}</CardTitle>
                    <CardDescription className="text-sm">{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-8 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
      </div>

      {/* 1단: KPI 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">당월 정산 업체</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentMonthCompanies}</div>
            <p className="text-xs text-muted-foreground">{currentMonthNum}월 정산 완료</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 업체</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">등록된 업체 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">당월 총수수료</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.currentMonthCommission)}</div>
            <p className="text-xs text-muted-foreground">{currentMonthNum}월 정산 수수료</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">최근 7일 활동</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivityTotal}건</div>
            <p className="text-xs text-muted-foreground">이메일+승인+업로드</p>
          </CardContent>
        </Card>
      </div>

      {/* 2단: 할 일 */}
      {todoItems.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">할 일</CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-2">
            {todoItems.map((item) => (
              <div
                key={item.href + item.label}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-sm text-primary" asChild>
                  <Link href={item.href}>
                    {item.href === '/admin/upload' ? '업로드' :
                     item.href === '/admin/integrity' ? '매핑' :
                     item.href.startsWith('/admin/members') ? '승인' : '이력'}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-2 py-6">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">모든 작업이 완료되었습니다</span>
          </CardContent>
        </Card>
      )}

      {/* 3단: 빠른 작업 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">빠른 작업</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2">{action.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* System Footer */}
      {(() => {
        const emailOk = activeProvider === 'smtp' ? systemStatus.smtp.configured : systemStatus.resend;
        const emailLabel = activeProvider === 'smtp'
          ? `이메일 SMTP${systemStatus.resend ? '/Resend' : ''}`
          : `이메일 Resend${systemStatus.smtp.configured ? '/SMTP' : ''}`;
        const checks = [
          { label: 'DB', ok: systemStatus.supabase },
          { label: '국세청 API', ok: systemStatus.nts_api },
          { label: '심평원 병원 API', ok: systemStatus.hira_hospital_api },
          { label: '심평원 약국 API', ok: systemStatus.hira_pharmacy_api },
          { label: emailLabel, ok: emailOk },
        ];
        const connected = checks.filter(c => c.ok);
        const disconnected = checks.filter(c => !c.ok);
        const sorted = [...connected, ...disconnected];

        return (
          <div className="mt-auto pt-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="font-mono">{systemStatus.version}</span>
                <span>·</span>
                <span>{systemStatus.environment}</span>
              </span>
              {sorted.map(({ label, ok }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={ok ? '' : 'text-red-600'}>{label}</span>
                </span>
              ))}
              <Button variant="ghost" size="sm" className="ml-auto h-auto px-2 py-1 text-xs text-muted-foreground" asChild>
                <Link href="/admin/system">
                  시스템 정보
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

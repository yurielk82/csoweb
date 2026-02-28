'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Columns,
  Mail,
  MailPlus,
  TrendingUp,
  Database,
  ArrowRight,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SystemStatus } from '@/types';

// ── Types ──

interface SettlementMonth {
  month: string;
  count: number;
  csoCount: number;
  totalCommission: number;
}

interface UserData {
  is_admin: boolean;
  last_login_at?: string | null;
}

interface DashboardData {
  // KPI
  csoCount: number;
  accessedCount: number;
  totalNonAdminUsers: number;
  totalCommission: number;
  totalMonths: number;
  // Pipeline
  currentMonthUploaded: boolean;
  currentMonthRows: number;
  pendingApprovals: number;
  unmappedCount: number;
  // System
  systemStatus: SystemStatus;
}

type PipelineStatus = 'done' | 'warn' | 'wait';

interface PipelineStep {
  step: number;
  title: string;
  status: PipelineStatus;
  label: string;
  detail: string;
  href: string | null;
}

// ── Helpers ──

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

function getPipelineIcon(status: PipelineStatus) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'warn':
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case 'wait':
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}

function getPipelineBorder(status: PipelineStatus): string {
  switch (status) {
    case 'done':
      return 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30';
    case 'warn':
      return 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30';
    case 'wait':
      return 'border-muted bg-muted/30';
  }
}

// ── Component ──

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    csoCount: 0,
    accessedCount: 0,
    totalNonAdminUsers: 0,
    totalCommission: 0,
    totalMonths: 0,
    currentMonthUploaded: false,
    currentMonthRows: 0,
    pendingApprovals: 0,
    unmappedCount: 0,
    systemStatus: {
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
    },
  });

  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${now.getFullYear()}${String(currentMonthNum).padStart(2, '0')}`;

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersRes, allUsersRes, statusRes, settlementStatsRes, integrityRes] =
          await Promise.all([
            fetch('/api/users?pending=true'),
            fetch('/api/users'),
            fetch('/api/system/status'),
            fetch('/api/settlements/stats'),
            fetch('/api/admin/cso-matching/integrity'),
          ]);

        const [usersData, allUsersData, statusData, settlementStatsData, integrityData] =
          await Promise.all([
            usersRes.json(),
            allUsersRes.json(),
            statusRes.json(),
            settlementStatsRes.json(),
            integrityRes.json(),
          ]);

        // 당월 정산 데이터
        let csoCount = 0;
        let totalCommission = 0;
        let currentMonthUploaded = false;
        let currentMonthRows = 0;
        let totalMonths = 0;

        if (settlementStatsData.success && settlementStatsData.data?.months) {
          const months: SettlementMonth[] = settlementStatsData.data.months;
          totalMonths = months.length;

          const currentMonthData = months.find(
            (m) => m.month === currentMonthKey
          );
          if (currentMonthData) {
            currentMonthUploaded = true;
            csoCount = currentMonthData.csoCount;
            totalCommission = currentMonthData.totalCommission;
            currentMonthRows = currentMonthData.count ?? 0;
          }
        }

        // 접속 업체 계산
        const allUsers: UserData[] = allUsersData.success ? allUsersData.data : [];
        const nonAdminUsers = allUsers.filter((u) => !u.is_admin);
        const totalNonAdminUsers = nonAdminUsers.length;

        const firstOfMonth = `${now.getFullYear()}-${String(currentMonthNum).padStart(2, '0')}-01T00:00:00`;
        const accessedCount = nonAdminUsers.filter(
          (u) => u.last_login_at && u.last_login_at >= firstOfMonth
        ).length;

        // 미매핑 건수
        const unmappedCount = integrityData.success
          ? integrityData.data?.stats?.noCsoMappingCount ?? 0
          : 0;

        // 승인 대기
        const pendingApprovals = usersData.success ? usersData.data.length : 0;

        setData({
          csoCount,
          accessedCount,
          totalNonAdminUsers,
          totalCommission,
          totalMonths,
          currentMonthUploaded,
          currentMonthRows,
          pendingApprovals,
          unmappedCount,
          systemStatus: statusData.success ? statusData.data : data.systemStatus,
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

  // ── Pipeline 단계 계산 ──
  const pipeline: PipelineStep[] = [
    {
      step: 1,
      title: '업로드',
      status: data.currentMonthUploaded ? 'done' : 'warn',
      label: data.currentMonthUploaded ? '완료' : '미업로드',
      detail: data.currentMonthUploaded
        ? `${currentMonthNum}월 ${data.currentMonthRows.toLocaleString()}행`
        : `${currentMonthNum}월 데이터 없음`,
      href: '/admin/upload',
    },
    {
      step: 2,
      title: '승인',
      status: data.pendingApprovals === 0 ? 'done' : 'warn',
      label: data.pendingApprovals === 0 ? '전원 승인' : `${data.pendingApprovals}건 대기`,
      detail: data.pendingApprovals === 0
        ? '대기 없음'
        : '승인 필요',
      href: '/admin/members?filter=pending',
    },
    {
      step: 3,
      title: '매핑',
      status: data.unmappedCount === 0 ? 'done' : 'warn',
      label: data.unmappedCount === 0 ? '매핑 완료' : `${data.unmappedCount}건 미매핑`,
      detail: data.unmappedCount === 0
        ? '전체 매핑됨'
        : '매핑 필요',
      href: '/admin/integrity',
    },
    {
      step: 4,
      title: '조회',
      status: 'done',
      label: `${data.accessedCount}/${data.totalNonAdminUsers} 접속`,
      detail: `${currentMonthNum}월 로그인`,
      href: '/admin/members',
    },
  ];

  // ── 기타 작업 ──
  const toolActions = [
    {
      href: '/admin/data',
      icon: Database,
      title: '데이터 관리',
      color: 'bg-cyan-500',
    },
    {
      href: '/admin/columns',
      icon: Columns,
      title: '컬럼 설정',
      color: 'bg-purple-500',
    },
    {
      href: '/admin/mailmerge',
      icon: MailPlus,
      title: '메일머지',
      color: 'bg-orange-500',
    },
    {
      href: '/admin/emails',
      icon: Mail,
      title: '이메일 이력',
      color: 'bg-pink-500',
    },
  ];

  const activeProvider = data.systemStatus.email_provider;

  // ── Loading ──
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
        {/* 파이프라인 스켈레톤 */}
        <div>
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4 space-y-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        {/* 기타 작업 스켈레톤 */}
        <div>
          <Skeleton className="h-5 w-16 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <Skeleton className="h-8 w-8 mb-2" />
                  <Skeleton className="h-4 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="mt-8 space-y-2">
          <Skeleton className="h-4 w-48" />
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

      {/* 1단: KPI 카드 (당월 중심 4개) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">당월 CSO 업체</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.csoCount}</div>
            <p className="text-xs text-muted-foreground">{currentMonthNum}월 정산 업체</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">당월 접속 업체</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.accessedCount}
              <span className="text-base font-normal text-muted-foreground">
                /{data.totalNonAdminUsers}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{currentMonthNum}월 로그인 업체</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">당월 총수수료</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalCommission)}</div>
            <p className="text-xs text-muted-foreground">{currentMonthNum}월 정산 수수료</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 정산월</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalMonths}개월</div>
            <p className="text-xs text-muted-foreground">업로드된 정산 데이터</p>
          </CardContent>
        </Card>
      </div>

      {/* 2단: 파이프라인 (4단계 카드) */}
      <div>
        <h2 className="text-lg font-semibold mb-4">업무 파이프라인</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {pipeline.map((step, idx) => {
            const isClickable = step.href !== null;
            const content = (
              <Card
                className={`border-2 transition-all ${getPipelineBorder(step.status)} ${
                  isClickable ? 'hover:shadow-md cursor-pointer' : ''
                }`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {step.step}단계
                    </span>
                    {getPipelineIcon(step.status)}
                  </div>
                  <div className="font-semibold text-sm mb-1">{step.title}</div>
                  <div className="text-sm">
                    {step.status === 'done' && (
                      <span className="text-green-600 dark:text-green-400">{step.label}</span>
                    )}
                    {step.status === 'warn' && (
                      <span className="text-amber-600 dark:text-amber-400">{step.label}</span>
                    )}
                    {step.status === 'wait' && (
                      <span className="text-muted-foreground">{step.label}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{step.detail}</div>
                  {isClickable && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                      <span>바로가기</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );

            return (
              <div key={step.step} className="relative">
                {isClickable ? (
                  <Link href={step.href!}>{content}</Link>
                ) : (
                  content
                )}
                {/* 단계 사이 화살표 (모바일 제외) */}
                {idx < pipeline.length - 1 && (
                  <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-muted-foreground">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3단: 기타 작업 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">도구</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {toolActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className={`p-2 rounded-lg ${action.color} w-fit`}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="text-sm mt-2">{action.title}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* 4단: System Footer (기존 유지) */}
      {(() => {
        const emailOk = activeProvider === 'smtp' ? data.systemStatus.smtp.configured : data.systemStatus.resend;
        const emailLabel = activeProvider === 'smtp'
          ? `이메일 SMTP${data.systemStatus.resend ? '/Resend' : ''}`
          : `이메일 Resend${data.systemStatus.smtp.configured ? '/SMTP' : ''}`;
        const checks = [
          { label: 'DB', ok: data.systemStatus.supabase },
          { label: '국세청 API', ok: data.systemStatus.nts_api },
          { label: '심평원 병원 API', ok: data.systemStatus.hira_hospital_api },
          { label: '심평원 약국 API', ok: data.systemStatus.hira_pharmacy_api },
          { label: emailLabel, ok: emailOk },
        ];
        const connected = checks.filter(c => c.ok);
        const disconnected = checks.filter(c => !c.ok);
        const sorted = [...connected, ...disconnected];

        return (
          <div className="mt-auto pt-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="font-mono">{data.systemStatus.version}</span>
                <span>·</span>
                <span>{data.systemStatus.environment}</span>
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

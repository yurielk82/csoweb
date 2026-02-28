'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Upload,
  Link2,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SystemStatus } from '@/types';

// ── Types ──

interface SettlementMonth {
  month: string;
  count: number;
  csoCount: number;
  totalCommission: number;
}

interface UserData {
  business_number: string;
  is_admin: boolean;
  last_login_at?: string | null;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

// ── Helpers ──

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

/** monthKey: "YYYY-MM" 형식 (DB 정산월 포맷) */
function monthKeyToLabel(monthKey: string): string {
  const [year, mm] = monthKey.split('-');
  const month = parseInt(mm, 10);
  return `${year}년 ${month}월`;
}

function getMonthDateRange(monthKey: string): { startDate: string; endDate: string } {
  const [yearStr, mm] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mm, 10);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${yearStr}-${mm}-01`,
    endDate: `${yearStr}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

// ── Quick Actions ──

const quickActions = [
  { href: '/admin/upload', icon: Upload, title: '정산서 업로드', description: '정산서 데이터 업로드', color: 'bg-blue-500' },
  { href: '/admin/members?filter=pending', icon: Users, title: '회원 승인', description: '대기 중인 회원 승인', color: 'bg-green-500' },
  { href: '/admin/integrity', icon: Link2, title: '거래처 매핑', description: 'CSO 관리업체 매칭 상태 검수', color: 'bg-red-500' },
  { href: '/admin/data', icon: Database, title: '데이터 관리', description: '정산 데이터 관리', color: 'bg-cyan-500' },
  { href: '/admin/columns', icon: Columns, title: '컬럼 설정', description: '표시 컬럼 관리', color: 'bg-purple-500' },
  { href: '/admin/mailmerge', icon: MailPlus, title: '메일머지', description: '일괄 이메일 발송', color: 'bg-orange-500' },
  { href: '/admin/emails', icon: Mail, title: '이메일 이력', description: '발송 내역 조회', color: 'bg-pink-500' },
];

// ── Component ──

export default function AdminDashboardPage() {
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${now.getFullYear()}-${String(currentMonthNum).padStart(2, '0')}`;

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  // Data sources
  const [months, setMonths] = useState<SettlementMonth[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [csoBusinessNumbers, setCsoBusinessNumbers] = useState<string[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [emailLoading, setEmailLoading] = useState(false);
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

  // Derived KPI
  const selectedMonthData = months.find((m) => m.month === selectedMonth);
  const csoCount = selectedMonthData?.csoCount ?? 0;
  const totalCommission = selectedMonthData?.totalCommission ?? 0;
  const totalMonths = months.length;

  const isCurrentMonth = selectedMonth === currentMonthKey;
  const firstOfMonth = `${now.getFullYear()}-${String(currentMonthNum).padStart(2, '0')}-01T00:00:00`;
  const accessedCount = isCurrentMonth
    ? allUsers.filter(
        (u) =>
          !u.is_admin &&
          csoBusinessNumbers.includes(u.business_number) &&
          u.last_login_at &&
          u.last_login_at >= firstOfMonth
      ).length
    : null;

  // Fetch email stats for selected month
  const fetchEmailStats = useCallback(async (monthKey: string) => {
    setEmailLoading(true);
    try {
      const { startDate, endDate } = getMonthDateRange(monthKey);
      const res = await fetch(
        `/api/email/logs?start_date=${startDate}&end_date=${endDate}&limit=1`
      );
      const json = await res.json();
      if (json.success && json.data?.stats) {
        setEmailStats(json.data.stats);
      } else {
        setEmailStats(null);
      }
    } catch (error) {
      console.error('Fetch email stats error:', error);
      setEmailStats(null);
    } finally {
      setEmailLoading(false);
    }
  }, []);

  // Fetch CSO business numbers for selected month
  const fetchCsoCompanies = useCallback(async (monthKey: string) => {
    try {
      const res = await fetch(`/api/settlements/cso-companies?month=${monthKey}`);
      const json = await res.json();
      if (json.success) {
        setCsoBusinessNumbers(json.data);
      } else {
        setCsoBusinessNumbers([]);
      }
    } catch (error) {
      console.error('Fetch CSO companies error:', error);
      setCsoBusinessNumbers([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function fetchAll() {
      try {
        const [allUsersRes, statusRes, statsRes, csoRes, pendingRes, integrityRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/system/status'),
          fetch('/api/settlements/stats'),
          fetch(`/api/settlements/cso-companies?month=${currentMonthKey}`),
          fetch('/api/users?pending=true'),
          fetch('/api/admin/cso-matching/integrity'),
        ]);

        const [allUsersData, statusData, statsData, csoData, pendingData, integrityData] = await Promise.all([
          allUsersRes.json(),
          statusRes.json(),
          statsRes.json(),
          csoRes.json(),
          pendingRes.json(),
          integrityRes.json(),
        ]);

        if (allUsersData.success) {
          setAllUsers(allUsersData.data);
        }

        if (statusData.success) {
          setSystemStatus(statusData.data);
        }

        if (statsData.success && statsData.data?.months) {
          setMonths(statsData.data.months);
        }

        if (csoData.success) {
          setCsoBusinessNumbers(csoData.data);
        }

        if (pendingData.success && Array.isArray(pendingData.data)) {
          setPendingCount(pendingData.data.length);
        }

        if (integrityData.success && integrityData.data?.stats) {
          setUnmappedCount(integrityData.data.stats.noCsoMappingCount ?? 0);
        }
      } catch (error) {
        console.error('Fetch stats error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
    fetchEmailStats(currentMonthKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Month change handler
  const handleMonthChange = useCallback(
    (monthKey: string) => {
      setSelectedMonth(monthKey);
      fetchEmailStats(monthKey);
      fetchCsoCompanies(monthKey);
    },
    [fetchEmailStats, fetchCsoCompanies]
  );

  // Month options: settlement months + current month (deduplicated)
  const monthOptions = (() => {
    const keys = new Set(months.map((m) => m.month));
    keys.add(currentMonthKey);
    return Array.from(keys).sort().reverse();
  })();

  const selectedMonthLabel = monthKeyToLabel(selectedMonth);

  const activeProvider = systemStatus.email_provider;

  // 빠른 작업 배지 맵
  const currentMonthUploaded = months.some(m => m.month === currentMonthKey);
  const badgeMap: Record<string, { label: string; variant: 'destructive' | 'secondary' }> = {};

  if (!currentMonthUploaded) {
    badgeMap['/admin/upload'] = { label: '미업로드', variant: 'destructive' };
  }
  if (pendingCount > 0) {
    badgeMap['/admin/members?filter=pending'] = { label: `${pendingCount}건 대기`, variant: 'destructive' };
  }
  if (unmappedCount > 0) {
    badgeMap['/admin/integrity'] = { label: `${unmappedCount}건 미매핑`, variant: 'destructive' };
  }
  if (csoBusinessNumbers.length > 0 && (!emailStats || emailStats.total === 0)) {
    badgeMap['/admin/mailmerge'] = { label: '미발송', variant: 'secondary' };
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">관리자 대시보드</h1>
            <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        {/* KPI 스켈레톤 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
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
        {/* 빠른 작업 스켈레톤 */}
        <div>
          <Skeleton className="h-5 w-20 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-4 w-20 mt-2" />
                  <Skeleton className="h-3 w-28" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] space-y-6">
      {/* Header + Month Select */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
        </div>
        <Select value={selectedMonth} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[140px]">
            <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((key) => (
              <SelectItem key={key} value={key}>
                {monthKeyToLabel(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI 카드 (5개) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* CSO 업체 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CSO 업체</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{csoCount}</div>
            <p className="text-xs text-muted-foreground">{selectedMonthLabel} 정산 업체</p>
          </CardContent>
        </Card>

        {/* 접속 업체 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">접속 업체</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isCurrentMonth ? (
              <>
                <div className="text-2xl font-bold">
                  {accessedCount}
                  <span className="text-base font-normal text-muted-foreground">
                    /{csoBusinessNumbers.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentMonthNum}월 CSO 업체 중 접속
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">&mdash;</div>
                <p className="text-xs text-muted-foreground">당월만 조회 가능</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* 총수수료 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총수수료</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
            <p className="text-xs text-muted-foreground">{selectedMonthLabel} 정산 수수료</p>
          </CardContent>
        </Card>

        {/* 총 정산월 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 정산월</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMonths}개월</div>
            <p className="text-xs text-muted-foreground">업로드된 정산 데이터</p>
          </CardContent>
        </Card>

        {/* 이메일 발송 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">이메일 발송</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {emailLoading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : emailStats ? (
              <>
                <div className="text-2xl font-bold">{emailStats.total}건</div>
                <p className={`text-xs ${emailStats.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {emailStats.failed > 0 ? `실패 ${emailStats.failed}건` : '전체 성공'}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">0건</div>
                <p className="text-xs text-muted-foreground">{selectedMonthLabel} 발송 없음</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 빠른 작업 (v0.22.0 스타일) */}
      <div>
        <h2 className="text-lg font-semibold mb-4">빠른 작업</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickActions.map((action) => {
            const badge = badgeMap[action.href];
            return (
              <Link key={action.href} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${action.color} w-fit`}>
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      {badge && (
                        <Badge variant={badge.variant} className="text-xs">
                          {badge.label}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base mt-2">{action.title}</CardTitle>
                    <CardDescription className="text-sm">{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* System Footer */}
      {(() => {
        const emailOk =
          activeProvider === 'smtp'
            ? systemStatus.smtp.configured
            : systemStatus.resend;
        const emailLabel =
          activeProvider === 'smtp'
            ? `이메일 SMTP${systemStatus.resend ? '/Resend' : ''}`
            : `이메일 Resend${systemStatus.smtp.configured ? '/SMTP' : ''}`;
        const checks = [
          { label: 'DB', ok: systemStatus.supabase },
          { label: '국세청 API', ok: systemStatus.nts_api },
          { label: '심평원 병원 API', ok: systemStatus.hira_hospital_api },
          { label: '심평원 약국 API', ok: systemStatus.hira_pharmacy_api },
          { label: emailLabel, ok: emailOk },
        ];
        const connected = checks.filter((c) => c.ok);
        const disconnected = checks.filter((c) => !c.ok);
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
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      ok ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className={ok ? '' : 'text-red-600'}>{label}</span>
                </span>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-auto px-2 py-1 text-xs text-muted-foreground"
                asChild
              >
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

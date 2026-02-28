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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
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
  { href: '/admin/upload', icon: Upload, title: '정산서 업로드', iconColor: 'glass-icon-blue' },
  { href: '/admin/members?filter=pending', icon: Users, title: '회원 승인', iconColor: 'glass-icon-green' },
  { href: '/admin/integrity', icon: Link2, title: '거래처 매핑', iconColor: 'glass-icon-cyan' },
  { href: '/admin/data', icon: Database, title: '데이터 관리', iconColor: 'glass-icon-purple' },
  { href: '/admin/columns', icon: Columns, title: '컬럼 설정', iconColor: 'glass-icon-orange' },
  { href: '/admin/mailmerge', icon: MailPlus, title: '메일머지', iconColor: 'glass-icon-pink' },
  { href: '/admin/emails', icon: Mail, title: '이메일 이력', iconColor: 'glass-icon-purple' },
];

// ── Component ──

export default function AdminDashboardPage() {
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${now.getFullYear()}-${String(currentMonthNum).padStart(2, '0')}`;

  const [kpiLoaded, setKpiLoaded] = useState(false);
  const [badgesLoaded, setBadgesLoaded] = useState(false);
  const [systemLoaded, setSystemLoaded] = useState(false);
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

  // Initial load — 독립 그룹별 병렬 페칭
  useEffect(() => {
    // 그룹 1: KPI 데이터 (stats + cso-companies + users)
    Promise.all([
      fetch('/api/settlements/stats'),
      fetch(`/api/settlements/cso-companies?month=${currentMonthKey}`),
      fetch('/api/users'),
    ])
      .then(async ([statsRes, csoRes, usersRes]) => {
        const [statsData, csoData, usersData] = await Promise.all([
          statsRes.json(),
          csoRes.json(),
          usersRes.json(),
        ]);
        if (statsData.success && statsData.data?.months) {
          setMonths(statsData.data.months);
        }
        if (csoData.success) {
          setCsoBusinessNumbers(csoData.data);
        }
        if (usersData.success) {
          setAllUsers(usersData.data);
        }
      })
      .catch((error) => console.error('Fetch KPI error:', error))
      .finally(() => setKpiLoaded(true));

    // 그룹 2: 배지 데이터 (pending + integrity)
    Promise.all([
      fetch('/api/users?pending=true'),
      fetch('/api/admin/cso-matching/integrity'),
    ])
      .then(async ([pendingRes, integrityRes]) => {
        const [pendingData, integrityData] = await Promise.all([
          pendingRes.json(),
          integrityRes.json(),
        ]);
        if (pendingData.success && Array.isArray(pendingData.data)) {
          setPendingCount(pendingData.data.length);
        }
        if (integrityData.success && integrityData.data?.stats) {
          setUnmappedCount(integrityData.data.stats.noCsoMappingCount ?? 0);
        }
      })
      .catch((error) => console.error('Fetch badges error:', error))
      .finally(() => setBadgesLoaded(true));

    // 그룹 3: 시스템 상태
    fetch('/api/system/status')
      .then(async (res) => {
        const data = await res.json();
        if (data.success) {
          setSystemStatus(data.data);
        }
      })
      .catch((error) => console.error('Fetch system status error:', error))
      .finally(() => setSystemLoaded(true));

    // 그룹 4: 이메일 (기존 로직 유지)
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

  // 빠른 작업 배지 맵 (배지 데이터 로딩 전에는 빈 맵)
  const badgeMap: Record<string, { label: string; variant: 'secondary' | 'outline' }> = {};

  if (kpiLoaded && badgesLoaded) {
    const currentMonthUploaded = months.some(m => m.month === currentMonthKey);
    if (!currentMonthUploaded) {
      badgeMap['/admin/upload'] = { label: '업로드 필요', variant: 'secondary' };
    }
    if (pendingCount > 0) {
      badgeMap['/admin/members?filter=pending'] = { label: `${pendingCount}`, variant: 'secondary' };
    }
    if (unmappedCount > 0) {
      badgeMap['/admin/integrity'] = { label: `${unmappedCount}`, variant: 'secondary' };
    }
    if (csoBusinessNumbers.length > 0 && (!emailStats || emailStats.total === 0)) {
      badgeMap['/admin/mailmerge'] = { label: '발송 필요', variant: 'outline' };
    }
  }

  return (
    <div className="dashboard-glass-bg">
      <div className="dashboard-orb dashboard-orb-1" aria-hidden="true" />
      <div className="dashboard-orb dashboard-orb-2" aria-hidden="true" />
      <div className="relative z-10 flex flex-col flex-1 space-y-6">
        {/* Header + Month Select */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">관리자 대시보드</h1>
            <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
          </div>
          {kpiLoaded ? (
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-36 glass-select">
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
          ) : (
            <Skeleton className="h-9 w-36 rounded-xl" />
          )}
        </div>

        {/* Bento Grid — 5col */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Row 1: CSO 업체 (2col) */}
          <div className="glass-kpi-card sm:col-span-2">
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium">CSO 업체</span>
              <span className="glass-icon glass-icon-teal">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            {kpiLoaded ? (
              <>
                <div className="text-2xl font-bold">{csoCount}</div>
                <p className="text-xs text-muted-foreground">{selectedMonthLabel} 정산 업체</p>
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-28" />
              </>
            )}
          </div>

          {/* Row 1: 접속 업체 (1col) */}
          <div className="glass-kpi-card">
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium">접속 업체</span>
              <span className="glass-icon glass-icon-green">
                <Users className="h-4 w-4" />
              </span>
            </div>
            {!kpiLoaded ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : isCurrentMonth ? (
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
          </div>

          {/* Row 1: 총 정산월 (1col) */}
          <div className="glass-kpi-card">
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium">총 정산월</span>
              <span className="glass-icon glass-icon-purple">
                <Database className="h-4 w-4" />
              </span>
            </div>
            {kpiLoaded ? (
              <>
                <div className="text-2xl font-bold">{totalMonths}</div>
                <p className="text-xs text-muted-foreground">업로드된 정산 데이터</p>
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-28" />
              </>
            )}
          </div>

          {/* Row 1: 이메일 발송 (1col) */}
          <div className="glass-kpi-card">
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium">이메일 발송</span>
              <span className="glass-icon glass-icon-pink">
                <Mail className="h-4 w-4" />
              </span>
            </div>
            {emailLoading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : emailStats ? (
              <>
                <div className="text-2xl font-bold">{emailStats.total}</div>
                <p className={`text-xs ${emailStats.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {emailStats.failed > 0 ? `${selectedMonthLabel} 실패 ${emailStats.failed}` : `${selectedMonthLabel} 전체 성공`}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">0</div>
                <p className="text-xs text-muted-foreground">{selectedMonthLabel} 발송 없음</p>
              </>
            )}
          </div>

          {/* Row 2: 총수수료 (2col) */}
          <div className="glass-kpi-card sm:col-span-2">
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium">총수수료</span>
              <span className="glass-icon glass-icon-orange">
                <Banknote className="h-4 w-4" />
              </span>
            </div>
            {kpiLoaded ? (
              <>
                <div className="text-2xl font-bold">{formatNumber(totalCommission)}</div>
                <p className="text-xs text-muted-foreground">{selectedMonthLabel} 정산 수수료</p>
              </>
            ) : (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-28" />
              </>
            )}
          </div>

          {/* Row 2: 빠른 작업 (3col) */}
          <div className="glass-kpi-card sm:col-span-3">
            <div className="pb-3">
              <span className="text-sm font-medium">빠른 작업</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickActions.map((action) => {
                const badge = badgeMap[action.href];
                return (
                  <Link key={action.href} href={action.href}>
                    <div className="glass-action-card">
                      <span className={`glass-icon ${action.iconColor}`}>
                        <action.icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-sm font-medium truncate">
                        {action.title}
                      </span>
                      {badge && (
                        <Badge variant={badge.variant} className="text-xs shrink-0">
                          {badge.label}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Footer */}
        <div className="dashboard-glass-footer text-xs text-muted-foreground">
          <div className="flex items-center gap-3 flex-wrap">
            {systemLoaded ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono">{systemStatus.version}</span>
                  <span>·</span>
                  <span>{systemStatus.environment}</span>
                </span>
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
                  return [...connected, ...disconnected].map(({ label, ok }) => (
                    <span key={label} className="flex items-center gap-1">
                      <span
                        className={ok ? 'dashboard-status-dot-ok' : 'dashboard-status-dot-fail'}
                      />
                      <span className={ok ? '' : 'text-destructive'}>{label}</span>
                    </span>
                  ));
                })()}
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
              </>
            ) : (
              <>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

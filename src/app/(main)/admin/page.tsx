'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Columns,
  Mail,
  MailPlus,
  Database,
  ArrowRight,
  Upload,
  Link2,
  Calendar,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const MonthlyStatsChart = dynamic(
  () => import('@/components/shared/MonthlyStatsChart'),
  { ssr: false, loading: () => <Skeleton className="h-[300px] rounded-xl" /> }
);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SystemStatus } from '@/types';
import type { SettlementUpload } from '@/domain/settlement/types';
import type { EmailMonthlyStat } from '@/domain/email/types';

// ── Types ──

interface SettlementMonth {
  month: string;
  count: number;
  csoCount: number;
  totalQuantity: number;
  totalAmount: number;
  totalCommission: number;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

// ── Helpers ──

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
  { href: '/admin/upload', icon: Upload, title: '정산서 업로드', description: '정산서 데이터 업로드', iconColor: 'glass-icon-blue' },
  { href: '/admin/members?filter=pending', icon: Users, title: '회원 승인', description: '대기 중인 회원 승인', iconColor: 'glass-icon-green' },
  { href: '/admin/integrity', icon: Link2, title: '거래처 매핑', description: 'CSO 관리업체 매칭 상태 검수', iconColor: 'glass-icon-cyan' },
  { href: '/admin/data', icon: Database, title: '데이터 관리', description: '정산 데이터 관리', iconColor: 'glass-icon-purple' },
  { href: '/admin/columns', icon: Columns, title: '컬럼 설정', description: '표시 컬럼 관리', iconColor: 'glass-icon-orange' },
  { href: '/admin/mailmerge', icon: MailPlus, title: '메일머지', description: '일괄 이메일 발송', iconColor: 'glass-icon-pink' },
  { href: '/admin/emails', icon: Mail, title: '이메일 이력', description: '발송 내역 조회', iconColor: 'glass-icon-purple' },
];

// ── Component ──

export default function AdminDashboardPage() {
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${now.getFullYear()}-${String(currentMonthNum).padStart(2, '0')}`;

  const [kpiLoaded, setKpiLoaded] = useState(false);
  const [badgesLoaded, setBadgesLoaded] = useState(false);
  const [systemLoaded, setSystemLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');

  // Data sources
  const [months, setMonths] = useState<SettlementMonth[]>([]);
  const [allUsers, setAllUsers] = useState<{ business_number: string; is_admin: boolean }[]>([]);
  const [csoBusinessNumbers, setCsoBusinessNumbers] = useState<string[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [unmappedCount, setUnmappedCount] = useState(0);
  // 차트용 추가 데이터
  const [allSnapshots, setAllSnapshots] = useState<SettlementUpload[]>([]);
  const [emailMonthlyStats, setEmailMonthlyStats] = useState<EmailMonthlyStat[]>([]);

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

  // 관리자 business_number를 CSO 업체 목록에서 제외
  const adminBusinessNumbers = new Set(
    allUsers.filter(u => u.is_admin).map(u => u.business_number)
  );
  const filteredCsoBusinessNumbers = csoBusinessNumbers.filter(
    bn => !adminBusinessNumbers.has(bn)
  );

  // 차트 데이터: 정산 통계 + 접속업체 + 이메일 발송 병합
  const enrichedChartData = useMemo(() => {
    const snapshotMap = new Map(
      allSnapshots.map(s => [s.settlement_month, s.accessed_business_numbers?.length ?? 0])
    );
    const emailMap = new Map(
      emailMonthlyStats.map(e => [e.month, e.total])
    );

    return months.map(m => ({
      ...m,
      accessedCount: snapshotMap.get(m.month) ?? 0,
      emailSentCount: emailMap.get(m.month) ?? 0,
    }));
  }, [months, allSnapshots, emailMonthlyStats]);

  // Fetch email stats for selected month (배지용)
  const fetchEmailStats = useCallback(async (monthKey: string) => {
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
          const monthsList: SettlementMonth[] = statsData.data.months;
          setMonths(monthsList);

          const currentMonthExists = monthsList.some(m => m.month === currentMonthKey);
          const defaultMonth = currentMonthExists
            ? currentMonthKey
            : monthsList.length > 0
              ? monthsList[0].month
              : currentMonthKey;
          setSelectedMonth(defaultMonth);

          if (defaultMonth !== currentMonthKey) {
            fetchCsoCompanies(defaultMonth);
          }
        } else {
          setSelectedMonth(currentMonthKey);
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
          const count = integrityData.data.stats.no_cso_match_settlement ?? 0;
          setUnmappedCount(count);
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

    // 그룹 4: 이메일 배지용
    fetchEmailStats(currentMonthKey);

    // 그룹 5: 차트용 추가 데이터 (전체 스냅샷 + 이메일 월별 통계)
    Promise.all([
      fetch('/api/settlements/uploads'),
      fetch('/api/email/monthly-stats'),
    ])
      .then(async ([snapshotsRes, emailMonthlyRes]) => {
        const [snapshotsData, emailMonthlyData] = await Promise.all([
          snapshotsRes.json(),
          emailMonthlyRes.json(),
        ]);
        if (snapshotsData.success && Array.isArray(snapshotsData.data)) {
          setAllSnapshots(snapshotsData.data);
        }
        if (emailMonthlyData.success && Array.isArray(emailMonthlyData.data)) {
          setEmailMonthlyStats(emailMonthlyData.data);
        }
      })
      .catch((error) => console.error('Fetch chart extra data error:', error));

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

  const activeProvider = systemStatus.email_provider;

  // 빠른 작업 배지 맵
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
    if (filteredCsoBusinessNumbers.length > 0 && (!emailStats || emailStats.total === 0)) {
      badgeMap['/admin/mailmerge'] = { label: '발송 필요', variant: 'outline' };
    }
  }

  if (emailStats && emailStats.failed > 0) {
    badgeMap['/admin/emails'] = { label: `실패 ${emailStats.failed}`, variant: 'secondary' };
  }

  return (
    <div className="flex flex-col flex-1 space-y-6">
        {/* Header + Month Select */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">관리자 대시보드</h1>
            <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
          </div>
          {kpiLoaded ? (
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-36">
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

        {/* 월별 통계 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">월별 통계</h2>
          {kpiLoaded ? (
            <MonthlyStatsChart data={enrichedChartData} />
          ) : (
            <Skeleton className="h-[300px] rounded-xl" />
          )}
        </div>

        {/* 빠른 작업 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">빠른 작업</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const badge = badgeMap[action.href];
              return (
                <Link key={action.href} href={action.href}>
                  <div className="glass-action-card">
                    <div className="flex items-center justify-between">
                      <div className={`glass-icon ${action.iconColor}`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      {badge && (
                        <Badge variant={badge.variant} className="text-xs">
                          {badge.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-base font-semibold mt-3">{action.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{action.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      {/* System Footer */}
      <div className="mt-auto pt-6 border-t text-xs text-muted-foreground">
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
  );
}

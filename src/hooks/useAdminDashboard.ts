'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SystemStatus } from '@/types';
import type { SettlementUpload } from '@/domain/settlement/types';
import type { EmailMonthlyStat } from '@/domain/email/types';

// ── Types ──

export interface SettlementMonth {
  month: string;
  count: number;
  csoCount: number;
  totalQuantity: number;
  totalAmount: number;
  totalCommission: number;
}

export interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface EnrichedMonthData extends SettlementMonth {
  accessedCount: number;
  emailSentCount: number;
}

export interface AdminDashboardData {
  kpiLoaded: boolean;
  badgesLoaded: boolean;
  systemLoaded: boolean;
  selectedMonth: string;
  handleMonthChange: (month: string) => void;
  monthOptions: string[];
  months: SettlementMonth[];
  enrichedChartData: EnrichedMonthData[];
  filteredCsoBusinessNumbers: string[];
  emailStats: EmailStats | null;
  badgeMap: Record<string, { label: string; variant: 'secondary' | 'outline' }>;
  pendingCount: number;
  unmappedCount: number;
  allSnapshots: SettlementUpload[];
  emailMonthlyStats: EmailMonthlyStat[];
  systemStatus: SystemStatus;
  activeProvider: string;
  currentMonthKey: string;
}

// ── Helpers ──

export function monthKeyToLabel(monthKey: string): string {
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

// ── Hook ──

export function useAdminDashboard(): AdminDashboardData {
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

  return {
    kpiLoaded,
    badgesLoaded,
    systemLoaded,
    selectedMonth,
    handleMonthChange,
    monthOptions,
    months,
    enrichedChartData,
    filteredCsoBusinessNumbers,
    emailStats,
    badgeMap,
    pendingCount,
    unmappedCount,
    allSnapshots,
    emailMonthlyStats,
    systemStatus,
    activeProvider,
    currentMonthKey,
  };
}

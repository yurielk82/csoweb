'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SystemStatus } from '@/types';
import type { SettlementUpload } from '@/domain/settlement/types';
import type { EmailMonthlyStat } from '@/domain/email/types';
import { API_ROUTES } from '@/constants/api';
import { fetchWithTimeout } from '@/lib/fetch';

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
  fetchError: boolean;
  selectedMonth: string;
  months: SettlementMonth[];
  enrichedChartData: EnrichedMonthData[];
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
  const [fetchError, setFetchError] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');

  // Data sources
  const [months, setMonths] = useState<SettlementMonth[]>([]);
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
      const res = await fetchWithTimeout(
        `${API_ROUTES.EMAIL.LOGS}?start_date=${startDate}&end_date=${endDate}&limit=1`
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

  // Initial load — 독립 그룹별 병렬 페칭
  useEffect(() => {
    // 그룹 1: KPI 데이터 (stats)
    fetchWithTimeout(API_ROUTES.SETTLEMENTS.STATS)
      .then(async (statsRes) => {
        const statsData = await statsRes.json();
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
        } else {
          setSelectedMonth(currentMonthKey);
        }
      })
      .catch((error) => { console.error('Fetch KPI error:', error); setFetchError(true); })
      .finally(() => setKpiLoaded(true));

    // 그룹 2: 배지 데이터 (pending + integrity)
    Promise.all([
      fetchWithTimeout(`${API_ROUTES.USERS.LIST}?pending=true`),
      fetchWithTimeout(API_ROUTES.ADMIN.CSO_MATCHING.INTEGRITY),
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
      .catch((error) => { console.error('Fetch badges error:', error); setFetchError(true); })
      .finally(() => setBadgesLoaded(true));

    // 그룹 3: 시스템 상태
    fetchWithTimeout(API_ROUTES.SYSTEM.STATUS)
      .then(async (res) => {
        const data = await res.json();
        if (data.success) {
          setSystemStatus(data.data);
        }
      })
      .catch((error) => { console.error('Fetch system status error:', error); setFetchError(true); })
      .finally(() => setSystemLoaded(true));

    // 그룹 4: 이메일 배지용
    fetchEmailStats(currentMonthKey);

    // 그룹 5: 차트용 추가 데이터 (전체 스냅샷 + 이메일 월별 통계)
    Promise.all([
      fetchWithTimeout(API_ROUTES.SETTLEMENTS.UPLOADS),
      fetchWithTimeout(API_ROUTES.EMAIL.MONTHLY_STATS),
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
      .catch((error) => { console.error('Fetch chart extra data error:', error); setFetchError(true); });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const selectedCsoCount = months.find(m => m.month === selectedMonth)?.csoCount ?? 0;
    if (selectedCsoCount > 0 && (!emailStats || emailStats.total === 0)) {
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
    fetchError,
    selectedMonth,
    months,
    enrichedChartData,
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

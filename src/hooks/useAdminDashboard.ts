'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SystemStatus } from '@/types';
import type { SettlementUpload } from '@/domain/settlement/types';
import type { EmailMonthlyStat } from '@/domain/email/types';
import { API_ROUTES } from '@/constants/api';
import { fetchWithTimeout } from '@/lib/fetch';
import type {
  SettlementMonth, EmailStats, EnrichedMonthData, AdminDashboardData,
} from './useAdminDashboard.types';

export type { SettlementMonth, EmailStats, EnrichedMonthData, AdminDashboardData };

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

const DEFAULT_SYSTEM_STATUS: SystemStatus = {
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
};

// ── Fetchers ──

interface FetchKPIOptions {
  currentMonthKey: string;
  setMonths: (v: SettlementMonth[]) => void;
  setSelectedMonth: (v: string) => void;
  setFetchError: (v: boolean) => void;
  setKpiLoaded: (v: boolean) => void;
}

async function fetchKPI({
  currentMonthKey, setMonths, setSelectedMonth, setFetchError, setKpiLoaded,
}: FetchKPIOptions) {
  try {
    const statsRes = await fetchWithTimeout(API_ROUTES.SETTLEMENTS.STATS);
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
  } catch (error) {
    console.error('Fetch KPI error:', error);
    setFetchError(true);
  } finally {
    setKpiLoaded(true);
  }
}

async function fetchBadges(
  setPendingCount: (v: number) => void,
  setUnmappedCount: (v: number) => void,
  setFetchError: (v: boolean) => void,
  setBadgesLoaded: (v: boolean) => void,
) {
  try {
    const [pendingRes, integrityRes] = await Promise.all([
      fetchWithTimeout(`${API_ROUTES.USERS.LIST}?pending=true`),
      fetchWithTimeout(API_ROUTES.ADMIN.CSO_MATCHING.INTEGRITY),
    ]);
    const [pendingData, integrityData] = await Promise.all([
      pendingRes.json(),
      integrityRes.json(),
    ]);
    if (pendingData.success && Array.isArray(pendingData.data)) {
      setPendingCount(pendingData.data.length);
    }
    if (integrityData.success && integrityData.data?.stats) {
      setUnmappedCount(integrityData.data.stats.no_cso_match_settlement ?? 0);
    }
  } catch (error) {
    console.error('Fetch badges error:', error);
    setFetchError(true);
  } finally {
    setBadgesLoaded(true);
  }
}

async function fetchChartExtras(
  setAllSnapshots: (v: SettlementUpload[]) => void,
  setEmailMonthlyStats: (v: EmailMonthlyStat[]) => void,
  setFetchError: (v: boolean) => void,
) {
  try {
    const [snapshotsRes, emailMonthlyRes] = await Promise.all([
      fetchWithTimeout(API_ROUTES.SETTLEMENTS.UPLOADS),
      fetchWithTimeout(API_ROUTES.EMAIL.MONTHLY_STATS),
    ]);
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
  } catch (error) {
    console.error('Fetch chart extra data error:', error);
    setFetchError(true);
  }
}

interface BuildBadgeMapOptions {
  kpiLoaded: boolean;
  badgesLoaded: boolean;
  months: SettlementMonth[];
  currentMonthKey: string;
  pendingCount: number;
  unmappedCount: number;
  selectedMonth: string;
  emailStats: EmailStats | null;
}

function buildBadgeMap({
  kpiLoaded, badgesLoaded, months, currentMonthKey, pendingCount, unmappedCount, selectedMonth, emailStats,
}: BuildBadgeMapOptions): Record<string, { label: string; variant: 'secondary' | 'outline' }> {
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

  return badgeMap;
}

// ── 시스템 상태 조회 ──

async function fetchSystemStatus(
  setSystemStatus: (v: SystemStatus) => void,
  setFetchError: (v: boolean) => void,
  setSystemLoaded: (v: boolean) => void,
) {
  try {
    const res = await fetchWithTimeout(API_ROUTES.SYSTEM.STATUS);
    const data = await res.json();
    if (data.success) setSystemStatus(data.data);
  } catch (error) {
    console.error('Fetch system status error:', error);
    setFetchError(true);
  } finally {
    setSystemLoaded(true);
  }
}

// ── 차트 데이터 enrichment ──

function enrichChartData(
  months: SettlementMonth[],
  allSnapshots: SettlementUpload[],
  emailMonthlyStats: EmailMonthlyStat[],
): EnrichedMonthData[] {
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
}

// ── Hook ──

export function useAdminDashboard(): AdminDashboardData {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [kpiLoaded, setKpiLoaded] = useState(false);
  const [badgesLoaded, setBadgesLoaded] = useState(false);
  const [systemLoaded, setSystemLoaded] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');

  const [months, setMonths] = useState<SettlementMonth[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [allSnapshots, setAllSnapshots] = useState<SettlementUpload[]>([]);
  const [emailMonthlyStats, setEmailMonthlyStats] = useState<EmailMonthlyStat[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(DEFAULT_SYSTEM_STATUS);

  const enrichedChartData = useMemo(
    () => enrichChartData(months, allSnapshots, emailMonthlyStats),
    [months, allSnapshots, emailMonthlyStats],
  );

  const fetchEmailStatsForMonth = useCallback(async (monthKey: string) => {
    try {
      const { startDate, endDate } = getMonthDateRange(monthKey);
      const res = await fetchWithTimeout(
        `${API_ROUTES.EMAIL.LOGS}?start_date=${startDate}&end_date=${endDate}&limit=1`
      );
      const json = await res.json();
      setEmailStats(json.success && json.data?.stats ? json.data.stats : null);
    } catch (error) {
      console.error('Fetch email stats error:', error);
      setEmailStats(null);
    }
  }, []);

  useEffect(() => {
    fetchKPI({ currentMonthKey, setMonths, setSelectedMonth, setFetchError, setKpiLoaded });
    fetchBadges(setPendingCount, setUnmappedCount, setFetchError, setBadgesLoaded);
    fetchChartExtras(setAllSnapshots, setEmailMonthlyStats, setFetchError);
    fetchEmailStatsForMonth(currentMonthKey);
    fetchSystemStatus(setSystemStatus, setFetchError, setSystemLoaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badgeMap = buildBadgeMap({
    kpiLoaded, badgesLoaded, months, currentMonthKey,
    pendingCount, unmappedCount, selectedMonth, emailStats,
  });

  return {
    kpiLoaded, badgesLoaded, systemLoaded, fetchError, selectedMonth,
    months, enrichedChartData, emailStats, badgeMap,
    pendingCount, unmappedCount, allSnapshots, emailMonthlyStats,
    systemStatus, activeProvider: systemStatus.email_provider, currentMonthKey,
  };
}

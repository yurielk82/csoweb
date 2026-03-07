import type { SystemStatus } from '@/types';
import type { SettlementUpload } from '@/domain/settlement/types';
import type { EmailMonthlyStat } from '@/domain/email/types';

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

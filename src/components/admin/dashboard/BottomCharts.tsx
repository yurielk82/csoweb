'use client';

import { AccessRateChart } from '@/components/admin/dashboard/AccessRateChart';
import { AvgCommissionChart } from '@/components/admin/dashboard/AvgCommissionChart';
import { CsoCountChart } from '@/components/admin/dashboard/CsoCountChart';
import type { SettlementMonth } from '@/hooks/useAdminDashboard';

interface AccessRateDatum {
  month: string;
  csoCount: number;
  accessedCount: number;
}

interface BottomChartsProps {
  accessRateData: AccessRateDatum[];
  months: SettlementMonth[];
}

export function BottomCharts({ accessRateData, months }: BottomChartsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <AccessRateChart data={accessRateData} />
      <AvgCommissionChart data={months} />
      <CsoCountChart data={months} />
    </div>
  );
}

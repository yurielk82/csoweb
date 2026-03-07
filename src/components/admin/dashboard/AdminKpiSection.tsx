'use client';

import { Calculator, Building2, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/admin/dashboard/KpiCard';
import type { DeltaResult } from '@/lib/dashboard-utils';

interface AdminKpiSectionProps {
  loaded: boolean;
  commissionLabel: string;
  commissionDelta: DeltaResult | null;
  csoCount: string;
  csoDelta: DeltaResult | null;
  accessRate: number;
  accessedCount: number;
  totalCsoCount: number;
}

export function AdminKpiSection({
  loaded,
  commissionLabel,
  commissionDelta,
  csoCount,
  csoDelta,
  accessRate,
  accessedCount,
  totalCsoCount,
}: AdminKpiSectionProps) {
  if (!loaded) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard
        title="수수료 총액"
        value={commissionLabel}
        suffix="원"
        icon={Calculator}
        iconColor="tds-icon-blue"
        delta={commissionDelta}
        emphasis
      />
      <KpiCard
        title="CSO 업체"
        value={csoCount}
        suffix="개"
        icon={Building2}
        iconColor="tds-icon-cyan"
        delta={csoDelta}
      />
      <KpiCard
        title="접속률"
        value={`${accessRate}`}
        suffix="%"
        icon={Activity}
        iconColor="tds-icon-green"
        delta={null}
        sub={`${accessedCount} / ${totalCsoCount}`}
      />
    </div>
  );
}

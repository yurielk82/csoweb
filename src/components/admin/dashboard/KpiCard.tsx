'use client';

import { memo } from 'react';
import { formatDelta, getDeltaColor } from '@/lib/dashboard-utils';
import type { DeltaResult } from '@/lib/dashboard-utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  suffix?: string;
  icon: LucideIcon;
  iconColor: string;
  delta: DeltaResult | null;
  emphasis?: boolean;
  sub?: string;
  subColor?: string;
}

export const KpiCard = memo(function KpiCard({
  title,
  value,
  suffix,
  icon: Icon,
  iconColor,
  delta,
  emphasis,
  sub,
  subColor,
}: KpiCardProps) {
  return (
    <div className={`glass-kpi-card py-5 px-6 ${emphasis ? 'border-primary/20' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        {delta?.percent != null && (
          <span className={`text-sm font-medium ${getDeltaColor(delta.percent)}`}>
            {formatDelta(delta.percent)}
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold font-mono tabular-nums ${emphasis ? 'text-primary' : ''}`}>
        {value}
        {suffix && <span className="text-base font-normal ml-0.5">{suffix}</span>}
      </p>
      {sub && (
        <p className={`text-sm mt-1 ${subColor || 'text-muted-foreground'}`}>{sub}</p>
      )}
    </div>
  );
});

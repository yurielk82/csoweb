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
    <div className={`glass-kpi-card ${emphasis ? 'border-primary/20' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        {delta?.percent != null && (
          <span className={`text-xs font-medium ${getDeltaColor(delta.percent)}`}>
            {formatDelta(delta.percent)}
          </span>
        )}
      </div>
      <p className={`text-xl font-bold font-mono tabular-nums ${emphasis ? 'text-primary' : ''}`}>
        {value}
        {suffix && <span className="text-sm font-normal ml-0.5">{suffix}</span>}
      </p>
      {sub && (
        <p className={`text-xs mt-0.5 ${subColor || 'text-muted-foreground'}`}>{sub}</p>
      )}
    </div>
  );
});

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, FileText, CheckCircle2, UserX, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntegrityStats, FilterStatus } from './types';
import type { LucideIcon } from 'lucide-react';

interface IntegrityStatsCardsProps {
  stats: IntegrityStats;
  filterStatus: FilterStatus;
  setScope: (v: 'all' | 'settlement') => void;
  setFilterStatus: (v: FilterStatus) => void;
}

interface StatCardConfig {
  key: FilterStatus;
  label: string;
  icon: LucideIcon;
  color: string;      // border/bg 색상 접두사 (빈 문자열이면 기본)
  ringColor: string;   // ring 색상
  getValue: (stats: IntegrityStats) => number;
  onClick: (setScope: IntegrityStatsCardsProps['setScope'], setFilterStatus: IntegrityStatsCardsProps['setFilterStatus']) => void;
}

const STAT_CARDS: StatCardConfig[] = [
  {
    key: 'all', label: '전체', icon: Database,
    color: '', ringColor: 'ring-gray-500',
    getValue: (s) => s.total,
    onClick: (setScope, setFilter) => { setScope('all'); setFilter('all'); },
  },
  {
    key: 'settlement', label: '정산 대상', icon: FileText,
    color: 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400',
    ringColor: 'ring-indigo-500',
    getValue: (s) => s.settlement,
    onClick: (setScope, setFilter) => { setScope('settlement'); setFilter('settlement'); },
  },
  {
    key: 'complete', label: '처리 완료', icon: CheckCircle2,
    color: 'border-green-200 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-400',
    ringColor: 'ring-green-500',
    getValue: (s) => s.complete,
    onClick: (_, setFilter) => setFilter('complete'),
  },
  {
    key: 'not_registered', label: '미가입', icon: UserX,
    color: 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
    ringColor: 'ring-amber-500',
    getValue: (s) => s.notRegistered,
    onClick: (_, setFilter) => setFilter('not_registered'),
  },
  {
    key: 'no_cso', label: 'CSO 미매핑', icon: CircleAlert,
    color: 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
    ringColor: 'ring-amber-500',
    getValue: (s) => s.noCso,
    onClick: (_, setFilter) => setFilter('no_cso'),
  },
  {
    key: 'unprocessed', label: '미가입+미매핑', icon: CircleAlert,
    color: 'border-red-200 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400',
    ringColor: 'ring-red-500',
    getValue: (s) => s.unprocessed,
    onClick: (_, setFilter) => setFilter('unprocessed'),
  },
];

export function IntegrityStatsCards({ stats, filterStatus, setScope, setFilterStatus }: IntegrityStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {STAT_CARDS.map((cfg) => (
        <StatCard
          key={cfg.key}
          config={cfg}
          value={cfg.getValue(stats)}
          isActive={filterStatus === cfg.key}
          onClick={() => cfg.onClick(setScope, setFilterStatus)}
        />
      ))}
    </div>
  );
}

interface StatCardProps {
  config: StatCardConfig;
  value: number;
  isActive: boolean;
  onClick: () => void;
}

function StatCard({ config, value, isActive, onClick }: StatCardProps) {
  const Icon = config.icon;
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        config.color,
        isActive && `ring-2 ${config.ringColor}`,
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          <Icon className="h-4 w-4" />
          {config.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

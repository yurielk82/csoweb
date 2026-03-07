'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, FileText, CheckCircle2, UserX, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntegrityStats, FilterStatus } from './types';

interface IntegrityStatsCardsProps {
  stats: IntegrityStats;
  filterStatus: FilterStatus;
  setScope: (v: 'all' | 'settlement') => void;
  setFilterStatus: (v: FilterStatus) => void;
}

export function IntegrityStatsCards({ stats, filterStatus, setScope, setFilterStatus }: IntegrityStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* 전체 */}
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          filterStatus === 'all' && "ring-2 ring-gray-500"
        )}
        onClick={() => { setScope('all'); setFilterStatus('all'); }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Database className="h-4 w-4" />
            전체
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      {/* 정산 대상 */}
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20",
          filterStatus === 'settlement' && "ring-2 ring-indigo-500"
        )}
        onClick={() => { setScope('settlement'); setFilterStatus('settlement'); }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
            <FileText className="h-4 w-4" />
            정산 대상
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{stats.settlement}</div>
        </CardContent>
      </Card>

      {/* 처리 완료 */}
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md border-green-200 bg-green-50/50 dark:bg-green-950/20",
          filterStatus === 'complete' && "ring-2 ring-green-500"
        )}
        onClick={() => setFilterStatus('complete')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            처리 완료
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.complete}</div>
        </CardContent>
      </Card>

      {/* 미가입 */}
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md border-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
          filterStatus === 'not_registered' && "ring-2 ring-amber-500"
        )}
        onClick={() => setFilterStatus('not_registered')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <UserX className="h-4 w-4" />
            미가입
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.notRegistered}</div>
        </CardContent>
      </Card>

      {/* CSO 미매핑 */}
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md border-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
          filterStatus === 'no_cso' && "ring-2 ring-amber-500"
        )}
        onClick={() => setFilterStatus('no_cso')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <CircleAlert className="h-4 w-4" />
            CSO 미매핑
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.noCso}</div>
        </CardContent>
      </Card>

      {/* 미가입+미매핑 */}
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md border-red-200 bg-red-50/50 dark:bg-red-950/20",
          filterStatus === 'unprocessed' && "ring-2 ring-red-500"
        )}
        onClick={() => setFilterStatus('unprocessed')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
            <CircleAlert className="h-4 w-4" />
            미가입+미매핑
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.unprocessed}</div>
        </CardContent>
      </Card>
    </div>
  );
}

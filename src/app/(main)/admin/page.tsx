'use client';

import { Activity, BarChart3, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminDashboard, monthKeyToLabel } from '@/hooks/useAdminDashboard';
import { OperationsTab } from '@/components/admin/dashboard/OperationsTab';
import { AnalyticsTab } from '@/components/admin/dashboard/AnalyticsTab';

export default function AdminDashboardPage() {
  const data = useAdminDashboard();

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* Header + Month Select */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
        </div>
        {data.kpiLoaded ? (
          <Select value={data.selectedMonth} onValueChange={data.handleMonthChange}>
            <SelectTrigger className="w-36">
              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.monthOptions.map((key) => (
                <SelectItem key={key} value={key}>
                  {monthKeyToLabel(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Skeleton className="h-9 w-36 rounded-xl" />
        )}
      </div>

      {/* 탭 */}
      <Tabs defaultValue="operations" className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="operations" className="gap-1.5">
            <Activity className="h-4 w-4" />
            운영 현황
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            정산 분석
          </TabsTrigger>
        </TabsList>
        <TabsContent value="operations" className="flex-1 space-y-6">
          <OperationsTab data={data} />
        </TabsContent>
        <TabsContent value="analytics" className="flex-1 space-y-6">
          <AnalyticsTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

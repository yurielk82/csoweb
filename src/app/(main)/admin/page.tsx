'use client';

import { Activity, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { OperationsTab } from '@/components/admin/dashboard/OperationsTab';
import { AnalyticsTab } from '@/components/admin/dashboard/AnalyticsTab';

export default function AdminDashboardPage() {
  const data = useAdminDashboard();

  return (
    <div className="flex flex-col flex-1 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">CSO 정산서 포털 관리</p>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="operations" className="flex-1 flex flex-col">
        <TabsList className="w-full h-12 p-1.5 rounded-xl bg-muted/40 border border-border/50">
          <TabsTrigger
            value="operations"
            className="flex-1 gap-2 rounded-lg font-semibold transition-all data-[state=active]:shadow-sm"
          >
            <Activity className="h-4 w-4" />
            운영 현황
            <span className="text-xs text-muted-foreground font-normal ml-0.5">당월</span>
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex-1 gap-2 rounded-lg font-semibold transition-all data-[state=active]:shadow-sm"
          >
            <BarChart3 className="h-4 w-4" />
            정산 분석
            <span className="text-xs text-muted-foreground font-normal ml-0.5">1년</span>
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

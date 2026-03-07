'use client';

import { Activity, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { OperationsTab } from '@/components/admin/dashboard/OperationsTab';
import { AnalyticsTab } from '@/components/admin/dashboard/AnalyticsTab';

export default function AdminDashboardPage() {
  const data = useAdminDashboard();

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="operations">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">관리자 대시보드</h1>
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="operations" className="gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                운영 현황
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                정산 분석
              </TabsTrigger>
            </TabsList>
            {data.systemLoaded && (
              <span className="text-xs text-muted-foreground font-mono">
                {data.systemStatus.version} · {data.systemStatus.environment}
              </span>
            )}
          </div>
        </div>

        <TabsContent value="operations">
          <OperationsTab data={data} />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

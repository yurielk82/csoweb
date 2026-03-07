'use client';

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

      <OperationsTab data={data} />
      <AnalyticsTab data={data} />
    </div>
  );
}

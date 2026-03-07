'use client';

import { Monitor, Loader2 } from 'lucide-react';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import {
  AppInfoCard,
  DeployCard,
  DatabaseCard,
  ExternalApiCard,
  AuthCard,
  EmailServiceCard,
} from '@/components/admin/system/SystemCards';

export default function SystemInfoPage() {
  const { loading, status } = useSystemStatus();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            시스템 정보
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </h1>
          <p className="text-muted-foreground">시스템 구성 및 연결 상태를 확인합니다.</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            시스템 정보
          </h1>
          <p className="text-sm text-red-600">시스템 상태를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Monitor className="h-6 w-6" />
          시스템 정보
        </h1>
        <p className="text-muted-foreground">시스템 구성 및 연결 상태를 확인합니다. (읽기전용)</p>
      </div>

      <AppInfoCard status={status} />
      <DeployCard status={status} />
      <DatabaseCard status={status} />
      <ExternalApiCard status={status} />
      <AuthCard status={status} />
      <EmailServiceCard status={status} />
    </div>
  );
}

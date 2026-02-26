import { SettlementSkeleton } from '@/components/settlement/SettlementSkeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <SettlementSkeleton />
    </div>
  );
}

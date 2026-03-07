import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

interface EmailStatsCardsProps {
  stats: EmailStats;
}

export function EmailStatsCards({ stats }: EmailStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>전체</CardDescription>
          <CardTitle className="text-2xl">{stats.total}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>발송 성공</CardDescription>
          <CardTitle className="text-2xl text-green-600">{stats.sent}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>발송 실패</CardDescription>
          <CardTitle className="text-2xl text-red-600">{stats.failed}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>대기중</CardDescription>
          <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-12 bg-muted animate-pulse rounded" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded mt-1" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

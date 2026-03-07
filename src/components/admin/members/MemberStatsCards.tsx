import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FilterType } from '@/hooks/useMembers';

interface MemberStatsCardsProps {
  stats: { total: number; admins: number; approved: number; pending: number };
  onFilterChange: (filter: FilterType) => void;
}

export function MemberStatsCards({ stats, onFilterChange }: MemberStatsCardsProps) {
  const cards: { label: string; value: number; filter: FilterType; color?: string }[] = [
    { label: '전체', value: stats.total, filter: 'all' },
    { label: '관리자', value: stats.admins, filter: 'admin', color: 'text-purple-600' },
    { label: '승인됨', value: stats.approved, filter: 'approved', color: 'text-green-600' },
    { label: '대기중', value: stats.pending, filter: 'pending', color: 'text-yellow-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(({ label, value, filter, color }) => (
        <Card
          key={filter}
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => onFilterChange(filter)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${color || ''}`}>{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

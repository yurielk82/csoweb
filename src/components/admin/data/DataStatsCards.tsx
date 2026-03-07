import { FileSpreadsheet, Calendar, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formatNumber = (num: number) => num.toLocaleString('ko-KR');

interface DataStatsCardsProps {
  totalRows: number;
  totalMonths: number;
  totalBusinesses: number;
}

export function DataStatsCards({ totalRows, totalMonths, totalBusinesses }: DataStatsCardsProps) {
  const items = [
    { icon: FileSpreadsheet, label: '총 데이터', value: `${formatNumber(totalRows)}건` },
    { icon: Calendar, label: '정산월 수', value: `${totalMonths}개월` },
    { icon: Users, label: '관련 업체 수', value: `${formatNumber(totalBusinesses)}개` },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map(({ icon: Icon, label, value }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Icon className="h-4 w-4" />{label}
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
        </Card>
      ))}
    </div>
  );
}

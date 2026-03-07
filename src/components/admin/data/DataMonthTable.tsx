import { Calendar, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { SettlementMonthData } from '@/hooks/useDataManagement';

const formatNumber = (num: number) => num.toLocaleString('ko-KR');
const formatCurrency = (num: number) => num.toLocaleString('ko-KR') + '원';

interface DataMonthTableProps {
  data: SettlementMonthData[];
  loading: boolean;
  onDelete: (month: string) => void;
}

export function DataMonthTable({ data, loading, onDelete }: DataMonthTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">정산월별 데이터</CardTitle>
        <CardDescription>각 정산월의 데이터 현황을 확인하고 관리할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>정산월</TableHead>
              <TableHead>처방월</TableHead>
              <TableHead className="text-right">CSO관리업체 수</TableHead>
              <TableHead className="text-right">수량 합계</TableHead>
              <TableHead className="text-right">금액 합계</TableHead>
              <TableHead className="text-right">제약수수료 합계</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.month}>
                <TableCell>
                  <Badge variant="outline" className="font-mono"><Calendar className="h-3 w-3 mr-1" />{item.month}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono">{item.prescriptionMonth || '-'}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatNumber(item.csoCount)}개</TableCell>
                <TableCell className="text-right font-medium">{formatNumber(item.totalQuantity)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.totalAmount)}</TableCell>
                <TableCell className="text-right font-medium text-blue-600">{formatCurrency(item.totalCommission)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onDelete(item.month)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" />삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />불러오는 중...</span>
                  ) : '업로드된 정산 데이터가 없습니다.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

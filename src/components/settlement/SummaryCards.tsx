import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SummaryCardsProps {
  totals: {
    수량: number;
    금액: number;
    제약수수료_합계: number;
    담당수수료_합계: number;
  };
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('ko-KR');
}

export function SummaryCards({ totals }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>총 수량</CardDescription>
          <CardTitle className="text-2xl">{formatNumber(totals.수량)}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>총 금액</CardDescription>
          <CardTitle className="text-2xl">{formatNumber(totals.금액)}원</CardTitle>
        </CardHeader>
      </Card>
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardDescription>제약수수료 합계</CardDescription>
          <CardTitle className="text-2xl text-blue-600">{formatNumber(totals.제약수수료_합계)}원</CardTitle>
          <p className="text-xs text-blue-700 font-medium mt-1">(세금계산서 발행 금액 / VAT 포함)</p>
        </CardHeader>
      </Card>
    </div>
  );
}

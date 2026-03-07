'use client';

import { Calculator, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/shared/loading';
import { Badge } from '@/components/ui/badge';
import { useMonthlySummary } from '@/hooks/useMonthlySummary';
import { MonthlySummaryTable } from '@/components/settlement/MonthlySummaryTable';

export default function MonthlySummaryPage() {
  const {
    loading, refreshing, data, error,
    visibleColumns, totalRowCount,
    formatNumber, calculateGrandTotal, fetchData,
  } = useMonthlySummary();

  if (loading) {
    return <Loading text="월별 합계를 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader refreshing={refreshing} onRefresh={() => fetchData(true)} />

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {data && data.summary_columns.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-amber-700">
              관리자가 합계 표시 컬럼을 설정하지 않았습니다.
              관리자에게 컬럼 설정에서 &quot;합계&quot; 옵션을 활성화해달라고 요청해주세요.
            </p>
          </CardContent>
        </Card>
      )}

      {data && data.months.length === 0 && data.summary_columns.length > 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p>정산 데이터가 없습니다.</p>
          </CardContent>
        </Card>
      )}

      {data && data.months.length > 0 && data.summary_columns.length > 0 && (
        <MonthlySummaryContent
          data={data}
          visibleColumns={visibleColumns}
          totalRowCount={totalRowCount}
          formatNumber={formatNumber}
          calculateGrandTotal={calculateGrandTotal}
        />
      )}
    </div>
  );
}

function PageHeader({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          월별 수수료 합계
        </h1>
        <p className="text-muted-foreground">정산월 별 수수료 합계를 한눈에 확인하세요.</p>
      </div>
      <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
        새로고침
      </Button>
    </div>
  );
}

interface MonthlySummaryContentProps {
  data: { months: { settlement_month: string; summaries: Record<string, number>; row_count: number }[]; summary_columns: { column_key: string; column_name: string; display_order: number }[] };
  visibleColumns: { column_key: string; column_name: string; display_order: number }[];
  totalRowCount: number;
  formatNumber: (value: number) => string;
  calculateGrandTotal: (key: string) => number;
}

function MonthlySummaryContent({ data, visibleColumns, totalRowCount, formatNumber, calculateGrandTotal }: MonthlySummaryContentProps) {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 정산월</CardDescription>
            <CardTitle className="text-2xl">{data.months.length}개월</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 데이터 건수</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(totalRowCount)}건</CardTitle>
          </CardHeader>
        </Card>
        {visibleColumns.filter(col => col.column_name.includes('수수료') || col.column_name.includes('합계')).slice(0, 2).map(col => (
          <Card key={col.column_key} className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-600">{col.column_name} (전체)</CardDescription>
              <CardTitle className="text-2xl text-blue-700">
                {formatNumber(calculateGrandTotal(col.column_key))}원
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <MonthlySummaryTable
        months={data.months}
        visibleColumns={visibleColumns}
        totalRowCount={totalRowCount}
        formatNumber={formatNumber}
        calculateGrandTotal={calculateGrandTotal}
      />

      {/* Column Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">표시 항목</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {visibleColumns.map(col => (
              <Badge key={col.column_key} variant="outline">
                {col.column_name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

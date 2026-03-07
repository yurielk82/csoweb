import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MonthlyData, SummaryColumn } from '@/hooks/useMonthlySummary';

interface MonthlySummaryTableProps {
  months: MonthlyData[];
  visibleColumns: SummaryColumn[];
  totalRowCount: number;
  formatNumber: (value: number) => string;
  calculateGrandTotal: (key: string) => number;
}

function isHighlightColumn(key: string): boolean {
  return key.includes('수수료') || key.includes('합계');
}

export function MonthlySummaryTable({
  months, visibleColumns, totalRowCount, formatNumber, calculateGrandTotal,
}: MonthlySummaryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          정산월별 합계
        </CardTitle>
        <CardDescription>
          관리자가 설정한 합계 컬럼 기준으로 표시됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">정산월</th>
                <th className="px-4 py-3 text-right font-medium">건수</th>
                {visibleColumns.map(col => (
                  <th key={col.column_key} className="px-4 py-3 text-right font-medium">
                    {col.column_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((month, idx) => (
                <tr
                  key={month.settlement_month}
                  className={`border-b hover:bg-muted/30 ${idx === 0 ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3 font-medium">
                    {month.settlement_month}
                    {idx === 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">최신</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                    {formatNumber(month.row_count)}
                  </td>
                  {visibleColumns.map(col => (
                    <td
                      key={col.column_key}
                      className={`px-4 py-3 text-right font-medium tabular-nums ${
                        isHighlightColumn(col.column_key) ? 'text-blue-600' : ''
                      }`}
                    >
                      {formatNumber(month.summaries[col.column_key] || 0)}
                    </td>
                  ))}
                </tr>
              ))}
              <GrandTotalRow
                visibleColumns={visibleColumns}
                totalRowCount={totalRowCount}
                formatNumber={formatNumber}
                calculateGrandTotal={calculateGrandTotal}
              />
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface GrandTotalRowProps {
  visibleColumns: SummaryColumn[];
  totalRowCount: number;
  formatNumber: (value: number) => string;
  calculateGrandTotal: (key: string) => number;
}

function GrandTotalRow({ visibleColumns, totalRowCount, formatNumber, calculateGrandTotal }: GrandTotalRowProps) {
  return (
    <tr className="bg-gray-100 font-bold border-t-2">
      <td className="px-4 py-3">총합계</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {formatNumber(totalRowCount)}
      </td>
      {visibleColumns.map(col => (
        <td
          key={col.column_key}
          className={`px-4 py-3 text-right tabular-nums ${
            isHighlightColumn(col.column_key) ? 'text-blue-700' : ''
          }`}
        >
          {formatNumber(calculateGrandTotal(col.column_key))}
        </td>
      ))}
    </tr>
  );
}

import { memo, type ReactNode } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Settlement, ColumnSetting } from '@/types';
import { getSettlementValue } from '@/types';

export interface GroupedData {
  csoName: string;
  customers: {
    customerName: string;
    rows: Settlement[];
    subtotal: { 수량: number; 금액: number; 제약수수료_합계: number };
  }[];
  total: { 수량: number; 금액: number; 제약수수료_합계: number };
}

interface SettlementTableProps {
  settlements: Settlement[] | undefined;
  displayColumns: ColumnSetting[];
  labelColumnIndex: number;
  selectedMonth: string;
  yearMonths: string[];
  searchQuery: string;
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('ko-KR');
}

function buildGroupedData(settlements: Settlement[]): GroupedData[] {
  const csoMap = new Map<string, Map<string, Settlement[]>>();

  for (const row of settlements) {
    const csoName = row.CSO관리업체 || '(미지정)';
    const customerName = row.거래처명 || '(미지정)';

    if (!csoMap.has(csoName)) csoMap.set(csoName, new Map());
    const customerMap = csoMap.get(csoName)!;
    if (!customerMap.has(customerName)) customerMap.set(customerName, []);
    customerMap.get(customerName)!.push(row);
  }

  const result: GroupedData[] = [];
  for (const [csoName, customerMap] of Array.from(csoMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const customers: GroupedData['customers'] = [];
    const csoTotal = { 수량: 0, 금액: 0, 제약수수료_합계: 0 };

    for (const [customerName, rows] of Array.from(customerMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const subtotal = {
        수량: rows.reduce((sum, r) => sum + (Number(r.수량) || 0), 0),
        금액: rows.reduce((sum, r) => sum + (Number(r.금액) || 0), 0),
        제약수수료_합계: rows.reduce((sum, r) => sum + (Number(r.제약수수료_합계) || 0), 0),
      };
      customers.push({ customerName, rows, subtotal });
      csoTotal.수량 += subtotal.수량;
      csoTotal.금액 += subtotal.금액;
      csoTotal.제약수수료_합계 += subtotal.제약수수료_합계;
    }

    result.push({ csoName, customers, total: csoTotal });
  }

  return result;
}

function renderGroupedRows(
  groupedData: GroupedData[],
  displayColumns: ColumnSetting[],
  labelColumnIndex: number,
): ReactNode[] {
  const rows: ReactNode[] = [];

  for (const csoGroup of groupedData) {
    for (let custIdx = 0; custIdx < csoGroup.customers.length; custIdx++) {
      const customer = csoGroup.customers[custIdx];

      // 데이터 행
      for (let rowIdx = 0; rowIdx < customer.rows.length; rowIdx++) {
        const row = customer.rows[rowIdx];
        rows.push(
          <TableRow key={`${csoGroup.csoName}-${customer.customerName}-${rowIdx}`}>
            {displayColumns.map(col => {
              const value = getSettlementValue(row, col.column_key);
              const isNumber = typeof value === 'number';
              return (
                <TableCell
                  key={col.column_key}
                  className={isNumber ? 'text-right font-mono tabular-nums' : ''}
                >
                  {isNumber ? formatNumber(value) : (value || '-')}
                </TableCell>
              );
            })}
          </TableRow>
        );
      }

      // 거래처 소계 행
      rows.push(
        <TableRow
          key={`subtotal-${csoGroup.csoName}-${customer.customerName}`}
          className="bg-muted hover:bg-muted"
        >
          {displayColumns.map((col, colIdx) => (
            <TableCell
              key={col.column_key}
              className={
                col.column_key === '수량' || col.column_key === '금액' || col.column_key === '제약수수료_합계'
                  ? 'text-right font-mono tabular-nums font-medium'
                  : 'font-medium'
              }
            >
              {colIdx === labelColumnIndex ? (
                <span className="text-muted-foreground">{customer.customerName} 합계</span>
              ) : col.column_key === '수량' ? (
                formatNumber(customer.subtotal.수량)
              ) : col.column_key === '금액' ? (
                formatNumber(customer.subtotal.금액)
              ) : col.column_key === '제약수수료_합계' ? (
                <span className="text-primary">{formatNumber(customer.subtotal.제약수수료_합계)}</span>
              ) : ''}
            </TableCell>
          ))}
        </TableRow>
      );

      // CSO 총합계 행 (마지막 거래처 후)
      if (custIdx === csoGroup.customers.length - 1) {
        rows.push(
          <TableRow
            key={`total-${csoGroup.csoName}`}
            className="bg-primary/5 hover:bg-primary/5 border-b-2 border-primary/20"
          >
            {displayColumns.map((col, colIdx) => (
              <TableCell
                key={col.column_key}
                className={
                  col.column_key === '수량' || col.column_key === '금액' || col.column_key === '제약수수료_합계'
                    ? 'text-right font-mono tabular-nums font-bold'
                    : 'font-bold'
                }
              >
                {colIdx === labelColumnIndex ? (
                  <span className="text-primary">{csoGroup.csoName} 총합계</span>
                ) : col.column_key === '수량' ? (
                  formatNumber(csoGroup.total.수량)
                ) : col.column_key === '금액' ? (
                  formatNumber(csoGroup.total.금액)
                ) : col.column_key === '제약수수료_합계' ? (
                  <span className="text-primary">{formatNumber(csoGroup.total.제약수수료_합계)}</span>
                ) : ''}
              </TableCell>
            ))}
          </TableRow>
        );
      }
    }
  }

  return rows;
}

export const SettlementTable = memo(function SettlementTable({
  settlements, displayColumns, labelColumnIndex, selectedMonth, yearMonths, searchQuery,
}: SettlementTableProps) {
  const groupedData = settlements ? buildGroupedData(settlements) : [];
  const tableRows = renderGroupedRows(groupedData, displayColumns, labelColumnIndex);

  return (
    <div className="glass-chart-card overflow-hidden p-0">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-base font-semibold">정산 상세 내역</h3>
        <p className="text-sm text-muted-foreground mt-0.5">거래처명별 소계 및 CSO관리업체 총합계 포함</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              {displayColumns.map(col => (
                <TableHead key={col.column_key} className="whitespace-nowrap sticky top-0 z-10 bg-muted">
                  {col.column_name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows.length > 0 ? tableRows : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={displayColumns.length} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50" />
                    <div className="space-y-1">
                      <p className="text-lg font-medium text-muted-foreground">
                        {selectedMonth ? `${selectedMonth} 정산 데이터가 없습니다.` : '정산 데이터가 없습니다.'}
                      </p>
                      <p className="text-sm text-muted-foreground/70">
                        {yearMonths.length === 0
                          ? '아직 등록된 정산 데이터가 없습니다. 관리자에게 문의해주세요.'
                          : searchQuery
                            ? `"${searchQuery}" 검색 결과가 없습니다. 다른 검색어를 입력해보세요.`
                            : '해당 월에 매칭된 정산 내역이 없습니다.'}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

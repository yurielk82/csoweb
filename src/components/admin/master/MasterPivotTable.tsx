import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { CSOOption, SettlementResponse } from '@/hooks/useMasterData';

// ── Types ──

interface GroupedData {
  csoName: string;
  customers: {
    customerName: string;
    rows: Settlement[];
    subtotal: { 수량: number; 금액: number; 제약수수료_합계: number };
  }[];
  total: { 수량: number; 금액: number; 제약수수료_합계: number };
}

// ── 피벗 데이터 생성 ──

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

// ── 테이블 행 렌더링 ──

const SUMMARY_KEYS = ['수량', '금액', '제약수수료_합계'] as const;

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('ko-KR');
}

function buildTableRows(
  groupedData: GroupedData[],
  displayColumns: ColumnSetting[],
  labelColumnIndex: number,
  csoColumnIndex: number,
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
                <TableCell key={col.column_key} className={isNumber ? 'text-right font-mono tabular-nums' : ''}>
                  {isNumber ? formatNumber(value) : (value || '-')}
                </TableCell>
              );
            })}
          </TableRow>
        );
      }

      // 거래처 소계
      rows.push(
        <TableRow key={`subtotal-${csoGroup.csoName}-${customer.customerName}`} className="bg-muted hover:bg-muted">
          {displayColumns.map((col, colIdx) => {
            const isSummary = SUMMARY_KEYS.includes(col.column_key as typeof SUMMARY_KEYS[number]);
            return (
              <TableCell key={col.column_key} className={isSummary ? 'text-right font-mono tabular-nums font-medium' : 'font-medium'}>
                {colIdx === labelColumnIndex ? (
                  <span className="text-muted-foreground">{customer.customerName} 합계</span>
                ) : col.column_key === '수량' ? formatNumber(customer.subtotal.수량)
                  : col.column_key === '금액' ? formatNumber(customer.subtotal.금액)
                  : col.column_key === '제약수수료_합계' ? <span className="text-primary">{formatNumber(customer.subtotal.제약수수료_합계)}</span>
                  : ''}
              </TableCell>
            );
          })}
        </TableRow>
      );

      // CSO 총합계
      if (custIdx === csoGroup.customers.length - 1) {
        rows.push(
          <TableRow key={`total-${csoGroup.csoName}`} className="bg-primary/5 hover:bg-primary/5 border-b-2 border-primary/20">
            {displayColumns.map((col, colIdx) => {
              const isSummary = SUMMARY_KEYS.includes(col.column_key as typeof SUMMARY_KEYS[number]);
              return (
                <TableCell key={col.column_key} className={isSummary ? 'text-right font-mono tabular-nums font-bold' : 'font-bold'}>
                  {colIdx === (csoColumnIndex >= 0 ? csoColumnIndex : 0) ? (
                    <span className="text-primary">{csoGroup.csoName} 총합계</span>
                  ) : col.column_key === '수량' ? formatNumber(csoGroup.total.수량)
                    : col.column_key === '금액' ? formatNumber(csoGroup.total.금액)
                    : col.column_key === '제약수수료_합계' ? <span className="text-primary">{formatNumber(csoGroup.total.제약수수료_합계)}</span>
                    : ''}
                </TableCell>
              );
            })}
          </TableRow>
        );
      }
    }
  }
  return rows;
}

// ── MasterPivotTable ──

interface MasterPivotTableProps {
  data: SettlementResponse | null;
  columns: ColumnSetting[];
  selectedColumns: string[];
  selectedCSO: CSOOption | null;
  loading: boolean;
  queryStarted: boolean;
}

export function MasterPivotTable({ data, columns, selectedColumns, selectedCSO, loading, queryStarted }: MasterPivotTableProps) {
  if (!queryStarted) return null;

  const displayColumns = columns
    .filter(c => selectedColumns.includes(c.column_key))
    .sort((a, b) => a.display_order - b.display_order);

  const customerColumnIndex = displayColumns.findIndex(c => c.column_key === '거래처명');
  const csoColumnIndex = displayColumns.findIndex(c => c.column_key === 'CSO관리업체');
  const labelColumnIndex = customerColumnIndex >= 0 ? customerColumnIndex : (csoColumnIndex >= 0 ? csoColumnIndex : 0);

  const groupedData = data?.settlements ? buildGroupedData(data.settlements) : [];
  const tableRows = buildTableRows(groupedData, displayColumns, labelColumnIndex, csoColumnIndex);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">정산 상세 내역</CardTitle>
        <CardDescription>
          {selectedCSO
            ? `${selectedCSO.company_name}의 거래처명별 소계 및 총합계`
            : '전체 CSO 업체의 거래처명별 소계 및 CSO관리업체 총합계 포함'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
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
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={displayColumns.length} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin inline mr-2" />
                  데이터를 불러오는 중...
                </TableCell>
              </TableRow>
            ) : tableRows.length > 0 ? tableRows : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={displayColumns.length} className="text-center py-8 text-muted-foreground">
                  {selectedCSO ? `${selectedCSO.company_name}의 데이터가 없습니다.` : '데이터가 없습니다.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

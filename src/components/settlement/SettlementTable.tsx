import { memo, type ReactNode } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
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

const SUMMARY_KEYS = ['수량', '금액', '제약수수료_합계'] as const;

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

/** 개별 데이터 행 렌더링 */
function renderDataRow(row: Settlement, displayColumns: ColumnSetting[], key: string): ReactNode {
  return (
    <TableRow key={key}>
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

interface SummaryCellProps {
  col: ColumnSetting;
  colIdx: number;
  labelColumnIndex: number;
  label: string;
  totals: GroupedData['total'];
  isPrimary: boolean;
}

/** 합계 셀 값 렌더링 (소계/총합계 공용) */
function renderSummaryCell({ col, colIdx, labelColumnIndex, label, totals, isPrimary }: SummaryCellProps): ReactNode {
  if (colIdx === labelColumnIndex) {
    return <span className={isPrimary ? 'text-primary' : 'text-muted-foreground'}>{label}</span>;
  }
  if (col.column_key === '제약수수료_합계') {
    return <span className="text-primary">{formatNumber(totals.제약수수료_합계)}</span>;
  }
  if (col.column_key === '수량') return formatNumber(totals.수량);
  if (col.column_key === '금액') return formatNumber(totals.금액);
  return '';
}

interface SummaryRowProps {
  rowKey: string;
  className: string;
  displayColumns: ColumnSetting[];
  labelColumnIndex: number;
  label: string;
  totals: GroupedData['total'];
  isPrimary: boolean;
}

/** 소계/총합계 행 렌더링 */
function renderSummaryRow({ rowKey, className, displayColumns, labelColumnIndex, label, totals, isPrimary }: SummaryRowProps): ReactNode {
  return (
    <TableRow key={rowKey} className={className}>
      {displayColumns.map((col, colIdx) => {
        const isSummaryCol = SUMMARY_KEYS.includes(col.column_key as typeof SUMMARY_KEYS[number]);
        return (
          <TableCell
            key={col.column_key}
            className={`${isSummaryCol ? 'text-right font-mono tabular-nums' : ''} ${isPrimary ? 'font-bold' : 'font-medium'}`}
          >
            {renderSummaryCell({ col, colIdx, labelColumnIndex, label, totals, isPrimary })}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

/** 그룹화된 행 전체 생성 */
function renderGroupedRows(
  groupedData: GroupedData[], displayColumns: ColumnSetting[], labelColumnIndex: number,
): ReactNode[] {
  const rows: ReactNode[] = [];

  for (const csoGroup of groupedData) {
    for (let custIdx = 0; custIdx < csoGroup.customers.length; custIdx++) {
      const customer = csoGroup.customers[custIdx];

      for (let rowIdx = 0; rowIdx < customer.rows.length; rowIdx++) {
        rows.push(renderDataRow(customer.rows[rowIdx], displayColumns, `${csoGroup.csoName}-${customer.customerName}-${rowIdx}`));
      }

      rows.push(renderSummaryRow({
        rowKey: `subtotal-${csoGroup.csoName}-${customer.customerName}`,
        className: 'bg-muted hover:bg-muted',
        displayColumns, labelColumnIndex,
        label: `${customer.customerName} 합계`, totals: customer.subtotal, isPrimary: false,
      }));

      if (custIdx === csoGroup.customers.length - 1) {
        rows.push(renderSummaryRow({
          rowKey: `total-${csoGroup.csoName}`,
          className: 'bg-primary/5 hover:bg-primary/5 border-b-2 border-primary/20',
          displayColumns, labelColumnIndex,
          label: `${csoGroup.csoName} 총합계`, totals: csoGroup.total, isPrimary: true,
        }));
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
              <EmptyTableRow
                colSpan={displayColumns.length}
                selectedMonth={selectedMonth}
                yearMonths={yearMonths}
                searchQuery={searchQuery}
              />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

function EmptyTableRow({ colSpan, selectedMonth, yearMonths, searchQuery }: {
  colSpan: number; selectedMonth: string; yearMonths: string[]; searchQuery: string;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="text-center py-12">
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
  );
}

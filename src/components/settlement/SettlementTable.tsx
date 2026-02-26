import { FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export function SettlementTable({
  settlements, displayColumns, labelColumnIndex, selectedMonth, yearMonths, searchQuery,
}: SettlementTableProps) {
  const groupedData = settlements ? buildGroupedData(settlements) : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">정산 상세 내역</CardTitle>
        <CardDescription>거래처명별 소계 및 CSO관리업체 총합계 포함</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="settlement-table">
            <thead>
              <tr>
                {displayColumns.map(col => (
                  <th key={col.column_key}>{col.column_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedData.length > 0 ? (
                <>
                  {groupedData.map((csoGroup) => (
                    <>
                      {csoGroup.customers.map((customer) => (
                        <>
                          {customer.rows.map((row, rowIdx) => (
                            <tr key={`${csoGroup.csoName}-${customer.customerName}-${rowIdx}`}>
                              {displayColumns.map(col => (
                                <td
                                  key={col.column_key}
                                  className={typeof getSettlementValue(row, col.column_key) === 'number' ? 'number-cell' : ''}
                                >
                                  {typeof getSettlementValue(row, col.column_key) === 'number'
                                    ? formatNumber(getSettlementValue(row, col.column_key) as number)
                                    : getSettlementValue(row, col.column_key) || '-'
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                          <tr className="bg-gray-100 font-medium" key={`subtotal-${csoGroup.csoName}-${customer.customerName}`}>
                            {displayColumns.map((col, colIdx) => (
                              <td key={col.column_key} className={typeof customer.subtotal[col.column_key as keyof typeof customer.subtotal] === 'number' ? 'text-right' : ''}>
                                {colIdx === labelColumnIndex ? (
                                  <span className="text-gray-600">{customer.customerName} 합계</span>
                                ) : col.column_key === '수량' ? (
                                  formatNumber(customer.subtotal.수량)
                                ) : col.column_key === '금액' ? (
                                  formatNumber(customer.subtotal.금액)
                                ) : col.column_key === '제약수수료_합계' ? (
                                  <span className="text-blue-600">{formatNumber(customer.subtotal.제약수수료_합계)}</span>
                                ) : ''}
                              </td>
                            ))}
                          </tr>
                        </>
                      ))}
                      <tr className="bg-blue-50 font-bold border-b-2 border-blue-200" key={`total-${csoGroup.csoName}`}>
                        {displayColumns.map((col, colIdx) => (
                          <td key={col.column_key} className={typeof csoGroup.total[col.column_key as keyof typeof csoGroup.total] === 'number' ? 'text-right' : ''}>
                            {colIdx === labelColumnIndex ? (
                              <span className="text-blue-700">{csoGroup.csoName} 총합계</span>
                            ) : col.column_key === '수량' ? (
                              formatNumber(csoGroup.total.수량)
                            ) : col.column_key === '금액' ? (
                              formatNumber(csoGroup.total.금액)
                            ) : col.column_key === '제약수수료_합계' ? (
                              <span className="text-blue-700">{formatNumber(csoGroup.total.제약수수료_합계)}</span>
                            ) : ''}
                          </td>
                        ))}
                      </tr>
                    </>
                  ))}
                </>
              ) : (
                <tr>
                  <td colSpan={displayColumns.length} className="text-center py-12">
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
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

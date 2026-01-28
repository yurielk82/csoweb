'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Search, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/shared/loading';
import type { Settlement, ColumnSetting } from '@/types';

interface SettlementResponse {
  settlements: Settlement[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  totals: {
    수량: number;
    금액: number;
    제약수수료_합계: number;
    담당수수료_합계: number;
  };
}

interface CSOSubtotal {
  csoName: string;
  수량: number;
  금액: number;
  제약수수료_합계: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [data, setData] = useState<SettlementResponse | null>(null);
  const [columns, setColumns] = useState<ColumnSetting[]>([]);
  const [yearMonths, setYearMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Fetch column settings
  useEffect(() => {
    fetch('/api/columns')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          const visibleColumns = result.data.filter((c: ColumnSetting) => c.is_visible);
          setColumns(visibleColumns);
          // Select required columns by default
          const requiredKeys = visibleColumns
            .filter((c: ColumnSetting) => c.is_required)
            .map((c: ColumnSetting) => c.column_key);
          setSelectedColumns(requiredKeys.length > 0 ? requiredKeys : visibleColumns.map((c: ColumnSetting) => c.column_key));
        }
      });
  }, []);

  // Fetch available settlement months
  useEffect(() => {
    fetch('/api/settlements/year-months')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setYearMonths(result.data);
          if (result.data.length > 0) {
            setSelectedMonth(result.data[0]);
          }
        }
      });
  }, []);

  // Fetch settlements
  const fetchSettlements = useCallback(async () => {
    if (!selectedMonth) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        settlement_month: selectedMonth,
        page: page.toString(),
        page_size: '50',
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/settlements?${params}`);
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Fetch settlements error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, page, search]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  // Handle column toggle
  const toggleColumn = (columnKey: string) => {
    const column = columns.find(c => c.column_key === columnKey);
    if (column?.is_required) return; // Cannot toggle required columns

    setSelectedColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Handle export
  const handleExport = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        settlement_month: selectedMonth,
        columns: selectedColumns.join(','),
      });
      
      const res = await fetch(`/api/settlements/export?${params}`);
      const blob = await res.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `정산서_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setDownloading(false);
    }
  };

  // Format number
  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('ko-KR');
  };

  // Get display columns in order
  const displayColumns = columns
    .filter(c => selectedColumns.includes(c.column_key))
    .sort((a, b) => a.display_order - b.display_order);

  // CSO관리업체별 소계 계산
  const csoSubtotals: CSOSubtotal[] = [];
  if (data?.settlements) {
    const csoMap = new Map<string, CSOSubtotal>();
    for (const row of data.settlements) {
      const csoName = row.CSO관리업체 || '(미지정)';
      const existing = csoMap.get(csoName) || { csoName, 수량: 0, 금액: 0, 제약수수료_합계: 0 };
      existing.수량 += Number(row.수량) || 0;
      existing.금액 += Number(row.금액) || 0;
      existing.제약수수료_합계 += Number(row.제약수수료_합계) || 0;
      csoMap.set(csoName, existing);
    }
    csoSubtotals.push(...Array.from(csoMap.values()).sort((a, b) => a.csoName.localeCompare(b.csoName)));
  }

  if (loading && !data) {
    return <Loading text="정산서를 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            정산서 조회
          </h1>
          <p className="text-muted-foreground">월별 정산 내역을 조회하고 다운로드하세요.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchSettlements}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button onClick={handleExport} disabled={downloading || !data?.settlements.length}>
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            엑셀 다운로드
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">조회 조건</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Label className="mb-2 block">정산월</Label>
              <Select 
                value={selectedMonth} 
                onValueChange={setSelectedMonth}
              >
                <SelectTrigger>
                  <SelectValue placeholder="정산월 선택" />
                </SelectTrigger>
                <SelectContent>
                  {yearMonths.map(ym => (
                    <SelectItem key={ym} value={ym}>{ym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="mb-2 block">검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="제품명, 거래처명 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Column Selection */}
          <div>
            <Label className="mb-2 block">표시할 항목</Label>
            <div className="flex flex-wrap gap-3">
              {columns.map(col => (
                <div key={col.column_key} className="flex items-center space-x-2">
                  <Checkbox
                    id={col.column_key}
                    checked={selectedColumns.includes(col.column_key)}
                    onCheckedChange={() => toggleColumn(col.column_key)}
                    disabled={col.is_required}
                  />
                  <label
                    htmlFor={col.column_key}
                    className="text-sm cursor-pointer flex items-center gap-1"
                  >
                    {col.column_name}
                    {col.is_required && (
                      <Badge variant="secondary" className="text-xs">필수</Badge>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>총 수량</CardDescription>
              <CardTitle className="text-2xl">
                {formatNumber(data.totals.수량)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>총 금액</CardDescription>
              <CardTitle className="text-2xl">
                {formatNumber(data.totals.금액)}원
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>제약수수료 합계</CardDescription>
              <CardTitle className="text-2xl text-blue-600">
                {formatNumber(data.totals.제약수수료_합계)}원
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* CSO관리업체별 소계 */}
      {csoSubtotals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CSO관리업체별 소계</CardTitle>
            <CardDescription>거래처별 수량, 금액, 수수료 합계</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="settlement-table">
                <thead>
                  <tr>
                    <th>CSO관리업체</th>
                    <th className="text-right">수량</th>
                    <th className="text-right">금액</th>
                    <th className="text-right">제약수수료 합계</th>
                  </tr>
                </thead>
                <tbody>
                  {csoSubtotals.map((cso, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{cso.csoName}</td>
                      <td className="text-right">{formatNumber(cso.수량)}</td>
                      <td className="text-right">{formatNumber(cso.금액)}원</td>
                      <td className="text-right text-blue-600 font-medium">{formatNumber(cso.제약수수료_합계)}원</td>
                    </tr>
                  ))}
                  {/* 총합계 */}
                  <tr className="bg-muted/50 font-bold">
                    <td>총 합계</td>
                    <td className="text-right">{formatNumber(data?.totals.수량 || 0)}</td>
                    <td className="text-right">{formatNumber(data?.totals.금액 || 0)}원</td>
                    <td className="text-right text-blue-600">{formatNumber(data?.totals.제약수수료_합계 || 0)}원</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
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
                {data?.settlements.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {displayColumns.map(col => (
                      <td 
                        key={col.column_key}
                        className={typeof row[col.column_key] === 'number' ? 'number-cell' : ''}
                      >
                        {typeof row[col.column_key] === 'number' 
                          ? formatNumber(row[col.column_key] as number)
                          : row[col.column_key] || '-'
                        }
                      </td>
                    ))}
                  </tr>
                ))}
                {(!data?.settlements || data.settlements.length === 0) && (
                  <tr>
                    <td colSpan={displayColumns.length} className="text-center py-8 text-muted-foreground">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            총 {data.pagination.total.toLocaleString()}건 중{' '}
            {((data.pagination.page - 1) * data.pagination.pageSize + 1).toLocaleString()}
            -{Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total).toLocaleString()}건
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {page} / {data.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

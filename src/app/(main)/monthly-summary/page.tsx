'use client';

import { useState, useEffect } from 'react';
import { Calculator, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/shared/loading';
import { Badge } from '@/components/ui/badge';

interface SummaryColumn {
  column_key: string;
  column_name: string;
  display_order: number;
}

interface MonthlyData {
  settlement_month: string;
  summaries: Record<string, number>;
  row_count: number;
}

interface MonthlySummaryResponse {
  months: MonthlyData[];
  summary_columns: SummaryColumn[];
}

export default function MonthlySummaryPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<MonthlySummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    
    try {
      const res = await fetch('/api/settlements/monthly-summary');
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 숫자 포맷
  const formatNumber = (value: number) => {
    return value.toLocaleString('ko-KR');
  };

  // 전체 합계 계산
  const calculateGrandTotal = (key: string): number => {
    if (!data?.months) return 0;
    return data.months.reduce((sum, month) => sum + (month.summaries[key] || 0), 0);
  };

  // 총 건수 계산
  const totalRowCount = data?.months?.reduce((sum, m) => sum + m.row_count, 0) || 0;

  if (loading) {
    return <Loading text="월별 합계를 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            월별 수수료 합계
          </h1>
          <p className="text-muted-foreground">정산월 별 수수료 합계를 한눈에 확인하세요.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

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
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>총 정산월</CardDescription>
                <CardTitle className="text-2xl">
                  {data.months.length}개월
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>총 데이터 건수</CardDescription>
                <CardTitle className="text-2xl">
                  {formatNumber(totalRowCount)}건
                </CardTitle>
              </CardHeader>
            </Card>
            {data.summary_columns.slice(0, 2).map(col => (
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

          {/* Monthly Table */}
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
                      {data.summary_columns.map(col => (
                        <th key={col.column_key} className="px-4 py-3 text-right font-medium">
                          {col.column_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.months.map((month, idx) => (
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
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatNumber(month.row_count)}
                        </td>
                        {data.summary_columns.map(col => (
                          <td 
                            key={col.column_key} 
                            className={`px-4 py-3 text-right font-medium ${
                              col.column_key.includes('수수료') || col.column_key.includes('합계') 
                                ? 'text-blue-600' 
                                : ''
                            }`}
                          >
                            {formatNumber(month.summaries[col.column_key] || 0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* 총합계 행 */}
                    <tr className="bg-gray-100 font-bold border-t-2">
                      <td className="px-4 py-3">총합계</td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(totalRowCount)}
                      </td>
                      {data.summary_columns.map(col => (
                        <td 
                          key={col.column_key} 
                          className={`px-4 py-3 text-right ${
                            col.column_key.includes('수수료') || col.column_key.includes('합계') 
                              ? 'text-blue-700' 
                              : ''
                          }`}
                        >
                          {formatNumber(calculateGrandTotal(col.column_key))}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Column Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">표시 항목</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.summary_columns.map(col => (
                  <Badge key={col.column_key} variant="outline">
                    {col.column_name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

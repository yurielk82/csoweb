'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Download, 
  Search, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  Building2,
  X
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

interface GroupedData {
  csoName: string;
  customers: {
    customerName: string;
    rows: Settlement[];
    subtotal: { 수량: number; 금액: number; 제약수수료_합계: number };
  }[];
  total: { 수량: number; 금액: number; 제약수수료_합계: number };
}

interface NoticeSettings {
  notice_content: string;
  ceo_name: string;
}

interface CSOOption {
  business_number: string;
  company_name: string;
}

export default function AdminMasterPage() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [data, setData] = useState<SettlementResponse | null>(null);
  const [columns, setColumns] = useState<ColumnSetting[]>([]);
  const [yearMonths, setYearMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [noticeSettings, setNoticeSettings] = useState<NoticeSettings | null>(null);

  // CSO 검색 관련 상태
  const [csoList, setCsoList] = useState<CSOOption[]>([]);
  const [csoSearch, setCsoSearch] = useState('');
  const [selectedCSO, setSelectedCSO] = useState<CSOOption | null>(null);
  const [showCsoDropdown, setShowCsoDropdown] = useState(false);
  const [csoLoading, setCsoLoading] = useState(false);
  const csoInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 필터된 CSO 리스트
  const filteredCsoList = csoSearch
    ? csoList.filter(cso => 
        cso.company_name.toLowerCase().includes(csoSearch.toLowerCase()) ||
        cso.business_number.includes(csoSearch)
      )
    : csoList;

  // Fetch CSO list (approved users)
  useEffect(() => {
    setCsoLoading(true);
    fetch('/api/users?status=approved')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setCsoList(result.data.map((u: { business_number: string; company_name: string }) => ({
            business_number: u.business_number,
            company_name: u.company_name
          })));
        }
      })
      .catch(console.error)
      .finally(() => setCsoLoading(false));
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        csoInputRef.current &&
        !csoInputRef.current.contains(e.target as Node)
      ) {
        setShowCsoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Fetch notice settings
  useEffect(() => {
    fetch('/api/settings/company', { cache: 'no-store' })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setNoticeSettings(result.data);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch settlements - 관리자용: 선택된 CSO의 데이터만 조회
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
      // 관리자용: 선택된 CSO의 business_number로 필터링
      if (selectedCSO) {
        params.set('business_number', selectedCSO.business_number);
      }

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
  }, [selectedMonth, page, search, selectedCSO]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  // Handle CSO selection
  const handleCsoSelect = (cso: CSOOption) => {
    setSelectedCSO(cso);
    setCsoSearch(cso.company_name);
    setShowCsoDropdown(false);
    setPage(1); // 페이지 초기화
  };

  // Clear CSO selection
  const clearCsoSelection = () => {
    setSelectedCSO(null);
    setCsoSearch('');
    setPage(1);
  };

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
      // 관리자용: 선택된 CSO의 business_number로 필터링
      if (selectedCSO) {
        params.set('business_number', selectedCSO.business_number);
      }
      
      const res = await fetch(`/api/settlements/export?${params}`);
      const blob = await res.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = selectedCSO 
        ? `정산서_${selectedCSO.company_name}_${selectedMonth}.xlsx`
        : `정산서_전체_${selectedMonth}.xlsx`;
      a.download = fileName;
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

  // Notice 텍스트 변수 치환 함수
  const replaceNoticeVars = (text: string) => {
    if (!selectedMonth) return text;
    
    // 정산월 파싱 (YYYY-MM 형식)
    const [, monthStr] = selectedMonth.split('-');
    const month = Number(monthStr);
    const settlementMonth = `${month}월`;
    
    // 다음달 계산
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthStr = `${nextMonth}월`;
    
    // 대표자명
    const ceoName = noticeSettings?.ceo_name || '대표자';
    
    return text
      .replace(/{{정산월}}/g, settlementMonth)
      .replace(/{{정산월\+1}}/g, nextMonthStr)
      .replace(/{{대표자명}}/g, ceoName);
  };

  // Get display columns in order
  const displayColumns = columns
    .filter(c => selectedColumns.includes(c.column_key))
    .sort((a, b) => a.display_order - b.display_order);

  // 소계/총합계 표시 열 인덱스 계산
  const customerColumnIndex = displayColumns.findIndex(c => c.column_key === '거래처명');
  const csoColumnIndex = displayColumns.findIndex(c => c.column_key === 'CSO관리업체');
  const labelColumnIndex = customerColumnIndex >= 0 ? customerColumnIndex : (csoColumnIndex >= 0 ? csoColumnIndex : 0);

  // 피벗 데이터 생성: CSO관리업체 > 거래처명 > 상세 데이터
  const groupedData: GroupedData[] = [];
  if (data?.settlements) {
    const csoMap = new Map<string, Map<string, Settlement[]>>();
    
    // CSO관리업체 > 거래처명으로 그룹핑
    for (const row of data.settlements) {
      const csoName = row.CSO관리업체 || '(미지정)';
      const customerName = row.거래처명 || '(미지정)';
      
      if (!csoMap.has(csoName)) {
        csoMap.set(csoName, new Map());
      }
      const customerMap = csoMap.get(csoName)!;
      if (!customerMap.has(customerName)) {
        customerMap.set(customerName, []);
      }
      customerMap.get(customerName)!.push(row);
    }
    
    // 구조화된 데이터로 변환
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
      
      groupedData.push({ csoName, customers, total: csoTotal });
    }
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
            정산서 마스터 조회
          </h1>
          <p className="text-muted-foreground">전체 CSO 업체의 월별 정산 내역을 조회하고 관리합니다.</p>
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
            
            {/* CSO 거래처 검색 - 관리자 전용 */}
            <div className="w-full sm:w-64 relative">
              <Label className="mb-2 block flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                거래처 검색
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={csoInputRef}
                  placeholder="거래처명 또는 사업자번호 검색..."
                  value={csoSearch}
                  onChange={(e) => {
                    setCsoSearch(e.target.value);
                    setShowCsoDropdown(true);
                    if (!e.target.value) {
                      setSelectedCSO(null);
                    }
                  }}
                  onFocus={() => setShowCsoDropdown(true)}
                  className="pl-10 pr-8"
                />
                {selectedCSO && (
                  <button
                    onClick={clearCsoSelection}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Autocomplete Dropdown */}
              {showCsoDropdown && (
                <div 
                  ref={dropdownRef}
                  className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border rounded-md shadow-lg"
                >
                  {csoLoading ? (
                    <div className="p-3 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      로딩 중...
                    </div>
                  ) : filteredCsoList.length > 0 ? (
                    <>
                      {/* 전체 선택 옵션 */}
                      <div
                        className={`p-3 cursor-pointer hover:bg-gray-100 border-b ${!selectedCSO ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          setSelectedCSO(null);
                          setCsoSearch('');
                          setShowCsoDropdown(false);
                          setPage(1);
                        }}
                      >
                        <div className="font-medium">전체 거래처</div>
                        <div className="text-xs text-muted-foreground">모든 CSO 업체 조회</div>
                      </div>
                      {filteredCsoList.map(cso => (
                        <div
                          key={cso.business_number}
                          className={`p-3 cursor-pointer hover:bg-gray-100 ${selectedCSO?.business_number === cso.business_number ? 'bg-blue-50' : ''}`}
                          onClick={() => handleCsoSelect(cso)}
                        >
                          <div className="font-medium">{cso.company_name}</div>
                          <div className="text-xs text-muted-foreground">{cso.business_number}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="p-3 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1">
              <Label className="mb-2 block">제품/거래처 검색</Label>
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

          {/* 선택된 CSO 표시 */}
          {selectedCSO && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                선택된 거래처: {selectedCSO.company_name} ({selectedCSO.business_number})
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearCsoSelection}
                className="ml-auto h-6 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                해제
              </Button>
            </div>
          )}

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

      {/* Notice Section - 조회 조건 아래 */}
      {noticeSettings?.notice_content && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              Notice
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-900">
            <div className="whitespace-pre-line">
              {replaceNoticeVars(noticeSettings.notice_content)}
            </div>
          </CardContent>
        </Card>
      )}

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
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardDescription>제약수수료 합계</CardDescription>
              <CardTitle className="text-2xl text-blue-600">
                {formatNumber(data.totals.제약수수료_합계)}원
              </CardTitle>
              <p className="text-xs text-blue-700 font-medium mt-1">
                (세금계산서 발행 금액 / VAT 포함)
              </p>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Table - 피벗 형태 (거래처명별 소계 + CSO관리업체 총합계) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">정산 상세 내역</CardTitle>
          <CardDescription>
            {selectedCSO 
              ? `${selectedCSO.company_name}의 거래처명별 소계 및 총합계`
              : '전체 CSO 업체의 거래처명별 소계 및 CSO관리업체 총합계 포함'
            }
          </CardDescription>
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
                        {/* CSO관리업체 내 거래처별 데이터 */}
                        {csoGroup.customers.map((customer) => (
                          <>
                            {/* 거래처 상세 데이터 */}
                            {customer.rows.map((row, rowIdx) => (
                              <tr key={`${csoGroup.csoName}-${customer.customerName}-${rowIdx}`}>
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
                            {/* 거래처별 소계 - 거래처명 열(B열)에 표시 */}
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
                        {/* CSO관리업체 총합계 - CSO관리업체 열(A열)에 표시 */}
                        <tr className="bg-blue-50 font-bold border-b-2 border-blue-200" key={`total-${csoGroup.csoName}`}>
                          {displayColumns.map((col, colIdx) => (
                            <td key={col.column_key} className={typeof csoGroup.total[col.column_key as keyof typeof csoGroup.total] === 'number' ? 'text-right' : ''}>
                              {colIdx === (csoColumnIndex >= 0 ? csoColumnIndex : 0) ? (
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
                    <td colSpan={displayColumns.length} className="text-center py-8 text-muted-foreground">
                      {selectedCSO ? `${selectedCSO.company_name}의 데이터가 없습니다.` : '데이터가 없습니다.'}
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

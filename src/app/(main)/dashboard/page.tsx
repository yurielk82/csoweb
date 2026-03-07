'use client';

import {
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSettlementData } from '@/hooks/useSettlementData';
import { Skeleton } from '@/components/ui/skeleton';
import { SettlementFilters } from '@/components/settlement/SettlementFilters';
import { NoticeCard } from '@/components/settlement/NoticeCard';
import { SummaryCards } from '@/components/settlement/SummaryCards';
import { SettlementTable } from '@/components/settlement/SettlementTable';
import { SettlementPagination } from '@/components/settlement/SettlementPagination';

export default function DashboardPage() {
  const {
    initialLoading, dataLoading, downloading,
    data, columns, yearMonths, selectedMonth, selectedColumns,
    searchInput, searchQuery, page, noticeSettings,
    error, errorType,
    displayColumns, labelColumnIndex,
    setSelectedMonth, setSearchInput, setPage,
    fetchSettlements, handleSearch, handleKeyDown, toggleColumn, handleExport, replaceNoticeVars,
  } = useSettlementData();

  // 1. 초기 로딩 중 — 셸 + 스켈레톤
  if (initialLoading) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-7 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. 인증 오류
  if (errorType === 'auth') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {error || '세션이 만료되었거나 로그인이 필요합니다.'}
            </p>
            <Button variant="destructive" onClick={() => window.location.href = '/login'}>
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. 네트워크 오류
  if (errorType === 'network' && !data) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="border-border bg-muted">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">연결 오류</h2>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {error || '서버와 연결할 수 없습니다. 인터넷 연결을 확인해주세요.'}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. 정산서 미업로드 (매칭은 있으나 데이터 없음)
  if (errorType === 'no_data' && yearMonths.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="border-primary/20 bg-primary/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileSpreadsheet className="h-16 w-16 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">정산서가 아직 업로드되지 않았습니다</h2>
            <p className="text-muted-foreground text-center max-w-md">
              관리자가 정산서를 업로드하면 이곳에서 조회할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 5. CSO 매칭 없음
  if (errorType === 'no_matching') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="border-warning/20 bg-warning/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-16 w-16 text-warning mb-4" />
            <h2 className="text-xl font-semibold mb-2">조회 가능한 정산 데이터가 없습니다</h2>
            <p className="text-muted-foreground text-center max-w-md">
              현재 회원님의 사업자번호와 매칭된 정산 데이터가 없습니다.<br />
              관리자에게 문의하여 CSO 매칭 등록을 요청해주세요.
            </p>
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-foreground">
              <p><strong>문의 시 안내사항:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>가입 시 등록한 사업자번호 확인</li>
                <li>CSO 업체명 및 거래처명 확인</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <PageHeader />
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettlements} disabled={dataLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button onClick={handleExport} disabled={downloading || dataLoading || !data?.settlements.length}>
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            엑셀 다운로드
          </Button>
        </div>
      </div>

      <SettlementFilters
        yearMonths={yearMonths}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
        onKeyDown={handleKeyDown}
        dataLoading={dataLoading}
        columns={columns}
        selectedColumns={selectedColumns}
        onToggleColumn={toggleColumn}
      />

      {noticeSettings?.notice_content && (
        <NoticeCard content={noticeSettings.notice_content} replaceVars={replaceNoticeVars} />
      )}

      {data && <SummaryCards totals={data.totals} />}

      <SettlementTable
        settlements={data?.settlements}
        displayColumns={displayColumns}
        labelColumnIndex={labelColumnIndex}
        selectedMonth={selectedMonth}
        yearMonths={yearMonths}
        searchQuery={searchQuery}
      />

      {data && (
        <SettlementPagination
          pagination={data.pagination}
          page={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileSpreadsheet className="h-6 w-6" />
        정산서 조회
      </h1>
      <p className="text-muted-foreground">월별 정산 내역을 조회하고 다운로드하세요.</p>
    </div>
  );
}

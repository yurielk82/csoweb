'use client';

import {
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettlementData } from '@/hooks/useSettlementData';
import { useAuth } from '@/contexts/AuthContext';
import { SettlementFilters } from '@/components/settlement/SettlementFilters';
import { NoticeCard } from '@/components/settlement/NoticeCard';
import { SummaryCards } from '@/components/settlement/SummaryCards';
import { SettlementTable } from '@/components/settlement/SettlementTable';
import { SettlementPagination } from '@/components/settlement/SettlementPagination';
import {
  DashboardSkeleton,
  AuthErrorCard,
  NetworkErrorCard,
  NoDataCard,
  NoMatchingCard,
} from '@/components/settlement/DashboardStatusCards';

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  const {
    initialLoading, dataLoading, downloading,
    data, columns, yearMonths, selectedMonth, selectedColumns,
    searchInput, searchQuery, page, noticeSettings,
    error, errorType,
    displayColumns, labelColumnIndex,
    setSelectedMonth, setSearchInput, setPage,
    fetchSettlements, handleSearch, handleKeyDown, toggleColumn, handleExport, replaceNoticeVars,
  } = useSettlementData(isAdmin);

  const header = <PageHeader />;

  if (initialLoading) return <DashboardSkeleton header={header} />;
  if (errorType === 'auth') return <AuthErrorCard header={header} error={error} />;
  if (errorType === 'network' && !data) return <NetworkErrorCard header={header} error={error} />;
  if (errorType === 'no_data' && yearMonths.length === 0) return <NoDataCard header={header} />;
  if (errorType === 'no_matching') return <NoMatchingCard header={header} />;

  return (
    <div className="space-y-6">
      <DashboardHeader
        header={header}
        dataLoading={dataLoading}
        downloading={downloading}
        hasData={!!data?.settlements.length}
        onRefresh={fetchSettlements}
        onExport={handleExport}
      />

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

interface DashboardHeaderProps {
  header: React.ReactNode;
  dataLoading: boolean;
  downloading: boolean;
  hasData: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

function DashboardHeader({ header, dataLoading, downloading, hasData, onRefresh, onExport }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4">
      {header}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onRefresh} disabled={dataLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
        <Button onClick={onExport} disabled={downloading || dataLoading || !hasData}>
          {downloading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          엑셀 다운로드
        </Button>
      </div>
    </div>
  );
}

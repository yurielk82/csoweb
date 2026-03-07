'use client';

import { FileSpreadsheet, Loader2, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMasterData } from '@/hooks/useMasterData';
import { MasterFilters } from '@/components/admin/master/MasterFilters';
import { NoticeCard, NoticeEditDialog } from '@/components/admin/master/MasterNotice';
import { MasterPivotTable } from '@/components/admin/master/MasterPivotTable';
import { MasterSummary } from '@/components/admin/master/MasterSummary';
import { MasterPagination } from '@/components/admin/master/MasterPagination';

function EmptyState({ onSelectAll }: { onSelectAll: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <FileSpreadsheet className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-medium text-muted-foreground mb-2">거래처를 선택하여 조회를 시작하세요</h2>
        <p className="text-sm text-muted-foreground/70 text-center max-w-md mb-4">
          위 거래처 검색에서 특정 거래처를 선택하거나, &quot;전체 거래처&quot;를 선택하면 정산 데이터를 조회합니다.
        </p>
        <Button variant="outline" onClick={onSelectAll}>전체 거래처 조회</Button>
      </CardContent>
    </Card>
  );
}

export default function AdminMasterPage() {
  const m = useMasterData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            정산서 마스터 조회
            {m.initLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground">전체 CSO 업체의 월별 정산 내역을 조회하고 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={m.fetchSettlements} disabled={m.loading || !m.queryStarted}>
            <RefreshCw className={`h-4 w-4 mr-2 ${m.loading ? 'animate-spin' : ''}`} />새로고침
          </Button>
          <Button onClick={m.handleExport} disabled={m.downloading || !m.data?.settlements.length}>
            {m.downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            엑셀 다운로드
          </Button>
        </div>
      </div>

      <MasterFilters
        yearMonths={m.yearMonths} selectedMonth={m.selectedMonth} onMonthChange={(v) => { m.setSelectedMonth(v); m.setPage(1); }}
        csoProps={{ csoInputRef: m.csoInputRef, dropdownRef: m.dropdownRef, csoSearch: m.csoSearch, onCsoSearchChange: m.setCsoSearch, selectedCSO: m.selectedCSO, onCsoSelect: m.handleCsoSelect, onSelectAll: m.handleSelectAll, onClear: m.clearCsoSelection, showDropdown: m.showCsoDropdown, onShowDropdown: m.setShowCsoDropdown, csoLoading: m.csoLoading, filteredList: m.filteredCsoList, queryStarted: m.queryStarted }}
        search={m.search} onSearchChange={m.setSearch} onSearch={m.handleSearch} onSearchKeyDown={m.handleSearchKeyDown} loading={m.loading}
        selectedCSO={m.selectedCSO} onClearCso={m.clearCsoSelection} columns={m.columns} selectedColumns={m.selectedColumns} onToggleColumn={m.toggleColumn}
      />

      {m.noticeSettings?.notice_content && (
        <NoticeCard content={m.noticeSettings.notice_content} renderedContent={m.replaceNoticeVars(m.noticeSettings.notice_content)} onEdit={m.openNoticeDialog} />
      )}
      <NoticeEditDialog open={m.noticeDialogOpen} onOpenChange={m.setNoticeDialogOpen} content={m.noticeEditContent} onContentChange={m.setNoticeEditContent} saving={m.noticeSaving} onSave={m.handleNoticeSave} />

      {!m.queryStarted && !m.loading && <EmptyState onSelectAll={m.handleSelectAll} />}
      {m.loading && !m.data && (
        <Card><CardContent className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent></Card>
      )}
      {m.queryStarted && m.data && <MasterSummary data={m.data} />}

      <MasterPivotTable data={m.data} columns={m.columns} selectedColumns={m.selectedColumns} selectedCSO={m.selectedCSO} loading={m.loading} queryStarted={m.queryStarted} />
      {m.queryStarted && m.data && <MasterPagination data={m.data} page={m.page} onPageChange={m.setPage} />}
    </div>
  );
}

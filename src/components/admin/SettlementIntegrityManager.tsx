'use client';

import {
  Search,
  RefreshCw,
  Loader2,
  X,
  Download,
  Building2,
  Calendar,
  Trash2,
  Plus,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { useIntegrityData } from '@/hooks/useIntegrityData';
import { MappingStatusIcon, StatusBadge, CSOTag, AddCSOInput, formatBusinessNumber } from './settlement-integrity/CSOTagComponents';
import { IntegrityStatsCards } from './settlement-integrity/IntegrityStatsCards';
import { UploadDialog, DeleteDialog, AddMappingDialog } from './settlement-integrity/IntegrityDialogs';

export default function SettlementIntegrityManager() {
  const d = useIntegrityData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            거래처 매핑
          </h1>
          <p className="text-muted-foreground">
            사업자번호별 CSO관리업체명의 매핑 상태를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => d.setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            새 매핑 추가
          </Button>
          <Button variant="outline" onClick={() => d.setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            엑셀 업로드
          </Button>
          <Button variant="outline" onClick={d.fetchIntegrityData} disabled={d.loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', d.loading && 'animate-spin')} />
            새로고침
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <IntegrityStatsCards
        stats={d.stats}
        filterStatus={d.filterStatus}
        setScope={d.setScope}
        setFilterStatus={d.setFilterStatus}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="사업자번호, 사업자명, CSO업체명 검색 (Enter)"
                    value={d.searchInput}
                    onChange={(e) => d.setSearchInput(e.target.value)}
                    onKeyDown={d.handleSearchKeyDown}
                    className="pl-10 pr-10"
                  />
                  {d.searchInput && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={d.clearSearch}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button onClick={d.handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </div>
              {d.searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  &quot;{d.searchQuery}&quot; 검색 결과: {d.filteredData.length}건
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground whitespace-nowrap">마지막 정산월</span>
              <select
                value={d.selectedMonth}
                onChange={(e) => d.setSelectedMonth(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">전체</option>
                {d.availableMonths.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={d.handleExportIssues}
                disabled={d.stats.notRegistered + d.stats.noCso === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                문제항목 다운로드
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            검증 결과
            <Badge variant="secondary" className="ml-2">{d.filteredData.length}건</Badge>
          </CardTitle>
          <CardDescription>
            CSO관리업체명 태그를 클릭하여 편집하고, × 버튼으로 삭제, + 버튼으로 추가할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {d.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[140px]">사업자번호</TableHead>
                    <TableHead className="w-[160px]">사업자명</TableHead>
                    <TableHead className="w-[100px]">가입 상태</TableHead>
                    <TableHead className="min-w-[200px]">CSO 매핑</TableHead>
                    <TableHead className="w-[110px]">마지막정산월</TableHead>
                    <TableHead className="w-[80px] text-right">정산건수</TableHead>
                    <TableHead className="w-[60px] text-center">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.filteredData.map((row) => {
                    const isUnregistered = row.registration_status === 'unregistered' || row.registration_status === 'pending_approval';
                    const hasNoCso = row.cso_company_names.length === 0;

                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          isUnregistered && 'bg-amber-50 dark:bg-amber-950/30',
                          hasNoCso && !isUnregistered && 'bg-red-50 dark:bg-red-950/30',
                          row.saveState === 'saving' && 'border-l-4 border-l-yellow-400',
                          row.saveState === 'saved' && 'border-l-4 border-l-green-400',
                          row.saveState === 'error' && 'border-l-4 border-l-red-400'
                        )}
                      >
                        <TableCell className="font-mono text-sm bg-muted/30">
                          <div className="flex items-center gap-1">
                            <MappingStatusIcon row={row} />
                            <span className="text-gray-600 text-xs">{formatBusinessNumber(row.business_number)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="bg-muted/30">
                          <span className="text-sm truncate block">{row.business_name || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.registration_status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 items-center">
                            {row.cso_company_names.map((csoName, idx) => {
                              const existingBizNum = d.csoMapping[csoName];
                              const isDuplicate = existingBizNum && existingBizNum !== row.business_number;
                              return (
                                <CSOTag
                                  key={`${csoName}-${idx}`}
                                  value={csoName}
                                  isDuplicate={!!isDuplicate}
                                  duplicateInfo={isDuplicate ? formatBusinessNumber(existingBizNum) : undefined}
                                  onEdit={(newValue) => d.handleEditCSOTag(row.id, csoName, newValue)}
                                  onDelete={() => d.handleDeleteCSOTag(row.id, csoName)}
                                />
                              );
                            })}
                            <AddCSOInput onAdd={(value) => d.handleAddCSOTag(row.id, value)} />
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.last_settlement_month ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {row.last_settlement_month}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {row.row_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => {
                              d.setDeleteTarget(row);
                              d.setShowDeleteDialog(true);
                            }}
                            title="전체 매핑 삭제"
                            disabled={row.cso_company_names.length === 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {d.filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {d.searchQuery
                          ? `"${d.searchQuery}" 검색 결과가 없습니다.`
                          : d.filterStatus !== 'all'
                          ? '해당 상태의 항목이 없습니다.'
                          : '데이터가 없습니다.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UploadDialog
        open={d.showUploadDialog}
        onOpenChange={d.setShowUploadDialog}
        uploadFile={d.uploadFile}
        uploading={d.uploading}
        uploadProgress={d.uploadProgress}
        uploadPreview={d.uploadPreview}
        uploadDuplicatesRemoved={d.uploadDuplicatesRemoved}
        uploadRawCount={d.uploadRawCount}
        handleUpload={d.handleUpload}
        clearUploadFile={d.clearUploadFile}
        getRootProps={d.dropzone.getRootProps}
        getInputProps={d.dropzone.getInputProps}
        isDragActive={d.dropzone.isDragActive}
      />

      <DeleteDialog
        open={d.showDeleteDialog}
        onOpenChange={d.setShowDeleteDialog}
        deleteTarget={d.deleteTarget}
        deleting={d.deleting}
        onConfirm={d.handleDeleteRow}
      />

      <AddMappingDialog
        open={d.showAddDialog}
        onOpenChange={d.setShowAddDialog}
        unmappedRegisteredUsers={d.unmappedRegisteredUsers}
        selectedUnmappedBizNum={d.selectedUnmappedBizNum}
        setSelectedUnmappedBizNum={d.setSelectedUnmappedBizNum}
        newCsoName={d.newCsoName}
        setNewCsoName={d.setNewCsoName}
        addingRow={d.addingRow}
        onConfirm={d.handleAddNewRow}
      />
    </div>
  );
}

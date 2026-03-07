'use client';

import {
  RefreshCw,
  Building2,
  Plus,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useIntegrityData } from '@/hooks/useIntegrityData';
import { IntegrityStatsCards } from './settlement-integrity/IntegrityStatsCards';
import { IntegrityFilters } from './settlement-integrity/IntegrityFilters';
import { IntegrityTable } from './settlement-integrity/IntegrityTable';
import { UploadDialog, DeleteDialog, AddMappingDialog } from './settlement-integrity/IntegrityDialogs';

export default function SettlementIntegrityManager() {
  const d = useIntegrityData();

  return (
    <div className="space-y-6">
      <PageHeader
        loading={d.loading}
        onAddClick={() => d.setShowAddDialog(true)}
        onUploadClick={() => d.setShowUploadDialog(true)}
        onRefresh={d.fetchIntegrityData}
      />

      <IntegrityStatsCards
        stats={d.stats}
        filterStatus={d.filterStatus}
        setScope={d.setScope}
        setFilterStatus={d.setFilterStatus}
      />

      <IntegrityFilters
        searchInput={d.searchInput}
        setSearchInput={d.setSearchInput}
        handleSearchKeyDown={d.handleSearchKeyDown}
        clearSearch={d.clearSearch}
        handleSearch={d.handleSearch}
        searchQuery={d.searchQuery}
        filteredCount={d.filteredData.length}
        selectedMonth={d.selectedMonth}
        setSelectedMonth={d.setSelectedMonth}
        availableMonths={d.availableMonths}
        handleExportIssues={d.handleExportIssues}
        issueCount={d.stats.notRegistered + d.stats.noCso}
      />

      <IntegrityTable
        loading={d.loading}
        filteredData={d.filteredData}
        searchQuery={d.searchQuery}
        filterStatus={d.filterStatus}
        csoMapping={d.csoMapping}
        handleEditCSOTag={d.handleEditCSOTag}
        handleDeleteCSOTag={d.handleDeleteCSOTag}
        handleAddCSOTag={d.handleAddCSOTag}
        setDeleteTarget={d.setDeleteTarget}
        setShowDeleteDialog={d.setShowDeleteDialog}
      />

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

interface PageHeaderProps {
  loading: boolean;
  onAddClick: () => void;
  onUploadClick: () => void;
  onRefresh: () => void;
}

function PageHeader({ loading, onAddClick, onUploadClick, onRefresh }: PageHeaderProps) {
  return (
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
        <Button variant="outline" onClick={onAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          새 매핑 추가
        </Button>
        <Button variant="outline" onClick={onUploadClick}>
          <Upload className="h-4 w-4 mr-2" />
          엑셀 업로드
        </Button>
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          새로고침
        </Button>
      </div>
    </div>
  );
}

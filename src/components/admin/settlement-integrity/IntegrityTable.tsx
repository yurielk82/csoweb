'use client';

import { Loader2, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { IntegrityRow } from './types';
import { MappingStatusIcon, StatusBadge, CSOTag, AddCSOInput, formatBusinessNumber } from './CSOTagComponents';

interface IntegrityTableProps {
  loading: boolean;
  filteredData: IntegrityRow[];
  searchQuery: string;
  filterStatus: string;
  csoMapping: Record<string, string>;
  handleEditCSOTag: (id: string, oldName: string, newName: string) => void;
  handleDeleteCSOTag: (id: string, name: string) => void;
  handleAddCSOTag: (id: string, name: string) => void;
  setDeleteTarget: (row: IntegrityRow) => void;
  setShowDeleteDialog: (v: boolean) => void;
}

export function IntegrityTable({
  loading, filteredData, searchQuery, filterStatus, csoMapping,
  handleEditCSOTag, handleDeleteCSOTag, handleAddCSOTag,
  setDeleteTarget, setShowDeleteDialog,
}: IntegrityTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          검증 결과
          <Badge variant="secondary" className="ml-2">{filteredData.length}건</Badge>
        </CardTitle>
        <CardDescription>
          CSO관리업체명 태그를 클릭하여 편집하고, x 버튼으로 삭제, + 버튼으로 추가할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
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
                  {filteredData.map((row) => (
                    <IntegrityTableRow
                      key={row.id}
                      row={row}
                      csoMapping={csoMapping}
                      handleEditCSOTag={handleEditCSOTag}
                      handleDeleteCSOTag={handleDeleteCSOTag}
                      handleAddCSOTag={handleAddCSOTag}
                      setDeleteTarget={setDeleteTarget}
                      setShowDeleteDialog={setShowDeleteDialog}
                    />
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {searchQuery
                          ? `"${searchQuery}" 검색 결과가 없습니다.`
                          : filterStatus !== 'all'
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
  );
}

interface IntegrityTableRowProps {
  row: IntegrityRow;
  csoMapping: Record<string, string>;
  handleEditCSOTag: (id: string, oldName: string, newName: string) => void;
  handleDeleteCSOTag: (id: string, name: string) => void;
  handleAddCSOTag: (id: string, name: string) => void;
  setDeleteTarget: (row: IntegrityRow) => void;
  setShowDeleteDialog: (v: boolean) => void;
}

function IntegrityTableRow({
  row, csoMapping, handleEditCSOTag, handleDeleteCSOTag, handleAddCSOTag,
  setDeleteTarget, setShowDeleteDialog,
}: IntegrityTableRowProps) {
  const isUnregistered = row.registration_status === 'unregistered' || row.registration_status === 'pending_approval';
  const hasNoCso = row.cso_company_names.length === 0;

  return (
    <TableRow
      className={cn(
        isUnregistered && 'bg-amber-50 dark:bg-amber-950/30',
        hasNoCso && !isUnregistered && 'bg-red-50 dark:bg-red-950/30',
        row.saveState === 'saving' && 'border-l-4 border-l-yellow-400',
        row.saveState === 'saved' && 'border-l-4 border-l-green-400',
        row.saveState === 'error' && 'border-l-4 border-l-red-400',
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
            const existingBizNum = csoMapping[csoName];
            const isDuplicate = existingBizNum && existingBizNum !== row.business_number;
            return (
              <CSOTag
                key={`${csoName}-${idx}`}
                value={csoName}
                isDuplicate={!!isDuplicate}
                duplicateInfo={isDuplicate ? formatBusinessNumber(existingBizNum) : undefined}
                onEdit={(newValue) => handleEditCSOTag(row.id, csoName, newValue)}
                onDelete={() => handleDeleteCSOTag(row.id, csoName)}
              />
            );
          })}
          <AddCSOInput onAdd={(value) => handleAddCSOTag(row.id, value)} />
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
          onClick={() => { setDeleteTarget(row); setShowDeleteDialog(true); }}
          title="전체 매핑 삭제"
          disabled={row.cso_company_names.length === 0}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

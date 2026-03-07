import { Search, Loader2, Download, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterType } from '@/hooks/useMembers';

interface MemberFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: FilterType;
  onFilterChange: (value: FilterType) => void;
  pendingCount: number;
  selectedCount: number;
  batchProcessing: boolean;
  onBatchApprove: () => void;
  exporting: boolean;
  onExport: () => void;
  filteredCount: number;
}

export function MemberFilters({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  pendingCount,
  selectedCount,
  batchProcessing,
  onBatchApprove,
  exporting,
  onExport,
  filteredCount,
}: MemberFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="업체명, 사업자번호, 이메일 검색..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filter} onValueChange={(v) => onFilterChange(v as FilterType)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="admin">관리자</SelectItem>
              <SelectItem value="approved">승인됨</SelectItem>
              <SelectItem value="pending">대기중</SelectItem>
            </SelectContent>
          </Select>
          {filter === 'pending' && pendingCount > 0 && (
            <Button onClick={onBatchApprove} disabled={selectedCount === 0 || batchProcessing}>
              {batchProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckSquare className="h-4 w-4 mr-2" />
              )}
              일괄 승인 ({selectedCount})
            </Button>
          )}
          <Button variant="outline" onClick={onExport} disabled={exporting || filteredCount === 0}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            엑셀 다운로드
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

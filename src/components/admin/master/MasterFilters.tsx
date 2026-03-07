import type { Ref } from 'react';
import { Search, Building2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ColumnSetting } from '@/types';
import type { CSOOption } from '@/hooks/useMasterData';

// ── CSO 검색 드롭다운 ──

interface CsoSearchDropdownProps {
  csoInputRef: Ref<HTMLInputElement>;
  dropdownRef: Ref<HTMLDivElement>;
  csoSearch: string;
  onCsoSearchChange: (v: string) => void;
  selectedCSO: CSOOption | null;
  onCsoSelect: (cso: CSOOption) => void;
  onSelectAll: () => void;
  onClear: () => void;
  showDropdown: boolean;
  onShowDropdown: (v: boolean) => void;
  csoLoading: boolean;
  filteredList: CSOOption[];
  queryStarted: boolean;
}

function CsoSearchDropdown({
  csoInputRef, dropdownRef, csoSearch, onCsoSearchChange,
  selectedCSO, onCsoSelect, onSelectAll, onClear,
  showDropdown, onShowDropdown, csoLoading, filteredList, queryStarted,
}: CsoSearchDropdownProps) {
  return (
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
            onCsoSearchChange(e.target.value);
            onShowDropdown(true);
            if (!e.target.value) onClear();
          }}
          onFocus={() => onShowDropdown(true)}
          className="pl-10 pr-8"
        />
        {selectedCSO && (
          <button onClick={onClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div ref={dropdownRef} className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-popover border rounded-md shadow-lg">
          {csoLoading ? (
            <div className="p-3 text-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              로딩 중...
            </div>
          ) : filteredList.length > 0 ? (
            <>
              <div
                className={`p-3 cursor-pointer hover:bg-muted border-b ${!selectedCSO && queryStarted ? 'bg-primary/10' : ''}`}
                onClick={onSelectAll}
              >
                <div className="font-medium">전체 거래처</div>
                <div className="text-xs text-muted-foreground">모든 CSO 업체 조회</div>
              </div>
              {filteredList.map(cso => (
                <div
                  key={cso.business_number}
                  className={`p-3 cursor-pointer hover:bg-muted ${selectedCSO?.business_number === cso.business_number ? 'bg-primary/10' : ''}`}
                  onClick={() => onCsoSelect(cso)}
                >
                  <div className="font-medium">{cso.company_name}</div>
                  <div className="text-xs text-muted-foreground">{cso.business_number}</div>
                </div>
              ))}
            </>
          ) : (
            <div className="p-3 text-center text-muted-foreground">검색 결과가 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MasterFilters ──

interface MasterFiltersProps {
  yearMonths: string[];
  selectedMonth: string;
  onMonthChange: (v: string) => void;
  csoProps: CsoSearchDropdownProps;
  search: string;
  onSearchChange: (v: string) => void;
  onSearch: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  loading: boolean;
  selectedCSO: CSOOption | null;
  onClearCso: () => void;
  columns: ColumnSetting[];
  selectedColumns: string[];
  onToggleColumn: (key: string) => void;
}

export function MasterFilters({
  yearMonths, selectedMonth, onMonthChange, csoProps,
  search, onSearchChange, onSearch, onSearchKeyDown, loading,
  selectedCSO, onClearCso, columns, selectedColumns, onToggleColumn,
}: MasterFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">조회 조건</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-48">
            <Label className="mb-2 block">정산월</Label>
            <Select value={selectedMonth} onValueChange={onMonthChange}>
              <SelectTrigger><SelectValue placeholder="정산월 선택" /></SelectTrigger>
              <SelectContent>
                {yearMonths.map(ym => <SelectItem key={ym} value={ym}>{ym}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <CsoSearchDropdown {...csoProps} />

          <div className="flex-1">
            <Label className="mb-2 block">제품/거래처 검색</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="제품명, 거래처명 검색..." value={search} onChange={(e) => onSearchChange(e.target.value)} onKeyDown={onSearchKeyDown} className="pl-10" />
              </div>
              <Button variant="outline" onClick={onSearch} disabled={loading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {selectedCSO && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              선택된 거래처: {selectedCSO.company_name} ({selectedCSO.business_number})
            </span>
            <Button variant="ghost" size="sm" onClick={onClearCso} className="ml-auto h-6 px-2">
              <X className="h-3 w-3 mr-1" />해제
            </Button>
          </div>
        )}

        <div>
          <Label className="mb-2 block">표시할 항목</Label>
          <div className="flex flex-wrap gap-3">
            {columns.map(col => (
              <div key={col.column_key} className="flex items-center space-x-2">
                <Checkbox
                  id={col.column_key}
                  checked={selectedColumns.includes(col.column_key)}
                  onCheckedChange={() => onToggleColumn(col.column_key)}
                  disabled={col.is_required}
                />
                <label htmlFor={col.column_key} className="text-sm cursor-pointer flex items-center gap-1">
                  {col.column_name}
                  {col.is_required && <Badge variant="secondary" className="text-xs">필수</Badge>}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

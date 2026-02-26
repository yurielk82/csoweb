import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { ColumnSetting } from '@/types';

interface SettlementFiltersProps {
  yearMonths: string[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  dataLoading: boolean;
  columns: ColumnSetting[];
  selectedColumns: string[];
  onToggleColumn: (key: string) => void;
}

export function SettlementFilters({
  yearMonths, selectedMonth, onMonthChange,
  searchInput, onSearchInputChange, onSearch, onKeyDown,
  dataLoading, columns, selectedColumns, onToggleColumn,
}: SettlementFiltersProps) {
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
          <div className="flex-1">
            <Label className="mb-2 block">검색</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="제품명, 거래처명 입력 후 Enter를 누르세요"
                  value={searchInput}
                  onChange={(e) => onSearchInputChange(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={onSearch} disabled={dataLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

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

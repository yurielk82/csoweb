import { Search, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface IntegrityFiltersProps {
  searchInput: string;
  setSearchInput: (v: string) => void;
  handleSearchKeyDown: (e: React.KeyboardEvent) => void;
  clearSearch: () => void;
  handleSearch: () => void;
  searchQuery: string;
  filteredCount: number;
  selectedMonth: string;
  setSelectedMonth: (v: string) => void;
  availableMonths: string[];
  handleExportIssues: () => void;
  issueCount: number;
}

export function IntegrityFilters({
  searchInput, setSearchInput, handleSearchKeyDown, clearSearch,
  handleSearch, searchQuery, filteredCount,
  selectedMonth, setSelectedMonth, availableMonths,
  handleExportIssues, issueCount,
}: IntegrityFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <SearchBar
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            handleSearchKeyDown={handleSearchKeyDown}
            clearSearch={clearSearch}
            handleSearch={handleSearch}
            searchQuery={searchQuery}
            filteredCount={filteredCount}
          />
          <MonthFilter
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            availableMonths={availableMonths}
            handleExportIssues={handleExportIssues}
            issueCount={issueCount}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface SearchBarProps {
  searchInput: string;
  setSearchInput: (v: string) => void;
  handleSearchKeyDown: (e: React.KeyboardEvent) => void;
  clearSearch: () => void;
  handleSearch: () => void;
  searchQuery: string;
  filteredCount: number;
}

function SearchBar({ searchInput, setSearchInput, handleSearchKeyDown, clearSearch, handleSearch, searchQuery, filteredCount }: SearchBarProps) {
  return (
    <div className="flex-1">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="사업자번호, 사업자명, CSO업체명 검색 (Enter)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10 pr-10"
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          검색
        </Button>
      </div>
      {searchQuery && (
        <p className="text-sm text-muted-foreground mt-2">
          &quot;{searchQuery}&quot; 검색 결과: {filteredCount}건
        </p>
      )}
    </div>
  );
}

interface MonthFilterProps {
  selectedMonth: string;
  setSelectedMonth: (v: string) => void;
  availableMonths: string[];
  handleExportIssues: () => void;
  issueCount: number;
}

function MonthFilter({ selectedMonth, setSelectedMonth, availableMonths, handleExportIssues, issueCount }: MonthFilterProps) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm text-muted-foreground whitespace-nowrap">마지막 정산월</span>
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">전체</option>
        {availableMonths.map((month) => (
          <option key={month} value={month}>{month}</option>
        ))}
      </select>
      <Button
        variant="outline"
        onClick={handleExportIssues}
        disabled={issueCount === 0}
      >
        <Download className="h-4 w-4 mr-2" />
        문제항목 다운로드
      </Button>
    </div>
  );
}

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SettlementPaginationProps {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  page: number;
  onPageChange: (page: number) => void;
}

export function SettlementPagination({ pagination, page, onPageChange }: SettlementPaginationProps) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        총 {pagination.total.toLocaleString()}건 중{' '}
        {((pagination.page - 1) * pagination.pageSize + 1).toLocaleString()}
        -{Math.min(pagination.page * pagination.pageSize, pagination.total).toLocaleString()}건
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">
          {page} / {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(pagination.totalPages, page + 1))}
          disabled={page === pagination.totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

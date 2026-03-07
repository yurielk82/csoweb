import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function SummaryCardSkeleton({ accent = false }: { accent?: boolean }) {
  return (
    <div className={`glass-kpi-card${accent ? ' border-primary/20' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-8 w-28" />
      {accent && <Skeleton className="h-3 w-40 mt-1" />}
    </div>
  );
}

export function SettlementSkeleton() {
  return (
    <div className="space-y-6">
      {/* 요약 카드 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton accent />
      </div>

      {/* 테이블 스켈레톤 */}
      <div className="glass-chart-card overflow-hidden p-0">
        <div className="px-5 pt-5 pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56 mt-1.5" />
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              {Array.from({ length: 7 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

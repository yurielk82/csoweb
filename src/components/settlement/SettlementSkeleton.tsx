import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>
          <Skeleton className="h-4 w-16" />
        </CardDescription>
        <Skeleton className="h-8 w-28" />
      </CardHeader>
    </Card>
  );
}

function TableRowSkeleton({ columns = 7 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-2">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SettlementSkeleton() {
  return (
    <div className="space-y-6">
      {/* 요약 카드 3개: 수량 / 금액 / 수수료 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardDescription>
              <Skeleton className="h-4 w-24" />
            </CardDescription>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-40 mt-1" />
          </CardHeader>
        </Card>
      </div>

      {/* 테이블 스켈레톤 */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <th key={i} className="p-2">
                      <Skeleton className="h-4 w-full" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

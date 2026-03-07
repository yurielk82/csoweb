'use client';

import { Database, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDataManagement } from '@/hooks/useDataManagement';
import { DataStatsCards } from '@/components/admin/data/DataStatsCards';
import { DataMonthTable } from '@/components/admin/data/DataMonthTable';

export default function DataManagementPage() {
  const d = useDataManagement();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            정산 데이터 관리
            {d.loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground">업로드된 정산 데이터를 정산월 기준으로 관리합니다.</p>
        </div>
        <Button variant="outline" onClick={d.fetchData} disabled={d.loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${d.loading ? 'animate-spin' : ''}`} />새로고침
        </Button>
      </div>

      <DataStatsCards totalRows={d.totalStats.totalRows} totalMonths={d.totalStats.totalMonths} totalBusinesses={d.totalStats.totalBusinesses} />

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>주의사항</AlertTitle>
        <AlertDescription>
          정산월 데이터를 삭제하면 해당 월의 모든 정산 내역이 삭제됩니다. 같은 정산월 데이터를 다시 업로드하면 기존 데이터가 자동으로 교체됩니다.
        </AlertDescription>
      </Alert>

      <DataMonthTable data={d.data} loading={d.loading} onDelete={d.setDeleteMonth} />

      <Dialog open={!!d.deleteMonth} onOpenChange={() => d.setDeleteMonth(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />정산 데이터 삭제
            </DialogTitle>
            <DialogDescription className="pt-2">
              <strong>{d.deleteMonth}</strong> 정산월의 모든 데이터를 삭제하시겠습니까?
              <br /><br />이 작업은 되돌릴 수 없으며, 해당 월의 모든 정산 내역이 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => d.setDeleteMonth(null)}>취소</Button>
            <Button variant="destructive" onClick={d.handleDelete} disabled={d.deleting}>
              {d.deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Database, Calendar, Trash2, RefreshCw, Loader2, FileSpreadsheet, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/shared/loading';

interface SettlementMonthData {
  month: string;
  prescriptionMonth: string;
  count: number;
  csoCount: number;
  totalQuantity: number;
  totalAmount: number;
  totalCommission: number;
}

export default function DataManagementPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SettlementMonthData[]>([]);
  const [totalStats, setTotalStats] = useState({ totalRows: 0, totalMonths: 0, totalBusinesses: 0 });
  
  // Delete dialog
  const [deleteMonth, setDeleteMonth] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settlements/stats');
      const result = await res.json();
      if (result.success) {
        setData(result.data.months);
        setTotalStats({
          totalRows: result.data.totalRows,
          totalMonths: result.data.months.length,
          totalBusinesses: result.data.totalBusinesses,
        });
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!deleteMonth) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/settlements/month/${encodeURIComponent(deleteMonth)}`, {
        method: 'DELETE',
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast({
          title: '삭제 완료',
          description: `${deleteMonth} 정산 데이터가 삭제되었습니다. (${result.data.deletedCount.toLocaleString()}건)`,
        });
        setDeleteMonth(null);
        fetchData();
      } else {
        toast({
          variant: 'destructive',
          title: '삭제 실패',
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '데이터 삭제 중 오류가 발생했습니다.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString('ko-KR');
  const formatCurrency = (num: number) => num.toLocaleString('ko-KR') + '원';

  if (loading) {
    return <Loading text="정산 데이터를 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            정산 데이터 관리
          </h1>
          <p className="text-muted-foreground">업로드된 정산 데이터를 정산월 기준으로 관리합니다.</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              총 데이터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.totalRows)}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              정산월 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalMonths}개월</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              관련 업체 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.totalBusinesses)}개</div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>주의사항</AlertTitle>
        <AlertDescription>
          정산월 데이터를 삭제하면 해당 월의 모든 정산 내역이 삭제됩니다. 
          같은 정산월 데이터를 다시 업로드하면 기존 데이터가 자동으로 교체됩니다.
        </AlertDescription>
      </Alert>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">정산월별 데이터</CardTitle>
          <CardDescription>각 정산월의 데이터 현황을 확인하고 관리할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>정산월</TableHead>
                <TableHead>처방월</TableHead>
                <TableHead className="text-right">CSO관리업체 수</TableHead>
                <TableHead className="text-right">수량 합계</TableHead>
                <TableHead className="text-right">금액 합계</TableHead>
                <TableHead className="text-right">제약수수료 합계</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.month}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      <Calendar className="h-3 w-3 mr-1" />
                      {item.month}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {item.prescriptionMonth || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(item.csoCount)}개
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatNumber(item.totalQuantity)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-blue-600">
                    {formatCurrency(item.totalCommission)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteMonth(item.month)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    업로드된 정산 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={!!deleteMonth} onOpenChange={() => setDeleteMonth(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              정산 데이터 삭제
            </DialogTitle>
            <DialogDescription className="pt-2">
              <strong>{deleteMonth}</strong> 정산월의 모든 데이터를 삭제하시겠습니까?
              <br /><br />
              이 작업은 되돌릴 수 없으며, 해당 월의 모든 정산 내역이 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMonth(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

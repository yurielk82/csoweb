'use client';

import { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Loader2, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/shared/loading';
import { useToast } from '@/hooks/use-toast';

interface PendingUser {
  id: string;
  business_number: string;
  company_name: string;
  email: string;
  created_at: string;
}

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    user: PendingUser | null;
  }>({ open: false, user: null });
  const [rejectReason, setRejectReason] = useState('');

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users?pending=true');
      const result = await response.json();
      
      if (result.success) {
        setPendingUsers(result.data);
      }
    } catch (error) {
      console.error('Fetch pending users error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApprove = async (user: PendingUser) => {
    setProcessing(user.business_number);
    try {
      const response = await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_number: user.business_number }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '승인 완료',
          description: `${user.company_name}의 회원가입이 승인되었습니다.`,
        });
        setPendingUsers(prev => prev.filter(u => u.business_number !== user.business_number));
      } else {
        toast({
          variant: 'destructive',
          title: '승인 실패',
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '승인 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.user) return;

    const user = rejectDialog.user;
    setProcessing(user.business_number);

    try {
      const response = await fetch('/api/users/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_number: user.business_number,
          reason: rejectReason || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '거부 완료',
          description: `${user.company_name}의 회원가입이 거부되었습니다.`,
        });
        setPendingUsers(prev => prev.filter(u => u.business_number !== user.business_number));
      } else {
        toast({
          variant: 'destructive',
          title: '거부 실패',
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '거부 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setProcessing(null);
      setRejectDialog({ open: false, user: null });
      setRejectReason('');
    }
  };

  const formatBusinessNumber = (num: string) => {
    if (num.length === 10) {
      return `${num.slice(0, 3)}-${num.slice(3, 5)}-${num.slice(5)}`;
    }
    return num;
  };

  if (loading) {
    return <Loading text="승인 대기 목록을 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            회원 승인
          </h1>
          <p className="text-muted-foreground">회원가입 신청을 승인하거나 거부합니다.</p>
        </div>
        <Button variant="outline" onClick={fetchPendingUsers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Pending Count */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          {pendingUsers.length > 0 
            ? `${pendingUsers.length}건의 승인 대기 중인 신청이 있습니다.`
            : '승인 대기 중인 신청이 없습니다.'
          }
        </AlertDescription>
      </Alert>

      {/* Pending Users List */}
      {pendingUsers.length > 0 ? (
        <div className="grid gap-4">
          {pendingUsers.map(user => (
            <Card key={user.business_number}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{user.company_name}</CardTitle>
                    <CardDescription className="mt-1">
                      {formatBusinessNumber(user.business_number)}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    대기중
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>이메일: {user.email}</p>
                    <p>신청일: {new Date(user.created_at).toLocaleString('ko-KR')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setRejectDialog({ open: true, user })}
                      disabled={processing === user.business_number}
                    >
                      {processing === user.business_number ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      거부
                    </Button>
                    <Button
                      onClick={() => handleApprove(user)}
                      disabled={processing === user.business_number}
                    >
                      {processing === user.business_number ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      승인
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>승인 대기 중인 회원가입 신청이 없습니다.</p>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog 
        open={rejectDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({ open: false, user: null });
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원가입 거부</DialogTitle>
            <DialogDescription>
              {rejectDialog.user?.company_name}의 회원가입을 거부합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">거부 사유 (선택)</Label>
            <Textarea
              id="reason"
              placeholder="거부 사유를 입력하세요..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, user: null })}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing !== null}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              거부
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

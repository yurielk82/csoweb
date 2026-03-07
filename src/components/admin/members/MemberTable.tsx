import { Edit, Trash2, Shield, Loader2, UserCheck, UserX, KeyRound, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { User, FilterType } from '@/hooks/useMembers';
import { formatPhoneNumber } from '@/components/admin/members/utils';

interface MemberTableProps {
  users: User[];
  filter: FilterType;
  loading: boolean;
  selectedUsers: Set<string>;
  batchProcessing: boolean;
  processing: string | null;
  onToggleSelect: (bn: string) => void;
  onToggleSelectAll: () => void;
  onApprove: (user: User) => void;
  onReject: (user: User) => void;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDelete: (user: User) => void;
}

function StatusBadge({ user }: { user: User }) {
  if (user.is_admin) {
    return (
      <Badge variant="default" className="bg-purple-600">
        <Shield className="h-3 w-3 mr-1" />
        관리자
      </Badge>
    );
  }
  if (user.is_approved) {
    return (
      <Badge variant="default" className="bg-green-600">
        <UserCheck className="h-3 w-3 mr-1" />
        승인됨
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <UserX className="h-3 w-3 mr-1" />
      대기중
    </Badge>
  );
}

function ActionButtons({
  user, processing, batchProcessing, onApprove, onReject, onEdit, onResetPassword, onDelete,
}: {
  user: User;
  processing: string | null;
  batchProcessing: boolean;
  onApprove: (user: User) => void;
  onReject: (user: User) => void;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  const isProcessing = processing === user.business_number;
  return (
    <div className="flex justify-end gap-1">
      {!user.is_approved && !user.is_admin && (
        <>
          <Button variant="ghost" size="icon" onClick={() => onApprove(user)} disabled={isProcessing || batchProcessing} title="승인" className="text-green-600 hover:text-green-700">
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onReject(user)} disabled={isProcessing || batchProcessing} title="거부" className="text-red-600 hover:text-red-700">
            <XCircle className="h-4 w-4" />
          </Button>
        </>
      )}
      <Button variant="ghost" size="icon" onClick={() => onEdit(user)} title="정보 수정">
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onResetPassword(user)} title="비밀번호 초기화" className="text-yellow-600 hover:text-yellow-700">
        <KeyRound className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(user)} className="text-destructive hover:text-destructive" title="삭제">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function MemberTable({
  users, filter, loading, selectedUsers, batchProcessing, processing,
  onToggleSelect, onToggleSelectAll, onApprove, onReject, onEdit, onResetPassword, onDelete,
}: MemberTableProps) {
  const isPending = filter === 'pending';
  const colSpan = isPending ? 9 : 8;

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {isPending && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedUsers.size > 0 && selectedUsers.size === users.length}
                    onCheckedChange={onToggleSelectAll}
                    disabled={batchProcessing}
                  />
                </TableHead>
              )}
              <TableHead>업체명</TableHead>
              <TableHead>대표자</TableHead>
              <TableHead>사업자번호</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                {isPending && (
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(user.business_number)}
                      onCheckedChange={() => onToggleSelect(user.business_number)}
                      disabled={batchProcessing}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{user.company_name}</TableCell>
                <TableCell>{user.ceo_name || '-'}</TableCell>
                <TableCell>{user.business_number}</TableCell>
                <TableCell>{formatPhoneNumber(user.phone1)}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><div className="flex gap-1"><StatusBadge user={user} /></div></TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString('ko-KR')}</TableCell>
                <TableCell className="text-right">
                  <ActionButtons
                    user={user} processing={processing} batchProcessing={batchProcessing}
                    onApprove={onApprove} onReject={onReject} onEdit={onEdit}
                    onResetPassword={onResetPassword} onDelete={onDelete}
                  />
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      불러오는 중...
                    </span>
                  ) : '회원이 없습니다.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Edit, Trash2, Shield, ShieldOff, Loader2, UserCheck, UserX, Download, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/shared/loading';

interface User {
  id: string;
  business_number: string;
  company_name: string;
  ceo_name: string;
  zipcode: string;
  address1: string;
  address2?: string;
  phone1: string;
  phone2?: string;
  email: string;
  email2?: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
}

export default function MembersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'approved' | 'pending'>('all');
  
  // Edit dialog
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ 
    company_name: '', 
    ceo_name: '',
    zipcode: '',
    address1: '',
    address2: '',
    phone1: '',
    phone2: '',
    email: '', 
    email2: '',
    is_admin: false, 
    is_approved: false 
  });

  // 주소 포맷 함수 (엑셀 다운로드용)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatAddress = (user: User) => {
    if (!user.zipcode && !user.address1) return '-';
    const parts = [];
    if (user.zipcode) parts.push(`(${user.zipcode})`);
    if (user.address1) parts.push(user.address1);
    if (user.address2) parts.push(user.address2);
    return parts.join(' ');
  };
  const [saving, setSaving] = useState(false);
  
  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Password reset dialog
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetting, setResetting] = useState(false);

  // 전화번호 포맷 함수 (00-0000-0000, 000-0000-0000 모두 지원)
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '-';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 8) {
      // 00-0000-0000 형태 (지역번호 없는 경우)
      return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    } else if (digits.length === 9) {
      // 00-000-0000 형태
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    } else if (digits.length === 10) {
      // 00-0000-0000 또는 000-000-0000 형태
      if (digits.startsWith('02')) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
      }
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11) {
      // 000-0000-0000 형태
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    return phone; // 원본 반환
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const result = await res.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: User) => {
    setEditUser(user);
    setEditForm({
      company_name: user.company_name,
      ceo_name: user.ceo_name || '',
      zipcode: user.zipcode || '',
      address1: user.address1 || '',
      address2: user.address2 || '',
      phone1: user.phone1 || '',
      phone2: user.phone2 || '',
      email: user.email,
      email2: user.email2 || '',
      is_admin: user.is_admin,
      is_approved: user.is_approved,
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editUser.business_number}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast({
          title: '수정 완료',
          description: '회원 정보가 수정되었습니다.',
        });
        setEditUser(null);
        fetchUsers();
      } else {
        toast({
          variant: 'destructive',
          title: '수정 실패',
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '회원 수정 중 오류가 발생했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  // 엑셀 다운로드
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // 동적으로 xlsx 라이브러리 로드
      const XLSX = await import('xlsx');
      
      // 엑셀 데이터 준비
      const exportData = filteredUsers.map(user => ({
        '업체명': user.company_name,
        '대표자명': user.ceo_name || '',
        '사업자번호': user.business_number,
        '우편번호': user.zipcode || '',
        '주소': user.address1 || '',
        '상세주소': user.address2 || '',
        '연락처1': user.phone1 || '',
        '연락처2': user.phone2 || '',
        '이메일': user.email,
        '이메일2': user.email2 || '',
        '상태': user.is_admin ? '관리자' : (user.is_approved ? '승인됨' : '대기중'),
        '가입일': new Date(user.created_at).toLocaleDateString('ko-KR'),
      }));
      
      // 워크시트 생성
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // 컬럼 너비 설정
      ws['!cols'] = [
        { wch: 20 }, // 업체명
        { wch: 10 }, // 대표자명
        { wch: 15 }, // 사업자번호
        { wch: 8 },  // 우편번호
        { wch: 35 }, // 주소
        { wch: 20 }, // 상세주소
        { wch: 15 }, // 연락처1
        { wch: 15 }, // 연락처2
        { wch: 25 }, // 이메일
        { wch: 25 }, // 이메일2
        { wch: 10 }, // 상태
        { wch: 12 }, // 가입일
      ];
      
      // 워크북 생성
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '회원목록');
      
      // 파일 다운로드
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `회원목록_${today}.xlsx`);
      
      toast({
        title: '다운로드 완료',
        description: `${filteredUsers.length}명의 회원 정보가 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: 'destructive',
        title: '다운로드 실패',
        description: '엑셀 파일 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.business_number}`, {
        method: 'DELETE',
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast({
          title: '삭제 완료',
          description: '회원이 삭제되었습니다.',
        });
        setDeleteUser(null);
        fetchUsers();
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
        description: '회원 삭제 중 오류가 발생했습니다.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // 비밀번호 초기화
  const handleResetPassword = async () => {
    if (!resetUser) return;
    
    setResetting(true);
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_number: resetUser.business_number }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast({
          title: '비밀번호 초기화 완료',
          description: `${result.data.company_name}의 비밀번호가 초기화되었습니다. (새 비밀번호: ${result.data.new_password_hint})`,
        });
        setResetUser(null);
      } else {
        toast({
          variant: 'destructive',
          title: '초기화 실패',
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '비밀번호 초기화 중 오류가 발생했습니다.',
      });
    } finally {
      setResetting(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    // Search filter
    const searchMatch = !search || 
      user.company_name.toLowerCase().includes(search.toLowerCase()) ||
      user.business_number.includes(search) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    
    // Type filter
    let typeMatch = true;
    if (filter === 'admin') typeMatch = user.is_admin;
    else if (filter === 'approved') typeMatch = user.is_approved && !user.is_admin;
    else if (filter === 'pending') typeMatch = !user.is_approved && !user.is_admin;
    
    return searchMatch && typeMatch;
  });

  // Stats
  const stats = {
    total: users.length,
    admins: users.filter(u => u.is_admin).length,
    approved: users.filter(u => u.is_approved && !u.is_admin).length,
    pending: users.filter(u => !u.is_approved && !u.is_admin).length,
  };

  if (loading) {
    return <Loading text="회원 목록을 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          회원 관리
        </h1>
        <p className="text-muted-foreground">전체 회원을 조회하고 관리합니다.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('all')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">전체</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('admin')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">관리자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('approved')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">승인됨</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter('pending')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">대기중</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="업체명, 사업자번호, 이메일 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={handleExportExcel}
              disabled={exporting || filteredUsers.length === 0}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              엑셀 다운로드
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.company_name}</TableCell>
                  <TableCell>{user.ceo_name || '-'}</TableCell>
                  <TableCell>{user.business_number}</TableCell>
                  <TableCell>{formatPhoneNumber(user.phone1)}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.is_admin && (
                        <Badge variant="default" className="bg-purple-600">
                          <Shield className="h-3 w-3 mr-1" />
                          관리자
                        </Badge>
                      )}
                      {!user.is_admin && user.is_approved && (
                        <Badge variant="default" className="bg-green-600">
                          <UserCheck className="h-3 w-3 mr-1" />
                          승인됨
                        </Badge>
                      )}
                      {!user.is_admin && !user.is_approved && (
                        <Badge variant="secondary">
                          <UserX className="h-3 w-3 mr-1" />
                          대기중
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(user)}
                        title="정보 수정"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setResetUser(user)}
                        title="비밀번호 초기화"
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteUser(user)}
                        className="text-destructive hover:text-destructive"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    회원이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>회원 정보 수정</DialogTitle>
            <DialogDescription>
              {editUser?.company_name} ({editUser?.business_number})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>업체명</Label>
                <Input
                  value={editForm.company_name}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>대표자명</Label>
                <Input
                  value={editForm.ceo_name}
                  onChange={(e) => setEditForm({ ...editForm, ceo_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>주소</Label>
              <div className="flex gap-2">
                <Input
                  value={editForm.zipcode}
                  onChange={(e) => setEditForm({ ...editForm, zipcode: e.target.value })}
                  placeholder="우편번호"
                  className="w-28"
                />
              </div>
              <Input
                value={editForm.address1}
                onChange={(e) => setEditForm({ ...editForm, address1: e.target.value })}
                placeholder="도로명 주소"
              />
              <Input
                value={editForm.address2}
                onChange={(e) => setEditForm({ ...editForm, address2: e.target.value })}
                placeholder="상세 주소"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>연락처1</Label>
                <Input
                  value={editForm.phone1}
                  onChange={(e) => setEditForm({ ...editForm, phone1: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>연락처2</Label>
                <Input
                  value={editForm.phone2}
                  onChange={(e) => setEditForm({ ...editForm, phone2: e.target.value })}
                  placeholder="선택사항"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>이메일2</Label>
                <Input
                  value={editForm.email2}
                  onChange={(e) => setEditForm({ ...editForm, email2: e.target.value })}
                  placeholder="선택사항"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>관리자 권한</Label>
                <p className="text-sm text-muted-foreground">관리자 메뉴에 접근할 수 있습니다.</p>
              </div>
              <Button
                variant={editForm.is_admin ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditForm({ ...editForm, is_admin: !editForm.is_admin })}
              >
                {editForm.is_admin ? (
                  <>
                    <Shield className="h-4 w-4 mr-1" />
                    관리자
                  </>
                ) : (
                  <>
                    <ShieldOff className="h-4 w-4 mr-1" />
                    일반
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>승인 상태</Label>
                <p className="text-sm text-muted-foreground">승인되어야 로그인할 수 있습니다.</p>
              </div>
              <Button
                variant={editForm.is_approved ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditForm({ ...editForm, is_approved: !editForm.is_approved })}
              >
                {editForm.is_approved ? '승인됨' : '미승인'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              취소
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 삭제</DialogTitle>
            <DialogDescription>
              정말로 <strong>{deleteUser?.company_name}</strong>을(를) 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={!!resetUser} onOpenChange={() => setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-yellow-600" />
              비밀번호 초기화
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                <strong>{resetUser?.company_name}</strong>의 비밀번호를 초기화하시겠습니까?
              </p>
              <p className="text-sm">
                새 비밀번호: <code className="bg-muted px-2 py-1 rounded">u{resetUser?.business_number.replace(/-/g, '')}</code>
              </p>
              <p className="text-xs text-muted-foreground">
                ※ 사용자는 로그인 후 비밀번호를 반드시 변경해야 합니다.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>
              취소
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting} className="bg-yellow-600 hover:bg-yellow-700">
              {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              초기화
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Shield, ShieldOff, Loader2, KeyRound, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { User, EditFormData } from '@/hooks/useMembers';

// ── 회원 수정 Dialog ──

interface EditDialogProps {
  user: User | null;
  form: EditFormData;
  saving: boolean;
  onFormChange: (form: EditFormData) => void;
  onClose: () => void;
  onSave: () => void;
}

export function EditDialog({ user, form, saving, onFormChange, onClose, onSave }: EditDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>회원 정보 수정</DialogTitle>
          <DialogDescription>
            {user?.company_name} ({user?.business_number})
          </DialogDescription>
        </DialogHeader>
        <EditFormFields form={form} onChange={onFormChange} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditFormFields({ form, onChange }: { form: EditFormData; onChange: (f: EditFormData) => void }) {
  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>업체명</Label>
          <Input value={form.company_name} onChange={(e) => onChange({ ...form, company_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>대표자명</Label>
          <Input value={form.ceo_name} onChange={(e) => onChange({ ...form, ceo_name: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>주소</Label>
        <div className="flex gap-2">
          <Input value={form.zipcode} onChange={(e) => onChange({ ...form, zipcode: e.target.value })} placeholder="우편번호" className="w-28" />
        </div>
        <Input value={form.address1} onChange={(e) => onChange({ ...form, address1: e.target.value })} placeholder="도로명 주소" />
        <Input value={form.address2} onChange={(e) => onChange({ ...form, address2: e.target.value })} placeholder="상세 주소" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>연락처1</Label>
          <Input value={form.phone1} onChange={(e) => onChange({ ...form, phone1: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>연락처2</Label>
          <Input value={form.phone2} onChange={(e) => onChange({ ...form, phone2: e.target.value })} placeholder="선택사항" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>이메일</Label>
          <Input value={form.email} onChange={(e) => onChange({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>이메일2</Label>
          <Input value={form.email2} onChange={(e) => onChange({ ...form, email2: e.target.value })} placeholder="선택사항" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label>관리자 권한</Label>
          <p className="text-sm text-muted-foreground">관리자 메뉴에 접근할 수 있습니다.</p>
        </div>
        <Button variant={form.is_admin ? 'default' : 'outline'} size="sm" onClick={() => onChange({ ...form, is_admin: !form.is_admin })}>
          {form.is_admin ? (<><Shield className="h-4 w-4 mr-1" />관리자</>) : (<><ShieldOff className="h-4 w-4 mr-1" />일반</>)}
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label>승인 상태</Label>
          <p className="text-sm text-muted-foreground">승인되어야 로그인할 수 있습니다.</p>
        </div>
        <Button variant={form.is_approved ? 'default' : 'outline'} size="sm" onClick={() => onChange({ ...form, is_approved: !form.is_approved })}>
          {form.is_approved ? '승인됨' : '미승인'}
        </Button>
      </div>
    </div>
  );
}

// ── 삭제 Dialog ──

interface DeleteDialogProps {
  user: User | null;
  deleting: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteDialog({ user, deleting, onClose, onDelete }: DeleteDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>회원 삭제</DialogTitle>
          <DialogDescription>
            정말로 <strong>{user?.company_name}</strong>을(를) 삭제하시겠습니까?
            <br />이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button variant="destructive" onClick={onDelete} disabled={deleting}>
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 비밀번호 초기화 Dialog ──

interface ResetPasswordDialogProps {
  user: User | null;
  resetting: boolean;
  onClose: () => void;
  onReset: () => void;
}

export function ResetPasswordDialog({ user, resetting, onClose, onReset }: ResetPasswordDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-yellow-600" />
            비밀번호 초기화
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p><strong>{user?.company_name}</strong>의 비밀번호를 초기화하시겠습니까?</p>
            <p className="text-sm">
              새 비밀번호: <code className="bg-muted px-2 py-1 rounded">u{user?.business_number.replace(/-/g, '')}</code>
            </p>
            <p className="text-xs text-muted-foreground">
              ※ 사용자는 로그인 후 비밀번호를 반드시 변경해야 합니다.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={onReset} disabled={resetting} className="bg-yellow-600 hover:bg-yellow-700">
            {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            초기화
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 거부 Dialog ──

interface RejectDialogProps {
  open: boolean;
  user: User | null;
  reason: string;
  processing: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onReject: () => void;
}

export function RejectDialog({ open, user, reason, processing, onReasonChange, onClose, onReject }: RejectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>회원가입 거부</DialogTitle>
          <DialogDescription>{user?.company_name}의 회원가입을 거부합니다.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="reject-reason">거부 사유 (선택)</Label>
          <Textarea id="reject-reason" placeholder="거부 사유를 입력하세요..." value={reason} onChange={(e) => onReasonChange(e.target.value)} className="mt-2" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button variant="destructive" onClick={onReject} disabled={processing}>
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
            거부
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

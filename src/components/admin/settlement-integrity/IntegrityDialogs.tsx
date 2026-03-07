'use client';

import {
  Upload, FileSpreadsheet, Loader2, X, Trash2, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { IntegrityRow, MatchingUploadItem } from './types';
import { formatBusinessNumber } from './CSOTagComponents';

// --- Upload Dialog ---

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadFile: File | null;
  uploading: boolean;
  uploadProgress: number;
  uploadPreview: MatchingUploadItem[];
  uploadDuplicatesRemoved: number;
  uploadRawCount: number;
  handleUpload: () => void;
  clearUploadFile: () => void;
  getRootProps: ReturnType<typeof import('react-dropzone').useDropzone>['getRootProps'];
  getInputProps: ReturnType<typeof import('react-dropzone').useDropzone>['getInputProps'];
  isDragActive: boolean;
}

export function UploadDialog({
  open, onOpenChange, uploadFile, uploading, uploadProgress,
  uploadPreview, uploadDuplicatesRemoved, uploadRawCount,
  handleUpload, clearUploadFile,
  getRootProps, getInputProps, isDragActive,
}: UploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSO 매칭 데이터 업로드
          </DialogTitle>
          <DialogDescription>
            [업체명 - 사업자번호] 형식의 엑셀 파일을 업로드하여 매칭 테이블을 업데이트합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <UploadDropZone
            uploadFile={uploadFile}
            uploading={uploading}
            uploadDuplicatesRemoved={uploadDuplicatesRemoved}
            uploadRawCount={uploadRawCount}
            uploadPreviewCount={uploadPreview.length}
            clearUploadFile={clearUploadFile}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
          />

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">업로드 중... {uploadProgress}%</p>
            </div>
          )}

          {uploadPreview.length > 0 && <UploadPreviewTable uploadPreview={uploadPreview} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>취소</Button>
          <Button onClick={handleUpload} disabled={uploading || uploadPreview.length === 0}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploadPreview.length}건 업로드
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- UploadDropZone (서브) ---

interface UploadDropZoneProps {
  uploadFile: File | null;
  uploading: boolean;
  uploadDuplicatesRemoved: number;
  uploadRawCount: number;
  uploadPreviewCount: number;
  clearUploadFile: () => void;
  getRootProps: ReturnType<typeof import('react-dropzone').useDropzone>['getRootProps'];
  getInputProps: ReturnType<typeof import('react-dropzone').useDropzone>['getInputProps'];
  isDragActive: boolean;
}

function UploadDropZone({
  uploadFile, uploading, uploadDuplicatesRemoved, uploadRawCount, uploadPreviewCount,
  clearUploadFile, getRootProps, getInputProps, isDragActive,
}: UploadDropZoneProps) {
  if (!uploadFile) {
    return (
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
        )}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-primary">파일을 여기에 놓으세요...</p>
        ) : (
          <>
            <p className="text-muted-foreground">파일을 드래그하거나 클릭하여 선택</p>
            <p className="text-sm text-muted-foreground mt-2">.xlsx, .xls (최대 4MB)</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-8 w-8 text-green-600" />
        <div>
          <p className="font-medium">{uploadFile.name}</p>
          <p className="text-sm text-muted-foreground">
            {(uploadFile.size / 1024).toFixed(1)} KB | {uploadDuplicatesRemoved > 0
              ? `${uploadRawCount}건 중 중복 ${uploadDuplicatesRemoved}건 제거 → ${uploadPreviewCount}건`
              : `${uploadPreviewCount}건 감지됨`}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={clearUploadFile} disabled={uploading}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// --- UploadPreviewTable (서브) ---

function UploadPreviewTable({ uploadPreview }: { uploadPreview: MatchingUploadItem[] }) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">미리보기 (처음 10건)</h4>
      <ScrollArea className="h-[200px] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CSO업체명</TableHead>
              <TableHead>사업자번호</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploadPreview.slice(0, 10).map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.cso_company_name}</TableCell>
                <TableCell className="font-mono">{formatBusinessNumber(item.business_number)}</TableCell>
              </TableRow>
            ))}
            {uploadPreview.length > 10 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  ... 외 {uploadPreview.length - 10}건
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// --- Delete Dialog ---

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteTarget: IntegrityRow | null;
  deleting: boolean;
  onConfirm: () => void;
}

export function DeleteDialog({ open, onOpenChange, deleteTarget, deleting, onConfirm }: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            전체 매핑 삭제
          </DialogTitle>
          <DialogDescription>
            해당 사업자번호의 모든 CSO관리업체명 매핑을 삭제합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/30 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">사업자번호</span>
              <span className="font-mono">{deleteTarget && formatBusinessNumber(deleteTarget.business_number)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">사업자명</span>
              <span>{deleteTarget?.business_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">CSO업체명</span>
              <span>{deleteTarget?.cso_company_names.length || 0}개</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            이 작업은 되돌릴 수 없습니다. 정말 삭제하시겠습니까?
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>취소</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            전체 삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Add Mapping Dialog ---

interface AddMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unmappedRegisteredUsers: IntegrityRow[];
  selectedUnmappedBizNum: string;
  setSelectedUnmappedBizNum: (v: string) => void;
  newCsoName: string;
  setNewCsoName: (v: string) => void;
  addingRow: boolean;
  onConfirm: () => void;
}

export function AddMappingDialog({
  open, onOpenChange, unmappedRegisteredUsers,
  selectedUnmappedBizNum, setSelectedUnmappedBizNum,
  newCsoName, setNewCsoName, addingRow, onConfirm,
}: AddMappingDialogProps) {
  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setSelectedUnmappedBizNum('');
      setNewCsoName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            새 매핑 추가
          </DialogTitle>
          <DialogDescription>
            가입 완료된 회원 중 CSO 매핑이 없는 회원을 선택하여 매핑을 추가합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <UserSelect
            unmappedRegisteredUsers={unmappedRegisteredUsers}
            selectedUnmappedBizNum={selectedUnmappedBizNum}
            setSelectedUnmappedBizNum={setSelectedUnmappedBizNum}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">
              CSO관리업체명 <span className="text-red-500">*</span>
            </label>
            <Input placeholder="CSO관리업체명 입력" value={newCsoName} onChange={(e) => setNewCsoName(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={addingRow}>취소</Button>
          <Button onClick={onConfirm} disabled={addingRow || !selectedUnmappedBizNum || !newCsoName.trim()}>
            {addingRow ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- UserSelect (서브) ---

function UserSelect({ unmappedRegisteredUsers, selectedUnmappedBizNum, setSelectedUnmappedBizNum }: {
  unmappedRegisteredUsers: IntegrityRow[];
  selectedUnmappedBizNum: string;
  setSelectedUnmappedBizNum: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        회원 선택 <span className="text-red-500">*</span>
      </label>
      {unmappedRegisteredUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">매핑이 필요한 회원이 없습니다.</p>
      ) : (
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={selectedUnmappedBizNum}
          onChange={(e) => setSelectedUnmappedBizNum(e.target.value)}
        >
          <option value="">선택하세요 ({unmappedRegisteredUsers.length}건)</option>
          {unmappedRegisteredUsers.map((user) => (
            <option key={user.business_number} value={user.business_number}>
              {user.business_name} ({formatBusinessNumber(user.business_number)})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

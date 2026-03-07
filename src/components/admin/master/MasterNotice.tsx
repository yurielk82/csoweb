import { AlertCircle, Pencil, RotateCcw, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DEFAULT_NOTICE_CONTENT } from '@/constants/defaults';

// ── Notice 카드 ──

interface NoticeCardProps {
  content: string;
  renderedContent: string;
  onEdit: () => void;
}

export function NoticeCard({ content, renderedContent, onEdit }: NoticeCardProps) {
  if (!content) return null;

  return (
    <Card className="border-warning/20 bg-warning/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-warning">
            <AlertCircle className="h-4 w-4" />
            Notice
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2 text-warning hover:text-foreground hover:bg-warning/10">
            <Pencil className="h-3.5 w-3.5 mr-1" />
            편집
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-foreground">
        <div className="whitespace-pre-line">{renderedContent}</div>
      </CardContent>
    </Card>
  );
}

// ── Notice 편집 Dialog ──

interface NoticeEditDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  content: string;
  onContentChange: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}

export function NoticeEditDialog({ open, onOpenChange, content, onContentChange, saving, onSave }: NoticeEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>정산서 Notice 편집</DialogTitle>
          <DialogDescription>정산서 조회 페이지에 표시될 안내사항을 수정합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea value={content} onChange={(e) => onContentChange(e.target.value)} rows={14} className="font-mono text-sm min-h-[280px] resize-y" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">사용 가능한 변수:</p>
            <ul className="list-disc list-inside ml-2">
              <li>{`{{정산월}}`} — 현재 조회 중인 정산월 (예: 1월)</li>
              <li>{`{{정산월+1}}`} — 다음달 (예: 2월)</li>
              <li>{`{{대표자명}}`} — 기본 정보의 대표자명</li>
            </ul>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onContentChange(DEFAULT_NOTICE_CONTENT)} className="mr-auto">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            기본값으로 초기화
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>취소</Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Loader2, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PreviewData, TestCompany } from '@/hooks/useMailMerge';

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: PreviewData | null;
  testCompanies: TestCompany[];
  selectedTestBn: string;
  onTestCompanyChange: (bn: string) => void;
  testSending: boolean;
  onTestSend: () => void;
}

export function PreviewDialog({
  open,
  onOpenChange,
  preview,
  testCompanies,
  selectedTestBn,
  onTestCompanyChange,
  testSending,
  onTestSend,
}: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={preview?.hasSettlementData ? 'max-w-[90vw] max-h-[90vh]' : 'max-w-2xl'}>
        <DialogHeader>
          <DialogTitle>메일 미리보기</DialogTitle>
          <DialogDescription>실제 발송될 이메일의 예시입니다. (샘플 데이터 기준)</DialogDescription>
        </DialogHeader>
        {preview && (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">제목</p>
                <p className="font-medium">{preview.subject}</p>
              </div>
              {preview.contentHtml && (
                <div className="p-4 bg-muted rounded-lg overflow-x-auto">
                  <p className="text-sm text-muted-foreground mb-2">이메일 본문</p>
                  <div dangerouslySetInnerHTML={{ __html: preview.contentHtml }} />
                </div>
              )}
            </div>
          </ScrollArea>
        )}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium whitespace-nowrap">테스트 업체</Label>
            <Select value={selectedTestBn} onValueChange={onTestCompanyChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="업체 선택 (미선택 시 샘플 데이터)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__sample__">샘플 데이터 (가상)</SelectItem>
                {testCompanies.map(c => (
                  <SelectItem key={c.business_number} value={c.business_number}>
                    {c.company_name} ({c.business_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            업체를 선택하면 해당 업체의 실제 정산 데이터로 관리자 이메일에 테스트 발송합니다.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
          <Button onClick={onTestSend} disabled={testSending}>
            {testSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SendHorizonal className="h-4 w-4 mr-2" />}
            테스트 발송 (내 이메일)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

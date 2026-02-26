import { Mail, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { UploadResult } from '@/hooks/useFileUpload';

interface EmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: UploadResult | null;
  sendingEmail: boolean;
  onSendEmail: () => void;
}

export function EmailDialog({
  open,
  onOpenChange,
  result,
  sendingEmail,
  onSendEmail,
}: EmailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            이메일 발송
          </DialogTitle>
          <DialogDescription className="pt-2">
            업로드가 완료되었습니다. 해당 업체들에게 알림 이메일을 발송하시겠습니까?
            <br /><br />
            {result?.data?.settlementMonths && (
              <span className="font-medium">
                정산월: {result.data.settlementMonths.join(', ')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            나중에
          </Button>
          <Button onClick={onSendEmail} disabled={sendingEmail}>
            {sendingEmail ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            이메일 발송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { RefObject } from 'react';
import { X, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SendLog, SendProgress, SendResult } from '@/hooks/useMailMerge';

interface ProgressPanelProps {
  sending: boolean;
  progress: SendProgress;
  result: SendResult | null;
  sendLogs: SendLog[];
  logsEndRef: RefObject<HTMLDivElement>;
  progressPercent: number;
  remainingTime: number;
  formatTime: (seconds: number) => string;
  onCancel: () => void;
}

export function ProgressPanel({
  sending,
  progress,
  result,
  sendLogs,
  logsEndRef,
  progressPercent,
  remainingTime,
  formatTime,
  onCancel,
}: ProgressPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>
            {result
              ? `발송 완료 (${result.sent + result.failed}/${progress.total})`
              : `발송 중... (${progress.current}/${progress.total})`}
          </span>
          {sending && (
            <Button variant="destructive" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />취소
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressPercent}%</span>
            <div className="flex gap-4">
              <span className="text-green-600">성공: {progress.sent}건</span>
              {progress.failed > 0 && <span className="text-red-600">실패: {progress.failed}건</span>}
              {sending && remainingTime > 0 && <span>남은 시간: ~{formatTime(remainingTime)}</span>}
            </div>
          </div>
        </div>
        {sendLogs.length > 0 && (
          <ScrollArea className="h-48 rounded-md border p-3">
            <div className="space-y-1 text-sm">
              {sendLogs.map((log, i) => (
                <div key={i} className="flex items-center gap-2">
                  {log.status === 'sent' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : log.status === 'failed' ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  )}
                  <span className={log.status === 'failed' ? 'text-red-600' : ''}>{log.company_name}</span>
                  {log.status === 'sent' && (
                    <span className="text-muted-foreground">— {log.row_count ? `${log.row_count}건 테이블 포함 ` : ''}발송 완료</span>
                  )}
                  {log.status === 'failed' && <span className="text-red-500">— {log.error || '발송 실패'}</span>}
                  {log.status === 'skipped' && <span className="text-muted-foreground">— 건너뜀</span>}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

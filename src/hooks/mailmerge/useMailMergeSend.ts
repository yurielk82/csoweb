import { useState, useRef } from 'react';
import { API_ROUTES } from '@/constants/api';

import type { SendLog, SendResult, SendProgress, EmailSection } from './types';
import { parseSSEStream } from './parseSSE';
import { buildMailPayload } from './useMailMergePreview';

type ToastFn = ReturnType<typeof import('@/hooks/use-toast').useToast>['toast'];

interface SendDeps {
  subject: string;
  body: string;
  recipientType: 'all' | 'year_month';
  selectedYearMonth: string;
  includeSettlementTable: boolean;
  sections: EmailSection[];
  toast: ToastFn;
}

export function useMailMergeSend(deps: SendDeps) {
  const { subject, body, recipientType, selectedYearMonth, includeSettlementTable, sections, toast } = deps;

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<SendProgress | null>(null);
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);
  const [result, setResult] = useState<SendResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  const remainingTime = progress && progress.delay > 0
    ? Math.ceil(((progress.total - progress.current) * progress.delay) / 1000) : 0;

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    setProgress(null);
    setSendLogs([]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const recipientsList = recipientType === 'all' ? ['all'] : [`year_month:${selectedYearMonth}`];
      const payload = buildMailPayload(subject, body, recipientType, selectedYearMonth, includeSettlementTable, sections, {
        recipients: recipientsList,
      });
      const response = await fetch(API_ROUTES.EMAIL.MAILMERGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('응답 스트림을 읽을 수 없습니다.');
        await parseSSEStream(reader, { setProgress, setSendLogs, setResult });
      } else {
        const data = await response.json();
        if (!data.success) {
          toast({ variant: 'destructive', title: '발송 실패', description: data.error });
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast({ title: '발송 취소', description: '발송이 취소되었습니다. 이미 발송된 건은 취소되지 않습니다.' });
      } else {
        toast({ variant: 'destructive', title: '오류', description: '이메일 발송 중 오류가 발생했습니다.' });
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => { abortControllerRef.current?.abort(); };

  return {
    sending, progress, sendLogs, result, logsEndRef,
    progressPercent, remainingTime,
    handleSend, handleCancel,
  };
}

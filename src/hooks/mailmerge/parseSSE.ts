// ============================================
// SSE 스트림 파싱 유틸리티
// ============================================

import { DEFAULT_EMAIL_SEND_DELAY_MS } from '@/constants/defaults';
import type { ProgressEvent, SendLog, SendProgress, SendResult } from './types';

export interface SSECallbacks {
  setProgress: React.Dispatch<React.SetStateAction<SendProgress | null>>;
  setSendLogs: React.Dispatch<React.SetStateAction<SendLog[]>>;
  setResult: (result: SendResult) => void;
}

function handleSSEEvent(event: ProgressEvent, callbacks: SSECallbacks): void {
  if (event.type === 'start') {
    callbacks.setProgress({
      current: 0, total: event.total,
      sent: 0, failed: 0,
      delay: event.delay || DEFAULT_EMAIL_SEND_DELAY_MS,
    });
    return;
  }

  if (event.type === 'progress') {
    callbacks.setProgress(prev => ({
      current: event.current || 0, total: event.total,
      sent: event.sent || 0, failed: event.failed || 0,
      delay: prev?.delay || DEFAULT_EMAIL_SEND_DELAY_MS,
    }));
    if (event.company_name && event.status) {
      callbacks.setSendLogs(prev => [...prev, {
        company_name: event.company_name!,
        status: event.status!,
        error: event.error,
        row_count: event.row_count,
      }]);
    }
    return;
  }

  if (event.type === 'complete') {
    callbacks.setResult({
      sent: event.sent || 0,
      failed: event.failed || 0,
      total: event.total,
    });
  }
}

export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: SSECallbacks
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const dataMatch = line.match(/^data: (.+)$/m);
      if (!dataMatch) continue;
      try {
        const event: ProgressEvent = JSON.parse(dataMatch[1]);
        handleSSEEvent(event, callbacks);
      } catch { /* SSE JSON 파싱: 불완전한 줄은 정상적으로 무시 */ }
    }
  }
}

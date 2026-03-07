import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

import { formatTime } from './types';
import { useMailMergeState } from './useMailMergeState';
import { useMailMergePreview } from './useMailMergePreview';
import { useMailMergeSend } from './useMailMergeSend';

// ── Hook ──

export function useMailMerge() {
  const { toast } = useToast();
  const state = useMailMergeState();

  const sharedDeps = {
    subject: state.subject,
    body: state.body,
    recipientType: state.recipientType,
    selectedYearMonth: state.selectedYearMonth,
    includeSettlementTable: state.includeSettlementTable,
    sections: state.sections,
    toast,
  };

  const previewHook = useMailMergePreview(sharedDeps);
  const sendHook = useMailMergeSend(sharedDeps);

  // sendLogs 스크롤 자동 추적
  useEffect(() => {
    sendHook.logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sendHook.sendLogs, sendHook.logsEndRef]);

  return {
    ...state,
    formatTime,
    ...previewHook,
    ...sendHook,
  };
}

// ============================================
// 메일머지 훅 — barrel export
// 기존 import { useMailMerge } from '@/hooks/useMailMerge' → '@/hooks/mailmerge'
// ============================================

export { useMailMerge } from './useMailMerge';

export type {
  SectionId,
  EmailSection,
  ProgressEvent,
  SendLog,
  SendResult,
  SendProgress,
  PreviewData,
  TestCompany,
} from './types';

export { AVAILABLE_VARIABLES, DEFAULT_SECTIONS, formatTime } from './types';

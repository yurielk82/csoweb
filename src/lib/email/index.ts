// ============================================
// Email Service — barrel export
// 기존 import { sendEmail } from '@/lib/email' 유지
// ============================================

// 설정
export {
  invalidateEmailSettingsCache,
  getEmailSendDelay,
  getTestRecipientEmail,
} from './settings';
export type { EmailSettings } from './settings';

// 섹션 빌더 (메일머지)
export {
  buildBodyHtml,
  buildNoticeHtml,
  buildDashboardHtml,
  buildDataTableHtml,
} from './sections';
export type { EmailSectionId } from './sections';

// 발송
export {
  sendEmail,
  notifyAdmin,
  sendSettlementNotifications,
} from './sender';

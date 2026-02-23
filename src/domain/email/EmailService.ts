// ============================================
// Email Service Interface
// ============================================

import type { EmailTemplateType } from './types';

export interface EmailService {
  send(to: string, templateType: EmailTemplateType, data: Record<string, unknown>): Promise<{ success: boolean; error?: string }>;
  notifyAdmin(templateType: EmailTemplateType, data: Record<string, unknown>): Promise<void>;
  sendSettlementNotifications(
    recipients: Array<{ email: string; company_name: string }>,
    yearMonth: string,
    counts: Map<string, number>
  ): Promise<{ sent: number; failed: number }>;
}

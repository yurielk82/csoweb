// ============================================
// Email Domain Types
// ============================================

export type EmailTemplateType =
  | 'registration_request'
  | 'approval_complete'
  | 'approval_rejected'
  | 'settlement_uploaded'
  | 'password_reset'
  | 'mail_merge'
  | 'settlement_email';

export type EmailStatus = 'pending' | 'sent' | 'failed';

export interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  template_type: EmailTemplateType;
  status: EmailStatus;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface CreateEmailLogData {
  recipient_email: string;
  subject: string;
  template_type: EmailTemplateType;
}

export interface UpdateEmailLogData {
  status: EmailStatus;
  error_message?: string;
}

export interface EmailLogFilter {
  template_type?: EmailTemplateType;
  status?: EmailStatus;
  limit?: number;
}

// ============================================
// Company Domain Types
// ============================================

export type EmailProvider = 'resend' | 'smtp';

export interface CompanyInfo {
  company_name: string;
  ceo_name: string;
  business_number: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  copyright: string;
  additional_info: string;
  notice_content: string;
  // 이메일 발송 설정
  email_provider: EmailProvider;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from_name: string;
  smtp_from_email: string;
  email_send_delay_ms: number;
}

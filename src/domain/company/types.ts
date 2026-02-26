// ============================================
// Company Domain Types
// ============================================

export type EmailProvider = 'resend' | 'smtp';

// 이메일 알림 유형별 ON/OFF (mail_merge는 수동 발송이므로 제외)
export interface EmailNotifications {
  registration_request: boolean;  // 회원가입 신청 → 관리자 알림
  approval_complete: boolean;     // 가입 승인 → 사용자 알림
  approval_rejected: boolean;     // 가입 거부 → 사용자 알림
  settlement_uploaded: boolean;   // 정산서 업로드 → 사용자 알림
  password_reset: boolean;        // 비밀번호 재설정 → 사용자 알림
}

export const DEFAULT_EMAIL_NOTIFICATIONS: EmailNotifications = {
  registration_request: true,
  approval_complete: true,
  approval_rejected: true,
  settlement_uploaded: true,
  password_reset: true,
};

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
  // 이메일 알림 유형별 ON/OFF
  email_notifications: EmailNotifications;
}

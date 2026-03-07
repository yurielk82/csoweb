// ============================================
// Email Sender (프로바이더 스위칭: Resend + SMTP)
// ============================================

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { getEmailLogRepository, getCompanyRepository } from '@/infrastructure/supabase';
import type { EmailTemplateType } from '@/types';
import type { EmailNotifications } from '@/domain/company/types';
import { DEFAULT_EMAIL_NOTIFICATIONS } from '@/domain/company/types';
import { DEFAULT_SMTP_PORT, DEFAULT_EMAIL_SEND_DELAY_MS } from '@/constants/defaults';

import type { EmailSettings } from './settings';
import { getEmailSettings, getEmailSendDelay } from './settings';
import {
  type CompanyFooterInfo,
  getFromEmail,
  getSmtpFromEmail,
  getRegistrationRequestEmail,
  getApprovalCompleteEmail,
  getApprovalRejectedEmail,
  getSettlementUploadedEmail,
  getPasswordResetEmail,
  getMailMergeEmail,
} from './templates';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cso-portal.com';

// ── SMTP 전송 ──

interface SendViaSMTPOptions {
  settings: EmailSettings;
  from: string;
  to: string;
  subject: string;
  html: string;
}

async function sendViaSMTP({ settings, from, to, subject, html }: SendViaSMTPOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure: settings.smtp_secure,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_password,
    },
    authMethod: 'LOGIN',
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}

// ── 알림 토글 확인 ──

async function isNotificationDisabled(templateType: EmailTemplateType): Promise<boolean> {
  if (templateType === 'mail_merge') return false;
  try {
    const settings = await getEmailSettings();
    const key = templateType as keyof EmailNotifications;
    if (key in settings.email_notifications && !settings.email_notifications[key]) {
      console.warn(`[Email Skip] ${templateType} 알림이 비활성화되어 발송하지 않습니다.`);
      return true;
    }
  } catch (error) {
    console.warn('[Email] 알림 설정 조회 실패, 기본값(전부 활성)으로 진행:', error);
  }
  return false;
}

// ── 회사 정보 + 이메일 설정 조회 ──

const DEFAULT_COMPANY_INFO: CompanyFooterInfo = {
  company_name: 'CSO 정산서 포털',
  ceo_name: '', business_number: '', address: '',
  phone: '', fax: '', email: '', website: '',
};

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  provider: 'resend', smtp_host: '', smtp_port: DEFAULT_SMTP_PORT,
  smtp_secure: true, smtp_user: '', smtp_password: '',
  smtp_from_name: '', smtp_from_email: '', resend_from_email: '',
  test_recipient_email: '', email_send_delay_ms: DEFAULT_EMAIL_SEND_DELAY_MS,
  email_notifications: { ...DEFAULT_EMAIL_NOTIFICATIONS },
};

async function loadCompanyAndSettings(): Promise<{ companyInfo: CompanyFooterInfo; emailSettings: EmailSettings }> {
  try {
    const info = await getCompanyRepository().get();
    const companyInfo: CompanyFooterInfo = {
      company_name: info.company_name, ceo_name: info.ceo_name,
      business_number: info.business_number, address: info.address,
      phone: info.phone, fax: info.fax, email: info.email, website: info.website,
    };
    const emailSettings = await getEmailSettings();
    return { companyInfo, emailSettings };
  } catch (error) {
    console.warn('[Email] 회사 정보 조회 실패, 기본값으로 진행:', error);
    return { companyInfo: { ...DEFAULT_COMPANY_INFO }, emailSettings: { ...DEFAULT_EMAIL_SETTINGS } };
  }
}

// ── 템플릿 선택 ──

type EmailContent = { subject: string; html: string };

const TEMPLATE_MAP: Record<string, (data: Record<string, unknown>, company: CompanyFooterInfo) => EmailContent> = {
  registration_request: (d, c) => getRegistrationRequestEmail(d as Parameters<typeof getRegistrationRequestEmail>[0], c),
  approval_complete: (d, c) => getApprovalCompleteEmail(d as Parameters<typeof getApprovalCompleteEmail>[0], c),
  approval_rejected: (d, c) => getApprovalRejectedEmail(d as Parameters<typeof getApprovalRejectedEmail>[0], c),
  settlement_uploaded: (d, c) => getSettlementUploadedEmail(d as Parameters<typeof getSettlementUploadedEmail>[0], c),
  password_reset: (d, c) => getPasswordResetEmail(d as Parameters<typeof getPasswordResetEmail>[0], c),
  mail_merge: (d, c) => getMailMergeEmail(d as Parameters<typeof getMailMergeEmail>[0], c),
};

// ── Resend 전송 ──

async function sendViaResend(
  from: string, to: string, subject: string, html: string,
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    const msg = 'RESEND_API_KEY가 설정되지 않았습니다.';
    console.error(`[Email Error] ${msg} From: ${from}, To: ${to}`);
    return { success: false, error: msg };
  }

  const { error: resendError } = await resend.emails.send({ from, to, subject, html });
  if (resendError) {
    console.error(`[Email Resend Error] From: ${from}, To: ${to}, Error: ${resendError.message}`);
    return { success: false, error: resendError.message };
  }
  return { success: true };
}

// ── 로그 업데이트 헬퍼 ──

async function updateLogStatus(logId: string, result: { success: boolean; error?: string }) {
  if (result.success) {
    await getEmailLogRepository().update(logId, { status: 'sent' });
  } else {
    await getEmailLogRepository().update(logId, { status: 'failed', error_message: result.error ?? '' });
  }
}

// ── 메인 발송 함수 ──

export async function sendEmail(
  to: string,
  templateType: EmailTemplateType,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  if (await isNotificationDisabled(templateType)) return { success: true };

  const { companyInfo, emailSettings } = await loadCompanyAndSettings();

  const templateFn = TEMPLATE_MAP[templateType];
  if (!templateFn) return { success: false, error: 'Unknown template type' };
  const emailContent = templateFn(data, companyInfo);

  const log = await getEmailLogRepository().create({
    recipient_email: to, subject: emailContent.subject, template_type: templateType,
  });

  let result: { success: boolean; error?: string };

  if (emailSettings.provider === 'smtp') {
    const fromEmail = getSmtpFromEmail(emailSettings);
    if (!emailSettings.smtp_host || !emailSettings.smtp_user) {
      result = { success: false, error: 'SMTP 설정이 불완전합니다.' };
    } else {
      try {
        await sendViaSMTP({ settings: emailSettings, from: fromEmail, to, subject: emailContent.subject, html: emailContent.html });
        result = { success: true };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown SMTP error';
        console.error(`[Email SMTP Error] From: ${fromEmail}, To: ${to}, Error: ${msg}`);
        result = { success: false, error: msg };
      }
    }
  } else {
    const fromEmail = getFromEmail(companyInfo.company_name, emailSettings.resend_from_email);
    try {
      result = await sendViaResend(fromEmail, to, emailContent.subject, emailContent.html);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Email Error] From: ${fromEmail}, To: ${to}, Error: ${msg}`);
      result = { success: false, error: msg };
    }
  }

  await updateLogStatus(log.id, result);
  return result;
}

// ── 유틸리티 ──

export async function notifyAdmin(
  templateType: EmailTemplateType,
  data: Record<string, unknown>
): Promise<void> {
  await sendEmail(ADMIN_EMAIL, templateType, data);
}

export async function sendSettlementNotifications(
  recipients: Array<{ email: string; company_name: string }>,
  yearMonth: string,
  counts: Map<string, number>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const delay = await getEmailSendDelay();

  for (const recipient of recipients) {
    const count = counts.get(recipient.email) || 0;
    const result = await sendEmail(recipient.email, 'settlement_uploaded', {
      company_name: recipient.company_name,
      year_month: yearMonth,
      count,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return { sent, failed };
}

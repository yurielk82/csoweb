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

async function sendViaSMTP(
  settings: EmailSettings,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<void> {
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

// ── 메인 발송 함수 ──

export async function sendEmail(
  to: string,
  templateType: EmailTemplateType,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // 알림 토글 체크 (mail_merge는 수동 발송이므로 항상 허용)
  if (templateType !== 'mail_merge') {
    try {
      const settings = await getEmailSettings();
      const key = templateType as keyof EmailNotifications;
      if (key in settings.email_notifications && !settings.email_notifications[key]) {
        console.warn(`[Email Skip] ${templateType} 알림이 비활성화되어 발송하지 않습니다.`);
        return { success: true };
      }
    } catch (error) {
      console.warn('[Email] 알림 설정 조회 실패, 기본값(전부 활성)으로 진행:', error);
    }
  }

  // 회사 정보 조회
  let companyInfo: CompanyFooterInfo;
  let emailSettings: EmailSettings;
  try {
    const info = await getCompanyRepository().get();
    companyInfo = {
      company_name: info.company_name,
      ceo_name: info.ceo_name,
      business_number: info.business_number,
      address: info.address,
      phone: info.phone,
      fax: info.fax,
      email: info.email,
      website: info.website,
    };
    emailSettings = await getEmailSettings();
  } catch (error) {
    console.warn('[Email] 회사 정보 조회 실패, 기본값으로 진행:', error);
    companyInfo = {
      company_name: 'CSO 정산서 포털',
      ceo_name: '',
      business_number: '',
      address: '',
      phone: '',
      fax: '',
      email: '',
      website: '',
    };
    emailSettings = {
      provider: 'resend',
      smtp_host: '',
      smtp_port: DEFAULT_SMTP_PORT,
      smtp_secure: true,
      smtp_user: '',
      smtp_password: '',
      smtp_from_name: '',
      smtp_from_email: '',
      resend_from_email: '',
      test_recipient_email: '',
      email_send_delay_ms: DEFAULT_EMAIL_SEND_DELAY_MS,
      email_notifications: { ...DEFAULT_EMAIL_NOTIFICATIONS },
    };
  }

  let emailContent: { subject: string; html: string };

  switch (templateType) {
    case 'registration_request':
      emailContent = getRegistrationRequestEmail(
        data as Parameters<typeof getRegistrationRequestEmail>[0],
        companyInfo
      );
      break;
    case 'approval_complete':
      emailContent = getApprovalCompleteEmail(
        data as Parameters<typeof getApprovalCompleteEmail>[0],
        companyInfo
      );
      break;
    case 'approval_rejected':
      emailContent = getApprovalRejectedEmail(
        data as Parameters<typeof getApprovalRejectedEmail>[0],
        companyInfo
      );
      break;
    case 'settlement_uploaded':
      emailContent = getSettlementUploadedEmail(
        data as Parameters<typeof getSettlementUploadedEmail>[0],
        companyInfo
      );
      break;
    case 'password_reset':
      emailContent = getPasswordResetEmail(
        data as Parameters<typeof getPasswordResetEmail>[0],
        companyInfo
      );
      break;
    case 'mail_merge':
      emailContent = getMailMergeEmail(
        data as Parameters<typeof getMailMergeEmail>[0],
        companyInfo
      );
      break;
    default:
      return { success: false, error: 'Unknown template type' };
  }

  // Create log entry
  const log = await getEmailLogRepository().create({
    recipient_email: to,
    subject: emailContent.subject,
    template_type: templateType,
  });

  // 프로바이더별 발송
  if (emailSettings.provider === 'smtp') {
    const fromEmail = getSmtpFromEmail(emailSettings);

    if (!emailSettings.smtp_host || !emailSettings.smtp_user) {
      console.error('[Email Error] SMTP 설정이 불완전합니다.');
      await getEmailLogRepository().update(log.id, { status: 'failed', error_message: 'SMTP 설정 미완료' });
      return { success: false, error: 'SMTP 설정이 불완전합니다.' };
    }

    try {
      await sendViaSMTP(emailSettings, fromEmail, to, emailContent.subject, emailContent.html);
      await getEmailLogRepository().update(log.id, { status: 'sent' });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown SMTP error';
      console.error(`[Email SMTP Error] From: ${fromEmail}, To: ${to}, Error: ${errorMessage}`);
      await getEmailLogRepository().update(log.id, { status: 'failed', error_message: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  // Resend 프로바이더
  const fromEmail = getFromEmail(companyInfo.company_name, emailSettings.resend_from_email);

  if (!resend) {
    const msg = 'RESEND_API_KEY가 설정되지 않았습니다.';
    console.error(`[Email Error] ${msg} From: ${fromEmail}, To: ${to}`);
    await getEmailLogRepository().update(log.id, { status: 'failed', error_message: msg });
    return { success: false, error: msg };
  }

  try {
    const { error: resendError } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (resendError) {
      console.error(`[Email Resend Error] From: ${fromEmail}, To: ${to}, Error: ${resendError.message}`);
      await getEmailLogRepository().update(log.id, {
        status: 'failed',
        error_message: resendError.message,
      });
      return { success: false, error: resendError.message };
    }

    await getEmailLogRepository().update(log.id, { status: 'sent' });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Email Error] From: ${fromEmail}, To: ${to}, Error: ${errorMessage}`);
    await getEmailLogRepository().update(log.id, {
      status: 'failed',
      error_message: errorMessage
    });
    return { success: false, error: errorMessage };
  }
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

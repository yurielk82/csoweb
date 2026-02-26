// ============================================
// Email Service (Dual Provider: Resend + SMTP)
// ============================================

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { getEmailLogRepository, getCompanyRepository } from '@/infrastructure/supabase';
import type { EmailTemplateType } from '@/types';
import type { EmailProvider, EmailNotifications } from '@/domain/company/types';
import { DEFAULT_EMAIL_NOTIFICATIONS } from '@/domain/company/types';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cso-portal.com';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// ============================================
// 이메일 설정 캐시 (30초 TTL)
// ============================================

interface EmailSettings {
  provider: EmailProvider;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from_name: string;
  smtp_from_email: string;
  email_send_delay_ms: number;
  email_notifications: EmailNotifications;
}

let _cachedSettings: EmailSettings | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

async function getEmailSettings(): Promise<EmailSettings> {
  const now = Date.now();
  if (_cachedSettings && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _cachedSettings;
  }

  const info = await getCompanyRepository().get();
  _cachedSettings = {
    provider: info.email_provider || 'resend',
    smtp_host: info.smtp_host || '',
    smtp_port: info.smtp_port ?? 465,
    smtp_secure: info.smtp_secure ?? true,
    smtp_user: info.smtp_user || '',
    smtp_password: info.smtp_password || '',
    smtp_from_name: info.smtp_from_name || '',
    smtp_from_email: info.smtp_from_email || '',
    email_send_delay_ms: info.email_send_delay_ms ?? 6000,
    email_notifications: info.email_notifications ?? { ...DEFAULT_EMAIL_NOTIFICATIONS },
  };
  _cacheTimestamp = now;
  return _cachedSettings;
}

export function invalidateEmailSettingsCache(): void {
  _cachedSettings = null;
  _cacheTimestamp = 0;
}

export async function getEmailSendDelay(): Promise<number> {
  const settings = await getEmailSettings();
  return settings.email_send_delay_ms;
}

// ============================================
// SMTP 전송
// ============================================

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

// ============================================
// 발신자 이메일 생성
// ============================================

function getFromEmail(companyName: string): string {
  const senderName = companyName || 'CSO 정산서 포털';
  const emailMatch = DEFAULT_FROM_EMAIL.match(/<(.+)>/);
  const emailAddress = emailMatch ? emailMatch[1] : DEFAULT_FROM_EMAIL;
  return `${senderName} <${emailAddress}>`;
}

function getSmtpFromEmail(settings: EmailSettings): string {
  const name = settings.smtp_from_name || 'CSO 정산서 포털';
  const email = settings.smtp_from_email || settings.smtp_user;
  return `${name} <${email}>`;
}

// ============================================
// 회사 정보 타입
// ============================================

interface CompanyFooterInfo {
  company_name: string;
  ceo_name: string;
  business_number: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
}

// 공통 이메일 푸터 생성
function generateEmailFooter(companyInfo: CompanyFooterInfo): string {
  const currentYear = new Date().getFullYear();

  const infoItems: string[] = [];

  if (companyInfo.company_name) {
    infoItems.push(`<strong style="color: #374151;">${companyInfo.company_name}</strong>`);
  }
  if (companyInfo.ceo_name) {
    infoItems.push(`대표: ${companyInfo.ceo_name}`);
  }
  if (companyInfo.business_number) {
    infoItems.push(`사업자번호: ${companyInfo.business_number}`);
  }
  if (companyInfo.address) {
    infoItems.push(companyInfo.address);
  }
  if (companyInfo.phone) {
    infoItems.push(`TEL: ${companyInfo.phone}`);
  }
  if (companyInfo.fax) {
    infoItems.push(`FAX: ${companyInfo.fax}`);
  }
  if (companyInfo.email) {
    infoItems.push(`Email: ${companyInfo.email}`);
  }

  const companyInfoHtml = infoItems.length > 0
    ? `<p style="color: #6b7280; font-size: 11px; margin: 0 0 8px; line-height: 1.6;">${infoItems.join(' | ')}</p>`
    : '';

  const websiteHtml = companyInfo.website
    ? `<p style="margin: 0 0 8px;"><a href="${companyInfo.website}" style="color: #3b82f6; font-size: 11px; text-decoration: none;">${companyInfo.website}</a></p>`
    : '';

  return `
    <!-- Email Footer -->
    <tr>
      <td style="background: linear-gradient(to bottom, #f9fafb, #f3f4f6); padding: 24px 40px; border-top: 1px solid #e5e7eb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="text-align: center;">
              ${companyInfoHtml}
              ${websiteHtml}
              <p style="color: #9ca3af; font-size: 10px; margin: 8px 0 0;">
                본 메일은 발신 전용입니다. 문의사항은 위 연락처로 연락해 주세요.
              </p>
              <p style="color: #9ca3af; font-size: 10px; margin: 4px 0 0;">
                © ${currentYear} ${companyInfo.company_name || 'CSO 정산서 포털'}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

// ============================================
// Email Templates
// ============================================

function getRegistrationRequestEmail(data: {
  business_number: string;
  company_name: string;
  email: string;
  created_at: string;
}, companyInfo: CompanyFooterInfo) {
  return {
    subject: '🔔 새로운 회원가입 신청',
    html: `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;">
                <span style="font-size: 32px;">🔔</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">새로운 회원가입 신청</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">관리자 확인이 필요합니다</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">새로운 회원가입 신청이 접수되었습니다.</p>
              </div>

              <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="8">
                  <tr>
                    <td style="color: #6b7280; font-size: 13px; width: 100px;">사업자번호</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.business_number}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 13px;">업체명</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.company_name}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 13px;">이메일</td>
                    <td style="color: #1f2937; font-size: 14px;">${data.email}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 13px;">신청일시</td>
                    <td style="color: #1f2937; font-size: 14px;">${new Date(data.created_at).toLocaleString('ko-KR')}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center;">
                <a href="${BASE_URL}/admin/approvals"
                   style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                          color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px;
                          font-size: 15px; font-weight: 600; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                  ✅ 승인 관리 페이지로 이동
                </a>
              </div>
            </td>
          </tr>

          ${generateEmailFooter(companyInfo)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

function getApprovalCompleteEmail(data: {
  company_name: string;
  business_number: string;
}, companyInfo: CompanyFooterInfo) {
  return {
    subject: '✅ 회원가입이 승인되었습니다',
    html: `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;">
                <span style="font-size: 32px;">🎉</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">회원가입 승인 완료!</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${data.company_name}님, 환영합니다</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #065f46; font-size: 14px; margin: 0; line-height: 1.6;">
                  관리자 승인이 완료되었습니다!<br>
                  이제 정산서 포털에서 정산 내역을 조회하실 수 있습니다.
                </p>
              </div>

              <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 16px;">📋 로그인 정보</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="8">
                  <tr>
                    <td style="color: #6b7280; font-size: 13px; width: 80px;">아이디</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.business_number} (사업자번호)</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 13px;">비밀번호</td>
                    <td style="color: #1f2937; font-size: 14px;">가입 시 설정한 비밀번호</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center;">
                <a href="${BASE_URL}/login"
                   style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                          color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px;
                          font-size: 15px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                  🔑 로그인하러 가기
                </a>
              </div>
            </td>
          </tr>

          ${generateEmailFooter(companyInfo)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

function getApprovalRejectedEmail(data: {
  company_name: string;
  reason?: string;
}, companyInfo: CompanyFooterInfo) {
  return {
    subject: '❌ 회원가입이 거부되었습니다',
    html: `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;">
                <span style="font-size: 32px;">😔</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">회원가입 거부 안내</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px;">
                <strong>${data.company_name}</strong>님,
              </p>
              <p style="color: #4b5563; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
                죄송합니다. 회원가입 신청이 승인되지 않았습니다.
              </p>

              ${data.reason ? `
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #991b1b; font-size: 13px; font-weight: 600; margin: 0 0 8px;">📝 거부 사유</p>
                <p style="color: #7f1d1d; font-size: 14px; margin: 0; line-height: 1.6;">${data.reason}</p>
              </div>
              ` : ''}

              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px;">
                <p style="color: #6b7280; font-size: 13px; margin: 0;">
                  문의사항이 있으시면 아래 연락처로 문의해 주세요.
                </p>
              </div>
            </td>
          </tr>

          ${generateEmailFooter(companyInfo)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

function getSettlementUploadedEmail(data: {
  company_name: string;
  year_month: string;
  count: number;
}, companyInfo: CompanyFooterInfo) {
  return {
    subject: `📊 ${data.year_month} 정산서 업로드 알림`,
    html: `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;">
                <span style="font-size: 32px;">📊</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">정산서 업로드 알림</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${data.year_month} 정산서</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 8px;">
                안녕하세요, <span style="color: #3b82f6;">${data.company_name}</span>님
              </p>

              <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="color: #1e40af; font-size: 14px; margin: 0;">
                  ${data.year_month} 정산서가 업로드되었습니다.
                </p>
              </div>

              <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="8">
                  <tr>
                    <td style="color: #6b7280; font-size: 13px; width: 100px;">정산 월</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.year_month}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 13px;">데이터 건수</td>
                    <td style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.count.toLocaleString()}건</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 13px;">업로드 일시</td>
                    <td style="color: #1f2937; font-size: 14px;">${new Date().toLocaleString('ko-KR')}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center;">
                <a href="${BASE_URL}/dashboard"
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                          color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px;
                          font-size: 15px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                  📈 정산서 조회하기
                </a>
              </div>
            </td>
          </tr>

          ${generateEmailFooter(companyInfo)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

function getPasswordResetEmail(data: {
  company_name: string;
  business_number: string;
  reset_token: string;
  expires_in_minutes: number;
}, companyInfo: CompanyFooterInfo) {
  const resetUrl = `${BASE_URL}/reset-password?token=${data.reset_token}`;

  return {
    subject: '🔐 [CSO 정산서 포털] 비밀번호 재설정 요청',
    html: `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>비밀번호 재설정</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;">
                      <span style="font-size: 32px;">🔐</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                      비밀번호 재설정 요청
                    </h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">
                      CSO 정산서 포털
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Greeting -->
              <p style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 8px;">
                안녕하세요, <span style="color: #3b82f6;">${data.company_name}</span>님
              </p>
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
                사업자번호: ${data.business_number}
              </p>

              <!-- Notice Box -->
              <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.6;">
                  비밀번호 재설정 요청이 접수되었습니다.<br>
                  아래 버튼을 클릭하여 새 비밀번호를 설정해 주세요.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                          color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px;
                          font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
                          transition: all 0.2s ease;">
                  🔑 비밀번호 재설정하기
                </a>
              </div>

              <!-- URL Fallback -->
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px;">
                  버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:
                </p>
                <p style="color: #3b82f6; font-size: 12px; margin: 0; word-break: break-all;">
                  ${resetUrl}
                </p>
              </div>

              <!-- Warning Box -->
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="32" valign="top">
                      <span style="font-size: 20px;">⚠️</span>
                    </td>
                    <td>
                      <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: 600;">
                        보안 안내
                      </p>
                      <ul style="color: #a16207; font-size: 12px; margin: 8px 0 0; padding-left: 16px; line-height: 1.8;">
                        <li>이 링크는 <strong>${data.expires_in_minutes}분</strong> 동안만 유효합니다.</li>
                        <li>링크는 <strong>1회만</strong> 사용 가능합니다.</li>
                        <li>본인이 요청하지 않았다면 이 메일을 무시해 주세요.</li>
                        <li>타인에게 이 링크를 절대 공유하지 마세요.</li>
                      </ul>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Security Tips -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <p style="color: #374151; font-size: 13px; font-weight: 600; margin: 0 0 12px;">
                  🛡️ 안전한 비밀번호 설정 팁
                </p>
                <ul style="color: #6b7280; font-size: 12px; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>최소 8자 이상, 영문 대/소문자, 숫자, 특수문자 조합 권장</li>
                  <li>다른 사이트와 동일한 비밀번호 사용 금지</li>
                  <li>개인정보(생년월일, 전화번호 등) 포함 금지</li>
                </ul>
              </div>
            </td>
          </tr>

          ${generateEmailFooter(companyInfo)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

function getMailMergeEmail(data: {
  subject: string;
  contentHtml: string;
  hasWideContent?: boolean;
}, companyInfo: CompanyFooterInfo) {
  return {
    subject: data.subject,
    html: `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" ${data.hasWideContent ? 'width="100%" style="max-width:100%;' : 'width="600" style="'}background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;" cellspacing="0" cellpadding="0">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 24px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">
                ${companyInfo.company_name || 'CSO 정산서 포털'}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 20px;">
              ${data.contentHtml}
            </td>
          </tr>

          ${generateEmailFooter(companyInfo)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

// ============================================
// 이메일 섹션 빌더 (메일머지에서 사용)
// ============================================

export type EmailSectionId = 'notice' | 'dashboard' | 'table' | 'body';

export function buildBodyHtml(body: string): string {
  const lines = body.split('\n').map(line =>
    line.trim() ? `<p style="margin: 0 0 12px;">${line}</p>` : '<br>'
  ).join('');
  return `<div style="color: #374151; font-size: 14px; line-height: 1.8; padding: 0 20px;">${lines}</div>`;
}

export function buildNoticeHtml(notice: string): string {
  if (!notice) return '';
  return `<div style="margin:16px 20px;padding:12px 16px;border-left:4px solid #f59e0b;background:#fefce8;">
    <p style="font-weight:bold;font-size:13px;color:#92400e;margin:0 0 8px;">[ Notice ]</p>
    <div style="font-size:12px;color:#78350f;line-height:1.8;white-space:pre-line;">${notice}</div>
  </div>`;
}

export function buildDashboardHtml(summary: {
  총_금액: number;
  총_수수료: number;
  데이터_건수: number;
  총_수량: number;
}): string {
  const fmt = (v: number) => v.toLocaleString('ko-KR');
  return `<div style="margin:16px 20px;padding:16px 20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
    <p style="font-size:13px;font-weight:600;color:#334155;margin:0 0 10px;">합계 요약</p>
    <table cellspacing="0" cellpadding="0" style="width:100%;font-size:13px;color:#475569;">
      <tr>
        <td style="padding:4px 0;">데이터 건수</td>
        <td style="padding:4px 0;text-align:right;font-weight:600;">${fmt(summary.데이터_건수)}건</td>
        <td style="padding:4px 0;padding-left:24px;">총 수량</td>
        <td style="padding:4px 0;text-align:right;font-weight:600;">${fmt(summary.총_수량)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;">총 금액</td>
        <td style="padding:4px 0;text-align:right;font-weight:600;">${fmt(summary.총_금액)}원</td>
        <td style="padding:4px 0;padding-left:24px;">총 수수료</td>
        <td style="padding:4px 0;text-align:right;font-weight:600;">${fmt(summary.총_수수료)}원</td>
      </tr>
    </table>
  </div>`;
}

export function buildDataTableHtml(params: {
  columns: { key: string; name: string; isNumeric: boolean }[];
  rows: Record<string, unknown>[];
  company_name: string;
  year_month: string;
}): string {
  const formatNumber = (val: unknown): string => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toLocaleString('ko-KR');
  };

  const headerCells = params.columns
    .map(col => `<th style="border:1px solid #999;padding:4px 8px;background:#e2e8f0;font-size:12px;white-space:nowrap;text-align:center;">${col.name}</th>`)
    .join('');

  const bodyRows = params.rows.map((row, i) => {
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    const cells = params.columns.map(col => {
      const val = row[col.key];
      const align = col.isNumeric ? 'right' : 'left';
      const display = col.isNumeric ? formatNumber(val) : (val ?? '');
      return `<td style="border:1px solid #ccc;padding:3px 6px;font-size:11px;white-space:nowrap;text-align:${align};">${display}</td>`;
    }).join('');
    return `<tr style="background:${bgColor};">${cells}</tr>`;
  }).join('');

  return `<div style="margin:16px 0;padding:0 20px;">
    <p style="font-size:14px;font-weight:bold;color:#1e293b;margin:0 0 8px;">
      ${params.company_name} - ${params.year_month} 정산서
    </p>
    <div style="overflow-x:auto;">
      <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:monospace,sans-serif;">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  </div>`;
}

// ============================================
// Send email function (프로바이더 스위칭)
// ============================================

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
        console.log(`[Email Skip] ${templateType} 알림이 비활성화되어 발송하지 않습니다.`);
        return { success: true };
      }
    } catch {
      // 설정 조회 실패 시 기본값(전부 활성)으로 진행
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
  } catch {
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
      smtp_port: 465,
      smtp_secure: true,
      smtp_user: '',
      smtp_password: '',
      smtp_from_name: '',
      smtp_from_email: '',
      email_send_delay_ms: 6000,
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
  const fromEmail = getFromEmail(companyInfo.company_name);

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

// Send notification to admin
export async function notifyAdmin(
  templateType: EmailTemplateType,
  data: Record<string, unknown>
): Promise<void> {
  await sendEmail(ADMIN_EMAIL, templateType, data);
}

// Bulk send for settlement upload notification
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

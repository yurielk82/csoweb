// ============================================
// Email Templates (HTML)
// ============================================

import type { EmailSettings } from './settings';

const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// ── 발신자 이메일 생성 ──

export function getFromEmail(companyName: string, resendFromEmail?: string): string {
  const senderName = companyName || 'CSO 정산서 포털';
  const baseEmail = resendFromEmail || DEFAULT_FROM_EMAIL;
  const emailMatch = baseEmail.match(/<(.+)>/);
  const emailAddress = emailMatch ? emailMatch[1] : baseEmail;
  return `${senderName} <${emailAddress}>`;
}

export function getSmtpFromEmail(settings: EmailSettings): string {
  const name = settings.smtp_from_name || 'CSO 정산서 포털';
  const email = settings.smtp_from_email || settings.smtp_user;
  return `${name} <${email}>`;
}

// ── 회사 푸터 ──

export interface CompanyFooterInfo {
  company_name: string;
  ceo_name: string;
  business_number: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
}

function generateEmailFooter(companyInfo: CompanyFooterInfo): string {
  const currentYear = new Date().getFullYear();
  const infoItems = buildFooterInfoItems(companyInfo);

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
                &copy; ${currentYear} ${companyInfo.company_name || 'CSO 정산서 포털'}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function buildFooterInfoItems(companyInfo: CompanyFooterInfo): string[] {
  const items: string[] = [];
  if (companyInfo.company_name) items.push(`<strong style="color: #374151;">${companyInfo.company_name}</strong>`);
  if (companyInfo.ceo_name) items.push(`대표: ${companyInfo.ceo_name}`);
  if (companyInfo.business_number) items.push(`사업자번호: ${companyInfo.business_number}`);
  if (companyInfo.address) items.push(companyInfo.address);
  if (companyInfo.phone) items.push(`TEL: ${companyInfo.phone}`);
  if (companyInfo.fax) items.push(`FAX: ${companyInfo.fax}`);
  if (companyInfo.email) items.push(`Email: ${companyInfo.email}`);
  return items;
}

// ── 공통 이메일 래퍼 ──

function wrapEmailLayout(headerHtml: string, contentHtml: string, footerHtml: string): string {
  return `
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
          ${headerHtml}
          ${contentHtml}
          ${footerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function buildEmailHeader(
  gradient: string,
  emoji: string,
  title: string,
  subtitle?: string,
): string {
  return `
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${gradient}); padding: 32px 40px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;">
                <span style="font-size: 32px;">${emoji}</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${title}</h1>
              ${subtitle ? `<p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${subtitle}</p>` : ''}
            </td>
          </tr>`;
}

function buildCTAButton(href: string, gradient: string, shadowColor: string, label: string): string {
  return `
              <div style="text-align: center;">
                <a href="${href}"
                   style="display: inline-block; background: linear-gradient(135deg, ${gradient});
                          color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px;
                          font-size: 15px; font-weight: 600; box-shadow: 0 4px 14px ${shadowColor};">
                  ${label}
                </a>
              </div>`;
}

// ── 템플릿 함수 ──

export function getRegistrationRequestEmail(data: {
  business_number: string;
  company_name: string;
  email: string;
  created_at: string;
}, companyInfo: CompanyFooterInfo) {
  const header = buildEmailHeader('#f59e0b 0%, #d97706 100%', '🔔', '새로운 회원가입 신청', '관리자 확인이 필요합니다');
  const content = `
          <tr>
            <td style="padding: 40px;">
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">새로운 회원가입 신청이 접수되었습니다.</p>
              </div>
              <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="8">
                  <tr><td style="color: #6b7280; font-size: 13px; width: 100px;">사업자번호</td><td style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.business_number}</td></tr>
                  <tr><td style="color: #6b7280; font-size: 13px;">업체명</td><td style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.company_name}</td></tr>
                  <tr><td style="color: #6b7280; font-size: 13px;">이메일</td><td style="color: #1f2937; font-size: 14px;">${data.email}</td></tr>
                  <tr><td style="color: #6b7280; font-size: 13px;">신청일시</td><td style="color: #1f2937; font-size: 14px;">${new Date(data.created_at).toLocaleString('ko-KR')}</td></tr>
                </table>
              </div>
              ${buildCTAButton(`${BASE_URL}/admin/members?filter=pending`, '#f59e0b 0%, #d97706 100%', 'rgba(245, 158, 11, 0.4)', '✅ 승인 관리 페이지로 이동')}
            </td>
          </tr>`;

  return {
    subject: '🔔 새로운 회원가입 신청',
    html: wrapEmailLayout(header, content, generateEmailFooter(companyInfo)),
  };
}

export function getApprovalCompleteEmail(data: {
  company_name: string;
  business_number: string;
}, companyInfo: CompanyFooterInfo) {
  const header = buildEmailHeader('#10b981 0%, #059669 100%', '🎉', '회원가입 승인 완료!', `${data.company_name}님, 환영합니다`);
  const content = `
          <tr>
            <td style="padding: 40px;">
              <div style="background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #065f46; font-size: 14px; margin: 0; line-height: 1.6;">
                  관리자 승인이 완료되었습니다!<br>이제 정산서 포털에서 정산 내역을 조회하실 수 있습니다.
                </p>
              </div>
              <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 16px;">📋 로그인 정보</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="8">
                  <tr><td style="color: #6b7280; font-size: 13px; width: 80px;">아이디</td><td style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.business_number} (사업자번호)</td></tr>
                  <tr><td style="color: #6b7280; font-size: 13px;">비밀번호</td><td style="color: #1f2937; font-size: 14px;">가입 시 설정한 비밀번호</td></tr>
                </table>
              </div>
              ${buildCTAButton(`${BASE_URL}/login`, '#10b981 0%, #059669 100%', 'rgba(16, 185, 129, 0.4)', '🔑 로그인하러 가기')}
            </td>
          </tr>`;

  return {
    subject: '✅ 회원가입이 승인되었습니다',
    html: wrapEmailLayout(header, content, generateEmailFooter(companyInfo)),
  };
}

export function getApprovalRejectedEmail(data: {
  company_name: string;
  reason?: string;
}, companyInfo: CompanyFooterInfo) {
  const header = buildEmailHeader('#ef4444 0%, #dc2626 100%', '😔', '회원가입 거부 안내');
  const reasonBlock = data.reason ? `
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #991b1b; font-size: 13px; font-weight: 600; margin: 0 0 8px;">📝 거부 사유</p>
                <p style="color: #7f1d1d; font-size: 14px; margin: 0; line-height: 1.6;">${data.reason}</p>
              </div>` : '';
  const content = `
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px;"><strong>${data.company_name}</strong>님,</p>
              <p style="color: #4b5563; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">죄송합니다. 회원가입 신청이 승인되지 않았습니다.</p>
              ${reasonBlock}
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px;">
                <p style="color: #6b7280; font-size: 13px; margin: 0;">문의사항이 있으시면 아래 연락처로 문의해 주세요.</p>
              </div>
            </td>
          </tr>`;

  return {
    subject: '❌ 회원가입이 거부되었습니다',
    html: wrapEmailLayout(header, content, generateEmailFooter(companyInfo)),
  };
}

export function getSettlementUploadedEmail(data: {
  company_name: string;
  year_month: string;
  count: number;
}, companyInfo: CompanyFooterInfo) {
  const header = buildEmailHeader('#3b82f6 0%, #1d4ed8 100%', '📊', '정산서 업로드 알림', `${data.year_month} 정산서`);
  const content = `
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 8px;">
                안녕하세요, <span style="color: #3b82f6;">${data.company_name}</span>님
              </p>
              <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="color: #1e40af; font-size: 14px; margin: 0;">${data.year_month} 정산서가 업로드되었습니다.</p>
              </div>
              <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="8">
                  <tr><td style="color: #6b7280; font-size: 13px; width: 100px;">정산 월</td><td style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.year_month}</td></tr>
                  <tr><td style="color: #6b7280; font-size: 13px;">데이터 건수</td><td style="color: #1f2937; font-size: 14px; font-weight: 600;">${data.count.toLocaleString()}건</td></tr>
                  <tr><td style="color: #6b7280; font-size: 13px;">업로드 일시</td><td style="color: #1f2937; font-size: 14px;">${new Date().toLocaleString('ko-KR')}</td></tr>
                </table>
              </div>
              ${buildCTAButton(`${BASE_URL}/dashboard`, '#3b82f6 0%, #1d4ed8 100%', 'rgba(59, 130, 246, 0.4)', '📈 정산서 조회하기')}
            </td>
          </tr>`;

  return {
    subject: `📊 ${data.year_month} 정산서 업로드 알림`,
    html: wrapEmailLayout(header, content, generateEmailFooter(companyInfo)),
  };
}

export function getPasswordResetEmail(data: {
  company_name: string;
  business_number: string;
  reset_token: string;
  expires_in_minutes: number;
}, companyInfo: CompanyFooterInfo) {
  const resetUrl = `${BASE_URL}/reset-password?token=${data.reset_token}`;
  const header = buildPasswordResetHeader();
  const content = buildPasswordResetContent(data, resetUrl);

  return {
    subject: '🔐 [CSO 정산서 포털] 비밀번호 재설정 요청',
    html: wrapEmailLayout(header, content, generateEmailFooter(companyInfo)),
  };
}

function buildPasswordResetHeader(): string {
  return `
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px;">
                      <span style="font-size: 32px;">🔐</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">비밀번호 재설정 요청</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">CSO 정산서 포털</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function buildPasswordResetContent(data: {
  company_name: string;
  business_number: string;
  expires_in_minutes: number;
}, resetUrl: string): string {
  return `
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 8px;">
                안녕하세요, <span style="color: #3b82f6;">${data.company_name}</span>님
              </p>
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">사업자번호: ${data.business_number}</p>
              <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.6;">
                  비밀번호 재설정 요청이 접수되었습니다.<br>아래 버튼을 클릭하여 새 비밀번호를 설정해 주세요.
                </p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4); transition: all 0.2s ease;">
                  🔑 비밀번호 재설정하기
                </a>
              </div>
              ${buildUrlFallback(resetUrl)}
              ${buildSecurityWarning(data.expires_in_minutes)}
              ${buildSecurityTips()}
            </td>
          </tr>`;
}

function buildUrlFallback(resetUrl: string): string {
  return `
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px;">버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
                <p style="color: #3b82f6; font-size: 12px; margin: 0; word-break: break-all;">${resetUrl}</p>
              </div>`;
}

function buildSecurityWarning(expiresInMinutes: number): string {
  return `
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="32" valign="top"><span style="font-size: 20px;">⚠️</span></td>
                    <td>
                      <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: 600;">보안 안내</p>
                      <ul style="color: #a16207; font-size: 12px; margin: 8px 0 0; padding-left: 16px; line-height: 1.8;">
                        <li>이 링크는 <strong>${expiresInMinutes}분</strong> 동안만 유효합니다.</li>
                        <li>링크는 <strong>1회만</strong> 사용 가능합니다.</li>
                        <li>본인이 요청하지 않았다면 이 메일을 무시해 주세요.</li>
                        <li>타인에게 이 링크를 절대 공유하지 마세요.</li>
                      </ul>
                    </td>
                  </tr>
                </table>
              </div>`;
}

function buildSecurityTips(): string {
  return `
              <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <p style="color: #374151; font-size: 13px; font-weight: 600; margin: 0 0 12px;">🛡️ 안전한 비밀번호 설정 팁</p>
                <ul style="color: #6b7280; font-size: 12px; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>최소 8자 이상, 영문 대/소문자, 숫자, 특수문자 조합 권장</li>
                  <li>다른 사이트와 동일한 비밀번호 사용 금지</li>
                  <li>개인정보(생년월일, 전화번호 등) 포함 금지</li>
                </ul>
              </div>`;
}

export function getMailMergeEmail(data: {
  subject: string;
  contentHtml: string;
  hasWideContent?: boolean;
}, companyInfo: CompanyFooterInfo) {
  const widthAttr = data.hasWideContent
    ? 'width="100%" style="max-width:100%;'
    : 'width="600" style="';

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
        <table role="presentation" ${widthAttr}background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;" cellspacing="0" cellpadding="0">
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

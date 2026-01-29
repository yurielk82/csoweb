// ============================================
// Email Service (Resend Integration)
// ============================================

import { Resend } from 'resend';
import { createEmailLog, updateEmailLog } from './db';
import type { EmailTemplateType } from '@/types';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'CSO Portal <noreply@cso-portal.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cso-portal.com';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Email Templates
function getRegistrationRequestEmail(data: {
  business_number: string;
  company_name: string;
  email: string;
  created_at: string;
}) {
  return {
    subject: '🔔 새로운 회원가입 신청',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">새로운 회원가입 신청이 있습니다</h2>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>사업자번호:</strong> ${data.business_number}</p>
          <p><strong>업체명:</strong> ${data.company_name}</p>
          <p><strong>이메일:</strong> ${data.email}</p>
          <p><strong>신청일시:</strong> ${new Date(data.created_at).toLocaleString('ko-KR')}</p>
        </div>
        <a href="${BASE_URL}/admin/approvals" 
           style="display: inline-block; background: #3b82f6; color: white; 
                  padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          승인 관리 페이지로 이동
        </a>
      </div>
    `,
  };
}

function getApprovalCompleteEmail(data: {
  company_name: string;
  business_number: string;
}) {
  return {
    subject: '✅ 회원가입이 승인되었습니다',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">${data.company_name}님, 환영합니다!</h2>
        <p>관리자 승인이 완료되어 이제 정산서를 조회하실 수 있습니다.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>로그인 정보:</strong></p>
          <p>• 아이디: ${data.business_number} (사업자번호)</p>
          <p>• 비밀번호: 가입 시 설정한 비밀번호</p>
        </div>
        <a href="${BASE_URL}/login" 
           style="display: inline-block; background: #059669; color: white; 
                  padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          로그인하러 가기
        </a>
      </div>
    `,
  };
}

function getApprovalRejectedEmail(data: {
  company_name: string;
  reason?: string;
}) {
  return {
    subject: '❌ 회원가입이 거부되었습니다',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">회원가입 신청이 거부되었습니다</h2>
        <p>${data.company_name}님,</p>
        <p>죄송합니다. 회원가입 신청이 승인되지 않았습니다.</p>
        ${data.reason ? `
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>거부 사유:</strong></p>
          <p>${data.reason}</p>
        </div>
        ` : ''}
        <p>문의사항이 있으시면 관리자에게 연락해 주세요.</p>
      </div>
    `,
  };
}

function getSettlementUploadedEmail(data: {
  company_name: string;
  year_month: string;
  count: number;
}) {
  return {
    subject: `📊 ${data.year_month} 정산서 업로드 알림`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">${data.company_name}님,</h2>
        <p>${data.year_month} 정산서가 업로드되었습니다.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>정산 월:</strong> ${data.year_month}</p>
          <p><strong>데이터 건수:</strong> ${data.count.toLocaleString()}건</p>
          <p><strong>업로드 일시:</strong> ${new Date().toLocaleString('ko-KR')}</p>
        </div>
        <a href="${BASE_URL}/dashboard" 
           style="display: inline-block; background: #3b82f6; color: white; 
                  padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          정산서 조회하기
        </a>
      </div>
    `,
  };
}

function getPasswordResetEmail(data: {
  company_name: string;
  business_number: string;
  reset_token: string;
  expires_in_minutes: number;
}) {
  const resetUrl = `${BASE_URL}/reset-password?token=${data.reset_token}`;
  const currentYear = new Date().getFullYear();
  
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
          
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #9ca3af; font-size: 11px; margin: 0 0 8px;">
                      본 메일은 발신 전용입니다. 문의사항은 관리자에게 연락해 주세요.
                    </p>
                    <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                      © ${currentYear} CSO 정산서 포털. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
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
  body: string;
}) {
  return {
    subject: data.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        ${data.body.split('\n').map(line => `<p>${line}</p>`).join('')}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">
          이 메일은 CSO 정산서 포털에서 발송되었습니다.
        </p>
      </div>
    `,
  };
}

// Send email function
export async function sendEmail(
  to: string,
  templateType: EmailTemplateType,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  let emailContent: { subject: string; html: string };
  
  switch (templateType) {
    case 'registration_request':
      emailContent = getRegistrationRequestEmail(data as Parameters<typeof getRegistrationRequestEmail>[0]);
      break;
    case 'approval_complete':
      emailContent = getApprovalCompleteEmail(data as Parameters<typeof getApprovalCompleteEmail>[0]);
      break;
    case 'approval_rejected':
      emailContent = getApprovalRejectedEmail(data as Parameters<typeof getApprovalRejectedEmail>[0]);
      break;
    case 'settlement_uploaded':
      emailContent = getSettlementUploadedEmail(data as Parameters<typeof getSettlementUploadedEmail>[0]);
      break;
    case 'password_reset':
      emailContent = getPasswordResetEmail(data as Parameters<typeof getPasswordResetEmail>[0]);
      break;
    case 'mail_merge':
      emailContent = getMailMergeEmail(data as Parameters<typeof getMailMergeEmail>[0]);
      break;
    default:
      return { success: false, error: 'Unknown template type' };
  }
  
  // Create log entry
  const log = await createEmailLog({
    recipient_email: to,
    subject: emailContent.subject,
    template_type: templateType,
  });
  
  // If Resend is not configured, simulate success for demo
  if (!resend) {
    console.log(`[Email Demo] To: ${to}, Subject: ${emailContent.subject}`);
    await updateEmailLog(log.id, { status: 'sent' });
    return { success: true };
  }
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: emailContent.subject,
      html: emailContent.html,
    });
    
    await updateEmailLog(log.id, { status: 'sent' });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateEmailLog(log.id, { 
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
    
    // Rate limiting: 10 emails per second
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { sent, failed };
}

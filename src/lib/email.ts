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
  reset_token: string;
}) {
  return {
    subject: '🔑 비밀번호 재설정 요청',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">비밀번호 재설정</h2>
        <p>${data.company_name}님,</p>
        <p>비밀번호 재설정 요청이 접수되었습니다.</p>
        <p>아래 버튼을 클릭하여 새 비밀번호를 설정해 주세요.</p>
        <a href="${BASE_URL}/reset-password?token=${data.reset_token}" 
           style="display: inline-block; background: #3b82f6; color: white; 
                  padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          비밀번호 재설정
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          이 링크는 1시간 동안만 유효합니다.<br>
          본인이 요청하지 않았다면 이 메일을 무시해 주세요.
        </p>
      </div>
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

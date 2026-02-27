// ============================================
// Supabase Company Repository Implementation
// ============================================

import { supabase } from './client';
import type { CompanyRepository } from '@/domain/company/CompanyRepository';
import type { CompanyInfo, EmailNotifications } from '@/domain/company/types';
import { DEFAULT_EMAIL_NOTIFICATIONS } from '@/domain/company/types';
import {
  DEFAULT_COMPANY_INFO,
  DEFAULT_NOTICE_CONTENT,
  DEFAULT_SMTP_PORT,
  DEFAULT_EMAIL_SEND_DELAY_MS,
} from '@/constants/defaults';

function parseEmailNotifications(raw: unknown): EmailNotifications {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_EMAIL_NOTIFICATIONS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    registration_request: typeof obj.registration_request === 'boolean' ? obj.registration_request : true,
    approval_complete: typeof obj.approval_complete === 'boolean' ? obj.approval_complete : true,
    approval_rejected: typeof obj.approval_rejected === 'boolean' ? obj.approval_rejected : true,
    settlement_uploaded: typeof obj.settlement_uploaded === 'boolean' ? obj.settlement_uploaded : true,
    password_reset: typeof obj.password_reset === 'boolean' ? obj.password_reset : true,
  };
}

export class SupabaseCompanyRepository implements CompanyRepository {
  async get(): Promise<CompanyInfo> {
    const { data: rows, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1);

    if (error) {
      console.log('getCompanyInfo error:', error.message, error.code);
    }

    const data = rows && rows.length > 0 ? rows[0] : null;

    if (error || !data) {
      return { ...DEFAULT_COMPANY_INFO };
    }

    return {
      company_name: data.company_name || '',
      ceo_name: data.ceo_name || '',
      business_number: data.business_number || '',
      address: data.address || '',
      phone: data.phone || '',
      fax: data.fax || '',
      email: data.email || '',
      website: data.website || '',
      copyright: data.copyright || '',
      additional_info: data.additional_info || '',
      notice_content: data.notice_content || DEFAULT_NOTICE_CONTENT,
      email_provider: data.email_provider || 'resend',
      smtp_host: data.smtp_host || '',
      smtp_port: data.smtp_port ?? DEFAULT_SMTP_PORT,
      smtp_secure: data.smtp_secure ?? true,
      smtp_user: data.smtp_user || '',
      smtp_password: data.smtp_password || '',
      smtp_from_name: data.smtp_from_name || '',
      smtp_from_email: data.smtp_from_email || '',
      resend_from_email: data.resend_from_email || '',
      test_recipient_email: data.test_recipient_email || '',
      email_send_delay_ms: data.email_send_delay_ms ?? DEFAULT_EMAIL_SEND_DELAY_MS,
      email_notifications: parseEmailNotifications(data.email_notifications),
    };
  }

  async update(data: Partial<CompanyInfo>): Promise<void> {
    // DB에 존재하는 컬럼만 추출 (unknown 필드 전달 방지)
    const dbData: Record<string, unknown> = {};
    const KNOWN_COLUMNS = [
      'company_name', 'ceo_name', 'business_number', 'address',
      'phone', 'fax', 'email', 'website', 'copyright', 'additional_info',
      'notice_content', 'email_provider', 'smtp_host', 'smtp_port',
      'smtp_secure', 'smtp_user', 'smtp_password', 'smtp_from_name',
      'smtp_from_email', 'resend_from_email', 'test_recipient_email',
      'email_send_delay_ms', 'email_notifications',
    ];

    for (const key of KNOWN_COLUMNS) {
      if (key in data) {
        dbData[key] = data[key as keyof CompanyInfo];
      }
    }

    const { data: existing, error: selectError } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1);

    if (selectError) {
      console.error('Company settings select error:', selectError);
      throw new Error(selectError.message);
    }

    const upsert = async (payload: Record<string, unknown>) => {
      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase
          .from('company_settings')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', existing[0].id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('company_settings')
          .insert({ ...payload });
        if (insertError) throw insertError;
      }
    };

    try {
      await upsert(dbData);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : '';
      // email_notifications 컬럼이 DB에 없는 경우 해당 필드 제외 후 재시도
      if (msg.includes('email_notifications')) {
        console.warn('email_notifications column not found, retrying without it');
        delete dbData.email_notifications;
        try {
          await upsert(dbData);
          return;
        } catch (retryErr: unknown) {
          const retryMsg = retryErr && typeof retryErr === 'object' && 'message' in retryErr
            ? (retryErr as { message: string }).message : 'Unknown error';
          console.error('Company settings retry error:', retryMsg);
          throw new Error(retryMsg);
        }
      }
      console.error('Company settings save error:', msg);
      throw new Error(msg || 'Unknown error');
    }
  }
}

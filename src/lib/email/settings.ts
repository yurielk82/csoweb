// ============================================
// 이메일 설정 캐시 (30초 TTL)
// ============================================

import { getCompanyRepository } from '@/infrastructure/supabase';
import type { EmailProvider, EmailNotifications } from '@/domain/company/types';
import { DEFAULT_EMAIL_NOTIFICATIONS } from '@/domain/company/types';
import {
  DEFAULT_SMTP_PORT,
  DEFAULT_EMAIL_SEND_DELAY_MS,
  EMAIL_CACHE_TTL_MS,
} from '@/constants/defaults';

export interface EmailSettings {
  provider: EmailProvider;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from_name: string;
  smtp_from_email: string;
  resend_from_email: string;
  test_recipient_email: string;
  email_send_delay_ms: number;
  email_notifications: EmailNotifications;
}

let _cachedSettings: EmailSettings | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = EMAIL_CACHE_TTL_MS;

export async function getEmailSettings(): Promise<EmailSettings> {
  const now = Date.now();
  if (_cachedSettings && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _cachedSettings;
  }

  const info = await getCompanyRepository().get();
  _cachedSettings = {
    provider: info.email_provider || 'resend',
    smtp_host: info.smtp_host || '',
    smtp_port: info.smtp_port ?? DEFAULT_SMTP_PORT,
    smtp_secure: info.smtp_secure ?? true,
    smtp_user: info.smtp_user || '',
    smtp_password: info.smtp_password || '',
    smtp_from_name: info.smtp_from_name || '',
    smtp_from_email: info.smtp_from_email || '',
    resend_from_email: info.resend_from_email || '',
    test_recipient_email: info.test_recipient_email || '',
    email_send_delay_ms: info.email_send_delay_ms ?? DEFAULT_EMAIL_SEND_DELAY_MS,
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

export async function getTestRecipientEmail(fallbackEmail: string): Promise<string> {
  const settings = await getEmailSettings();
  return settings.test_recipient_email || fallbackEmail;
}

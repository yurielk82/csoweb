import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAutoSaveForm } from '@/hooks/useAutoSaveForm';
import { DEFAULT_COMPANY_INFO } from '@/constants/defaults';
import { API_ROUTES } from '@/constants/api';
import type { CompanyInfo } from '@/domain/company/types';

export type EmailFields = Pick<CompanyInfo,
  | 'email_provider'
  | 'smtp_host'
  | 'smtp_port'
  | 'smtp_secure'
  | 'smtp_user'
  | 'smtp_password'
  | 'smtp_from_name'
  | 'smtp_from_email'
  | 'resend_from_email'
  | 'test_recipient_email'
  | 'email_send_delay_ms'
  | 'email_notifications'
>;

const defaultEmailFields: EmailFields = {
  email_provider: DEFAULT_COMPANY_INFO.email_provider,
  smtp_host: DEFAULT_COMPANY_INFO.smtp_host,
  smtp_port: DEFAULT_COMPANY_INFO.smtp_port,
  smtp_secure: DEFAULT_COMPANY_INFO.smtp_secure,
  smtp_user: DEFAULT_COMPANY_INFO.smtp_user,
  smtp_password: DEFAULT_COMPANY_INFO.smtp_password,
  smtp_from_name: DEFAULT_COMPANY_INFO.smtp_from_name,
  smtp_from_email: DEFAULT_COMPANY_INFO.smtp_from_email,
  resend_from_email: DEFAULT_COMPANY_INFO.resend_from_email,
  test_recipient_email: DEFAULT_COMPANY_INFO.test_recipient_email,
  email_send_delay_ms: DEFAULT_COMPANY_INFO.email_send_delay_ms,
  email_notifications: { ...DEFAULT_COMPANY_INFO.email_notifications },
};

function mergeEmailData(
  serverData: Record<string, unknown>,
  defaults: EmailFields,
): EmailFields {
  return {
    email_provider: (serverData.email_provider as EmailFields['email_provider']) ?? defaults.email_provider,
    smtp_host: (serverData.smtp_host as string) ?? defaults.smtp_host,
    smtp_port: (serverData.smtp_port as number) ?? defaults.smtp_port,
    smtp_secure: (serverData.smtp_secure as boolean) ?? defaults.smtp_secure,
    smtp_user: (serverData.smtp_user as string) ?? defaults.smtp_user,
    smtp_password: (serverData.smtp_password as string) ?? defaults.smtp_password,
    smtp_from_name: (serverData.smtp_from_name as string) ?? defaults.smtp_from_name,
    smtp_from_email: (serverData.smtp_from_email as string) ?? defaults.smtp_from_email,
    resend_from_email: (serverData.resend_from_email as string) ?? defaults.resend_from_email,
    test_recipient_email: (serverData.test_recipient_email as string) ?? defaults.test_recipient_email,
    email_send_delay_ms: (serverData.email_send_delay_ms as number) ?? defaults.email_send_delay_ms,
    email_notifications: {
      ...defaults.email_notifications,
      ...(serverData.email_notifications as Record<string, boolean> | undefined),
    },
  };
}

/** 이메일 설정 페이지 전체 상태 + 액션 */
export function useEmailSettings() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const form = useAutoSaveForm<EmailFields>({
    defaultValues: defaultEmailFields,
    mergeServerData: mergeEmailData,
    saveSuccessMessage: '이메일 설정이 저장되었습니다.',
  });

  const handleConnectionTest = useCallback(async () => {
    setTesting(true);
    try {
      const emailFields = buildTestPayload(form.formData);
      const saveOk = await saveBeforeTest(emailFields, form, toast);
      if (!saveOk) return;

      const res = await fetch(API_ROUTES.SETTINGS.EMAIL_TEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: form.formData.email_provider, send_test_email: false }),
      });
      const result = await res.json();
      if (result.success && result.data?.connected) {
        toast({ title: '연결 성공', description: result.data.message });
      } else {
        toast({
          variant: 'destructive',
          title: '연결 실패',
          description: result.error || result.data?.message || '연결에 실패했습니다.',
        });
      }
    } catch (error) {
      console.error('연결 테스트 오류:', error);
      toast({ variant: 'destructive', title: '오류', description: '연결 테스트 중 오류가 발생했습니다.' });
    } finally {
      setTesting(false);
    }
  }, [form, toast]);

  const handleNotificationToggle = useCallback(
    (key: string, checked: boolean) => {
      const newNotifications = { ...form.formData.email_notifications, [key]: checked };
      form.setFormData(prev => ({ ...prev, email_notifications: newNotifications }));
      form.patchFields({ email_notifications: newNotifications } as Partial<EmailFields>);
    },
    [form],
  );

  return { ...form, testing, handleConnectionTest, handleNotificationToggle };
}

// ── 헬퍼 ──

function buildTestPayload(formData: EmailFields): Partial<CompanyInfo> {
  const base: Partial<CompanyInfo> = {
    email_provider: formData.email_provider,
    test_recipient_email: formData.test_recipient_email,
  };
  if (formData.email_provider === 'smtp') {
    return {
      ...base,
      smtp_host: formData.smtp_host,
      smtp_port: formData.smtp_port,
      smtp_secure: formData.smtp_secure,
      smtp_user: formData.smtp_user,
      smtp_password: formData.smtp_password,
      smtp_from_name: formData.smtp_from_name,
      smtp_from_email: formData.smtp_from_email,
    };
  }
  return { ...base, resend_from_email: formData.resend_from_email };
}

async function saveBeforeTest(
  emailFields: Partial<CompanyInfo>,
  form: ReturnType<typeof useAutoSaveForm<EmailFields>>,
  toast: ReturnType<typeof useToast>['toast'],
): Promise<boolean> {
  const res = await fetch(API_ROUTES.SETTINGS.COMPANY, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailFields),
  });
  const result = await res.json();
  if (!result.success) {
    toast({
      variant: 'destructive',
      title: '저장 실패',
      description: result.error || '설정 저장에 실패하여 연결 테스트를 진행할 수 없습니다.',
    });
    return false;
  }
  form.initialDataRef.current = { ...form.initialDataRef.current, ...emailFields } as EmailFields;
  return true;
}

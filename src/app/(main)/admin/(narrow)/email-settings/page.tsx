'use client';

import { Settings } from 'lucide-react';
import { useEmailSettings } from '@/hooks/useEmailSettings';
import { SettingsPageHeader } from '@/components/admin/settings/SettingsPageHeader';
import { EmailProviderCard } from '@/components/admin/email-settings/EmailProviderCard';
import { EmailNotificationsCard } from '@/components/admin/email-settings/EmailNotificationsCard';

export default function EmailSettingsPage() {
  const {
    loading,
    saving,
    formData,
    saveStatus,
    testing,
    handleChange,
    handleBlur,
    handleSave,
    handleChangeAndSave,
    handleConnectionTest,
    handleNotificationToggle,
  } = useEmailSettings();

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        icon={<Settings className="h-6 w-6" />}
        title="이메일 설정"
        description="이메일 발송 프로바이더와 알림 설정을 관리합니다."
        loading={loading}
        saving={saving}
        saveStatus={saveStatus}
        onSave={handleSave}
      />

      <EmailProviderCard
        formData={formData}
        testing={testing}
        onChange={handleChange}
        onBlur={handleBlur}
        onChangeAndSave={handleChangeAndSave}
        onConnectionTest={handleConnectionTest}
      />

      <EmailNotificationsCard
        notifications={formData.email_notifications}
        onToggle={handleNotificationToggle}
      />
    </div>
  );
}

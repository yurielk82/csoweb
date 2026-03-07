'use client';

import { Settings } from 'lucide-react';
import { useAutoSaveForm } from '@/hooks/useAutoSaveForm';
import { DEFAULT_COMPANY_INFO } from '@/constants/defaults';
import { SettingsPageHeader } from '@/components/admin/settings/SettingsPageHeader';
import { CompanyBasicInfoCard } from '@/components/admin/settings/CompanyBasicInfoCard';
import { CompanyContactCard } from '@/components/admin/settings/CompanyContactCard';
import { CompanyFooterCard } from '@/components/admin/settings/CompanyFooterCard';
import { CompanyFooterPreview } from '@/components/admin/settings/CompanyFooterPreview';
import type { CompanyInfo } from '@/domain/company/types';

export default function SettingsPage() {
  const {
    loading,
    saving,
    formData,
    saveStatus,
    handleChange,
    handleBlur,
    handleSave,
  } = useAutoSaveForm<CompanyInfo>({
    defaultValues: DEFAULT_COMPANY_INFO,
    saveMethod: 'PUT',
    saveSuccessMessage: '회사 정보가 저장되었습니다.',
  });

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        icon={<Settings className="h-6 w-6" />}
        title="사이트 설정"
        description="로그인 화면 푸터에 표시될 회사 정보를 설정합니다."
        loading={loading}
        saving={saving}
        saveStatus={saveStatus}
        onSave={handleSave}
      />

      <CompanyBasicInfoCard formData={formData} onChange={handleChange} onBlur={handleBlur} />
      <CompanyContactCard formData={formData} onChange={handleChange} onBlur={handleBlur} />
      <CompanyFooterCard formData={formData} onChange={handleChange} onBlur={handleBlur} />
      <CompanyFooterPreview formData={formData} />
    </div>
  );
}

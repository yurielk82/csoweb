'use client';

import { User, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useProfilePassword } from '@/hooks/useProfilePassword';
import { ProfileInfoCard } from '@/components/profile/ProfileInfoCard';
import { PasswordChangeCard } from '@/components/profile/PasswordChangeCard';

export default function ProfilePage() {
  const {
    loading, saving, profile, formData,
    updateField, openAddressSearch, hasProfileChanges, handleSave,
  } = useProfile();

  const {
    saving: passwordSaving, passwordForm, passwordError,
    setPasswordForm, handleUpdatePassword,
  } = useProfilePassword();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" />
          내 정보
        </h1>
        <p className="text-muted-foreground">계정 정보를 확인하고 수정하세요.</p>
      </div>

      {profile && (
        <ProfileInfoCard
          profile={profile}
          formData={formData}
          saving={saving}
          hasChanges={hasProfileChanges()}
          onFieldChange={updateField}
          onAddressSearch={openAddressSearch}
          onSave={handleSave}
        />
      )}

      <PasswordChangeCard
        currentPassword={passwordForm.currentPassword}
        newPassword={passwordForm.newPassword}
        confirmPassword={passwordForm.confirmPassword}
        passwordError={passwordError}
        saving={passwordSaving}
        onFieldChange={(field, value) =>
          setPasswordForm(prev => ({ ...prev, [field]: value }))
        }
        onSubmit={handleUpdatePassword}
      />
    </div>
  );
}

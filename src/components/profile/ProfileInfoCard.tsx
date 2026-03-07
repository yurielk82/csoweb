import { Save, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { ProfileReadOnlyFields } from '@/components/profile/ProfileReadOnlyFields';
import { ProfileEditableFields } from '@/components/profile/ProfileEditableFields';
import type { UserProfile, ProfileFormData } from '@/hooks/useProfile';

interface ProfileInfoCardProps {
  profile: UserProfile;
  formData: ProfileFormData;
  saving: boolean;
  hasChanges: boolean;
  onFieldChange: <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => void;
  onAddressSearch: () => void;
  onSave: () => void;
}

export function ProfileInfoCard({
  profile, formData, saving, hasChanges,
  onFieldChange, onAddressSearch, onSave,
}: ProfileInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Pencil className="h-4 w-4" />
          내정보 수정
        </CardTitle>
        <CardDescription>회원 정보를 확인하고 수정할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProfileReadOnlyFields profile={profile} />
        <div className="border-t pt-4" />
        <ProfileEditableFields
          formData={formData}
          onFieldChange={onFieldChange}
          onAddressSearch={onAddressSearch}
        />
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm" onClick={onSave} disabled={saving || !hasChanges}>
          {saving
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Save className="h-4 w-4 mr-2" />}
          저장
        </Button>
      </CardFooter>
    </Card>
  );
}

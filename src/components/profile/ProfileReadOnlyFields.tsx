import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserProfile } from '@/hooks/useProfile';

interface ProfileReadOnlyFieldsProps {
  profile: UserProfile;
}

export function ProfileReadOnlyFields({ profile }: ProfileReadOnlyFieldsProps) {
  const createdAt = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('ko-KR')
    : '-';

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="businessNumber">사업자번호</Label>
        <Input id="businessNumber" value={profile.business_number} disabled className="bg-muted" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">권한</Label>
        <Input id="role" value={profile.is_admin ? '관리자' : '일반 업체'} disabled className="bg-muted" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="createdAt">가입일</Label>
        <Input id="createdAt" value={createdAt} disabled className="bg-muted" />
      </div>
    </div>
  );
}

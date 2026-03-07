import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressFormSection } from '@/components/auth/AddressFormSection';
import { ContactFormSection } from '@/components/auth/ContactFormSection';
import type { ProfileFormData } from '@/hooks/useProfile';

interface ProfileEditableFieldsProps {
  formData: ProfileFormData;
  onFieldChange: <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => void;
  onAddressSearch: () => void;
}

export function ProfileEditableFields({
  formData, onFieldChange, onAddressSearch,
}: ProfileEditableFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">업체명</Label>
          <Input
            id="companyName" autoComplete="organization"
            value={formData.company_name}
            onChange={e => onFieldChange('company_name', e.target.value)}
            placeholder="업체명 입력"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ceoName">대표자명</Label>
          <Input
            id="ceoName" autoComplete="name"
            value={formData.ceo_name}
            onChange={e => onFieldChange('ceo_name', e.target.value)}
            placeholder="대표자명 입력"
          />
        </div>
      </div>

      <AddressFormSection
        zipcode={formData.zipcode}
        address1={formData.address1}
        address2={formData.address2}
        onAddress2Change={v => onFieldChange('address2', v)}
        onSearch={onAddressSearch}
        disabled={false}
      />

      <ContactFormSection
        phone1={formData.phone1}
        phone2={formData.phone2}
        email={formData.email}
        email2={formData.email2}
        onPhoneChange={(field, v) => onFieldChange(field, v)}
        onEmailChange={(field, v) => onFieldChange(field, v)}
        disabled={false}
      />
    </>
  );
}

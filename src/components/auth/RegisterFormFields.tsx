import { Alert, AlertDescription } from '@/components/ui/alert';
import { CardContent } from '@/components/ui/card';
import { BizNumberField } from '@/components/auth/BizNumberField';
import { CompanyInfoFields } from '@/components/auth/CompanyInfoFields';
import { AddressFormSection } from '@/components/auth/AddressFormSection';
import { ContactFormSection } from '@/components/auth/ContactFormSection';
import { PasswordFormSection } from '@/components/auth/PasswordFormSection';
import type { useRegister } from '@/hooks/useRegister';

type RegisterData = ReturnType<typeof useRegister>;

interface RegisterFormFieldsProps {
  d: RegisterData;
}

export function RegisterFormFields({ d }: RegisterFormFieldsProps) {
  return (
    <CardContent className="space-y-4">
      {d.error && (
        <Alert variant="destructive">
          <AlertDescription>{d.error}</AlertDescription>
        </Alert>
      )}

      <BizNumberField
        value={d.formData.business_number}
        onChange={d.handleBusinessNumberChange}
        verification={d.bizVerification}
        digitCount={d.bizDigitCount}
        onRetryVerification={d.handleRetryVerification}
        disabled={d.loading}
      />

      <CompanyInfoFields
        companyName={d.formData.company_name}
        ceoName={d.formData.ceo_name}
        onCompanyNameChange={(v) => d.setFormData({ ...d.formData, company_name: v })}
        onCeoNameChange={(v) => d.setFormData({ ...d.formData, ceo_name: v })}
        disabled={d.loading}
      />

      <AddressFormSection
        zipcode={d.formData.zipcode}
        address1={d.formData.address1}
        address2={d.formData.address2}
        onAddress2Change={(v) => d.setFormData({ ...d.formData, address2: v })}
        onSearch={d.handleAddressSearch}
        disabled={d.loading}
      />

      <ContactFormSection
        phone1={d.formData.phone1}
        phone2={d.formData.phone2}
        email={d.formData.email}
        email2={d.formData.email2}
        onPhoneChange={d.handlePhoneChange}
        onEmailChange={d.handleEmailChange}
        disabled={d.loading}
      />

      <PasswordFormSection
        password={d.formData.password}
        passwordConfirm={d.formData.password_confirm}
        onPasswordChange={(v) => d.setFormData({ ...d.formData, password: v })}
        onPasswordConfirmChange={(v) => d.setFormData({ ...d.formData, password_confirm: v })}
        disabled={d.loading}
      />
    </CardContent>
  );
}

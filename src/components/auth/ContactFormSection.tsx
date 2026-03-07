import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ContactFormSectionProps {
  phone1: string;
  phone2: string;
  email: string;
  email2: string;
  onPhoneChange: (field: 'phone1' | 'phone2', value: string) => void;
  onEmailChange: (field: 'email' | 'email2', value: string) => void;
  disabled: boolean;
}

export function ContactFormSection({
  phone1, phone2, email, email2,
  onPhoneChange, onEmailChange, disabled,
}: ContactFormSectionProps) {
  return (
    <>
      {/* 연락처 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone1">연락처1 *</Label>
          <Input
            id="phone1"
            type="tel"
            placeholder="010-0000-0000"
            value={phone1}
            onChange={(e) => onPhoneChange('phone1', e.target.value)}
            maxLength={13}
            required
            disabled={disabled}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone2">연락처2</Label>
          <Input
            id="phone2"
            type="tel"
            placeholder="선택사항"
            value={phone2}
            onChange={(e) => onPhoneChange('phone2', e.target.value)}
            maxLength={13}
            disabled={disabled}
            autoComplete="tel"
          />
        </div>
      </div>

      {/* 이메일 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">이메일 *</Label>
          <Input
            id="email"
            type="email"
            placeholder="example@company.com"
            value={email}
            onChange={(e) => onEmailChange('email', e.target.value)}
            required
            disabled={disabled}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email2">이메일2</Label>
          <Input
            id="email2"
            type="email"
            placeholder="선택사항"
            value={email2}
            onChange={(e) => onEmailChange('email2', e.target.value)}
            disabled={disabled}
            autoComplete="email"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        알림을 받을 이메일 주소를 입력하세요.
      </p>
    </>
  );
}

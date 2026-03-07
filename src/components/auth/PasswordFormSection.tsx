import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordFormSectionProps {
  password: string;
  passwordConfirm: string;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  disabled: boolean;
}

export function PasswordFormSection({
  password,
  passwordConfirm,
  onPasswordChange,
  onPasswordConfirmChange,
  disabled,
}: PasswordFormSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="password">비밀번호 *</Label>
        <Input
          id="password"
          type="password"
          placeholder="영문+숫자 조합 8자 이상"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          disabled={disabled}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password_confirm">비밀번호 확인 *</Label>
        <Input
          id="password_confirm"
          type="password"
          placeholder="비밀번호 확인"
          value={passwordConfirm}
          onChange={(e) => onPasswordConfirmChange(e.target.value)}
          required
          disabled={disabled}
          autoComplete="new-password"
        />
      </div>
    </div>
  );
}

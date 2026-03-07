import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NewPasswordFieldsProps {
  newPassword: string;
  confirmPassword: string;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  disabled: boolean;
}

export function NewPasswordFields({
  newPassword,
  confirmPassword,
  onNewPasswordChange,
  onConfirmPasswordChange,
  disabled,
}: NewPasswordFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="new_password">새 비밀번호</Label>
        <Input
          id="new_password"
          type="password"
          placeholder="영문+숫자 조합 8자 이상"
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          required
          disabled={disabled}
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm_password">새 비밀번호 확인</Label>
        <Input
          id="confirm_password"
          type="password"
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          required
          disabled={disabled}
          minLength={6}
          autoComplete="new-password"
        />
      </div>
    </>
  );
}

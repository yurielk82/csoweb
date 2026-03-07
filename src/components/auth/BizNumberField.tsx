import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BizVerificationCard } from '@/components/auth/BizVerificationCard';
import type { BizVerification } from '@/hooks/useRegister';

interface BizNumberFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  verification: BizVerification;
  digitCount: number;
  onRetryVerification: () => void;
  disabled: boolean;
}

export function BizNumberField({
  value,
  onChange,
  verification,
  digitCount,
  onRetryVerification,
  disabled,
}: BizNumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="business_number">사업자번호 *</Label>
      <Input
        id="business_number"
        type="text"
        placeholder="000-00-00000"
        value={value}
        onChange={onChange}
        maxLength={12}
        required
        disabled={disabled}
        autoComplete="off"
      />
      <BizVerificationCard
        verification={verification}
        digitCount={digitCount}
        onRetry={onRetryVerification}
      />
    </div>
  );
}

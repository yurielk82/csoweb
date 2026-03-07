import type { PasswordStrength } from '@/lib/format';

const STRENGTH_STEPS = [1, 2, 3, 4, 5] as const;
const SCORE_THRESHOLD_WEAK = 2;
const SCORE_THRESHOLD_MEDIUM = 3;

interface PasswordStrengthBarProps {
  strength: PasswordStrength;
}

export function PasswordStrengthBar({ strength }: PasswordStrengthBarProps) {
  const textColor =
    strength.score <= SCORE_THRESHOLD_WEAK ? 'text-destructive' :
    strength.score <= SCORE_THRESHOLD_MEDIUM ? 'text-warning' : 'text-success';

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {STRENGTH_STEPS.map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${
              i <= strength.score ? strength.color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${textColor}`}>
        비밀번호 강도: {strength.label}
      </p>
    </div>
  );
}

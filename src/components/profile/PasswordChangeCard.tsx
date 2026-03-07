import { Lock, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PasswordChangeCardProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordError: string;
  saving: boolean;
  onFieldChange: (field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) => void;
  onSubmit: () => void;
}

export function PasswordChangeCard({
  currentPassword, newPassword, confirmPassword, passwordError, saving,
  onFieldChange, onSubmit,
}: PasswordChangeCardProps) {
  const isDisabled = saving || !currentPassword || !newPassword || !confirmPassword;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="h-4 w-4" />
          비밀번호 변경
        </CardTitle>
        <CardDescription>로그인에 사용하는 비밀번호를 변경합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {passwordError && (
          <Alert variant="destructive">
            <AlertDescription>{passwordError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="currentPassword">현재 비밀번호</Label>
          <Input
            id="currentPassword" type="password" autoComplete="current-password"
            value={currentPassword}
            onChange={e => onFieldChange('currentPassword', e.target.value)}
            placeholder="현재 비밀번호 입력"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">새 비밀번호</Label>
          <Input
            id="newPassword" type="password" autoComplete="new-password"
            value={newPassword}
            onChange={e => onFieldChange('newPassword', e.target.value)}
            placeholder="새 비밀번호 입력 (6자 이상)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
          <Input
            id="confirmPassword" type="password" autoComplete="new-password"
            value={confirmPassword}
            onChange={e => onFieldChange('confirmPassword', e.target.value)}
            placeholder="새 비밀번호 다시 입력"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onSubmit} disabled={isDisabled}>
          {saving
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <CheckCircle className="h-4 w-4 mr-2" />}
          비밀번호 변경
        </Button>
      </CardFooter>
    </Card>
  );
}

'use client';

import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useChangePassword } from '@/hooks/useChangePassword';
import { NewPasswordFields } from '@/components/auth/NewPasswordFields';

export default function ChangePasswordPage() {
  const d = useChangePassword();

  if (d.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-warning/10 rounded-full">
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </div>
          <CardTitle className="text-2xl">비밀번호 변경 필요</CardTitle>
          <CardDescription>
            보안을 위해 비밀번호를 변경해주세요.
            <br />
            <span className="text-xs text-muted-foreground">
              사업자번호: {d.session?.business_number}
            </span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={d.handleSubmit}>
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="bg-warning/10 border-warning/20">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                임시 비밀번호로 로그인하셨습니다. 새 비밀번호를 설정해주세요.
              </AlertDescription>
            </Alert>

            {d.error && (
              <Alert variant="destructive">
                <AlertDescription>{d.error}</AlertDescription>
              </Alert>
            )}

            <NewPasswordFields
              newPassword={d.formData.new_password}
              confirmPassword={d.formData.confirm_password}
              onNewPasswordChange={(v) => d.setFormData({ ...d.formData, new_password: v })}
              onConfirmPasswordChange={(v) => d.setFormData({ ...d.formData, confirm_password: v })}
              disabled={d.saving}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={d.saving}>
              {d.saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              비밀번호 변경
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

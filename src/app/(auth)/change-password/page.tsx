'use client';

import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useChangePassword } from '@/hooks/useChangePassword';

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

            <div className="space-y-2">
              <Label htmlFor="new_password">새 비밀번호</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="영문+숫자 조합 8자 이상"
                value={d.formData.new_password}
                onChange={(e) => d.setFormData({ ...d.formData, new_password: e.target.value })}
                required
                disabled={d.saving}
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
                value={d.formData.confirm_password}
                onChange={(e) => d.setFormData({ ...d.formData, confirm_password: e.target.value })}
                required
                disabled={d.saving}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
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

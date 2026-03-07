'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, KeyRound, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useResetPassword } from '@/hooks/useResetPassword';
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar';

function LoadingView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">토큰을 검증하고 있습니다...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpiredView({ error }: { error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-destructive/10 rounded-full"><XCircle className="h-8 w-8 text-destructive" /></div>
          </div>
          <CardTitle className="text-2xl text-destructive">링크 만료</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
            <AlertDescription className="text-sm text-destructive">비밀번호 재설정 링크는 30분 동안만 유효하며, 1회만 사용 가능합니다.</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/forgot-password" className="w-full"><Button className="w-full"><KeyRound className="mr-2 h-4 w-4" />비밀번호 찾기 다시 시도</Button></Link>
          <Link href="/login" className="w-full"><Button variant="outline" className="w-full">로그인 페이지로 이동</Button></Link>
        </CardFooter>
      </Card>
    </div>
  );
}

function SuccessView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-success/10 rounded-full"><CheckCircle className="h-8 w-8 text-success" /></div>
          </div>
          <CardTitle className="text-2xl text-success">비밀번호 변경 완료!</CardTitle>
          <CardDescription className="mt-2">
            비밀번호가 성공적으로 변경되었습니다.<br />
            <span className="text-sm text-muted-foreground">3초 후 로그인 페이지로 이동합니다...</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-success/10 border-success/20">
            <Shield className="h-4 w-4 text-success" /><AlertDescription className="text-sm text-success">새 비밀번호로 로그인해 주세요.</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter><Link href="/login" className="w-full"><Button className="w-full">지금 로그인하기</Button></Link></CardFooter>
      </Card>
    </div>
  );
}

function ResetForm({ d }: { d: ReturnType<typeof useResetPassword> }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><div className="p-3 bg-primary/10 rounded-full"><Lock className="h-8 w-8 text-primary" /></div></div>
          <CardTitle className="text-2xl">새 비밀번호 설정</CardTitle>
          <CardDescription>
            {d.tokenInfo && (<><span className="font-semibold text-foreground">{d.tokenInfo.company_name}</span><br /><span className="text-xs">{d.tokenInfo.email}</span></>)}
          </CardDescription>
        </CardHeader>
        <form onSubmit={d.handleSubmit}>
          <CardContent className="space-y-4">
            {d.error && <Alert variant="destructive"><AlertDescription>{d.error}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label htmlFor="new_password">새 비밀번호</Label>
              <div className="relative">
                <Input id="new_password" type={d.showPassword ? 'text' : 'password'} placeholder="6자 이상 입력" value={d.formData.new_password} onChange={(e) => d.setFormData({ ...d.formData, new_password: e.target.value })} required disabled={d.submitting} minLength={6} className="pr-10" autoComplete="new-password" />
                <button type="button" onClick={d.toggleShowPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {d.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {d.formData.new_password && <PasswordStrengthBar strength={d.passwordStrength} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">비밀번호 확인</Label>
              <div className="relative">
                <Input id="confirm_password" type={d.showConfirmPassword ? 'text' : 'password'} placeholder="비밀번호 재입력" value={d.formData.confirm_password} onChange={(e) => d.setFormData({ ...d.formData, confirm_password: e.target.value })} required disabled={d.submitting} minLength={6} className="pr-10" autoComplete="new-password" />
                <button type="button" onClick={d.toggleShowConfirmPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {d.showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {d.formData.confirm_password && d.formData.new_password !== d.formData.confirm_password && <p className="text-xs text-destructive">비밀번호가 일치하지 않습니다.</p>}
              {d.formData.confirm_password && d.formData.new_password === d.formData.confirm_password && <p className="text-xs text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" /> 비밀번호가 일치합니다.</p>}
            </div>
            <Alert className="bg-warning/10 border-warning/20">
              <Shield className="h-4 w-4 text-warning" />
              <AlertDescription className="text-xs text-warning">
                <strong>안전한 비밀번호 팁:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5"><li>8자 이상 권장</li><li>영문 대/소문자, 숫자, 특수문자 조합</li><li>다른 사이트와 다른 비밀번호 사용</li></ul>
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={d.submitting || d.formData.new_password !== d.formData.confirm_password}>
              {d.submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}비밀번호 변경
            </Button>
            <p className="text-sm text-center text-muted-foreground"><Link href="/login" className="text-primary hover:underline">로그인으로 돌아가기</Link></p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function ResetPasswordContent() {
  const d = useResetPassword();
  if (d.loading) return <LoadingView />;
  if (d.tokenError) return <ExpiredView error={d.tokenError} />;
  if (d.success) return <SuccessView />;
  return <ResetForm d={d} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-muted"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

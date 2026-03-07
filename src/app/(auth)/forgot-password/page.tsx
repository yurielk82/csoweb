'use client';

import Link from 'next/link';
import { Loader2, CheckCircle, KeyRound, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForgotPassword } from '@/hooks/useForgotPassword';

export default function ForgotPasswordPage() {
  const {
    loading, error, success, formData, setFormData,
    handleBusinessNumberChange, handleSubmit, handleRetry,
  } = useForgotPassword();

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-success/10 rounded-full">
                <Mail className="h-8 w-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl">이메일을 확인해주세요</CardTitle>
            <CardDescription className="space-y-3 mt-2">
              <p>
                <span className="font-semibold text-foreground">{formData.email}</span>
                <br />
                으로 비밀번호 재설정 링크를 발송했습니다.
              </p>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>이메일의 비밀번호 재설정 버튼을 클릭하세요.</li>
                  <li>링크는 <strong>30분</strong> 동안만 유효합니다.</li>
                  <li>이메일이 오지 않으면 스팸함을 확인해주세요.</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleRetry}
            >
              다시 요청하기
            </Button>
            <Link href="/login" className="w-full">
              <Button className="w-full">
                로그인 페이지로 이동
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">비밀번호 찾기</CardTitle>
          <CardDescription>
            가입 시 등록한 사업자번호와 이메일을 입력하세요.
            <br />
            비밀번호 재설정 링크를 이메일로 발송해 드립니다.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="business_number">사업자번호</Label>
              <Input
                id="business_number"
                type="text"
                placeholder="000-00-00000"
                value={formData.business_number}
                onChange={handleBusinessNumberChange}
                maxLength={12}
                required
                disabled={loading}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">가입 시 등록한 이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <Alert className="bg-primary/10 border-primary/20">
              <Send className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm text-primary">
                입력하신 이메일로 비밀번호 재설정 링크가 발송됩니다.
                <br />
                <span className="text-xs text-primary">
                  * 링크는 30분 동안 유효하며, 1회만 사용 가능합니다.
                </span>
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              재설정 링크 발송
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                로그인으로 돌아가기
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

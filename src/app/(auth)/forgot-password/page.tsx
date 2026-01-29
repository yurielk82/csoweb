'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle, KeyRound, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    business_number: '',
    email: '',
  });

  const formatBusinessNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBusinessNumber(e.target.value);
    setFormData({ ...formData, business_number: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_number: formData.business_number,
          email: formData.email,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '비밀번호 재설정 요청에 실패했습니다.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('비밀번호 재설정 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Mail className="h-8 w-8 text-green-600" />
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
              <CheckCircle className="h-4 w-4 text-green-600" />
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
              onClick={() => {
                setSuccess(false);
                setFormData({ business_number: '', email: '' });
              }}
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
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
              />
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Send className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                입력하신 이메일로 비밀번호 재설정 링크가 발송됩니다.
                <br />
                <span className="text-xs text-blue-600">
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

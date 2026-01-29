'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, KeyRound, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TokenInfo {
  company_name: string;
  business_number: string;
  email: string;
  expires_at: string;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  });

  // 비밀번호 강도 체크
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return { score, label: '약함', color: 'bg-red-500' };
    if (score <= 3) return { score, label: '보통', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: '강함', color: 'bg-green-500' };
    return { score, label: '매우 강함', color: 'bg-green-600' };
  };

  const passwordStrength = getPasswordStrength(formData.new_password);

  // 토큰 유효성 검증
  useEffect(() => {
    if (!token) {
      setTokenError('유효하지 않은 접근입니다. 비밀번호 찾기를 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password-verify?token=${token}`);
        const result = await response.json();

        if (!result.success) {
          setTokenError(result.error || '유효하지 않은 토큰입니다.');
          return;
        }

        setTokenInfo(result.data);
      } catch {
        setTokenError('토큰 검증 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (formData.new_password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: formData.new_password,
          confirm_password: formData.confirm_password,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '비밀번호 변경에 실패했습니다.');
        return;
      }

      setSuccess(true);
      
      // 3초 후 로그인 페이지로 리다이렉트
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch {
      setError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">토큰을 검증하고 있습니다...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 토큰 에러 상태
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-red-600">링크 만료</CardTitle>
            <CardDescription className="mt-2">
              {tokenError}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertDescription className="text-sm text-red-800">
                비밀번호 재설정 링크는 30분 동안만 유효하며, 1회만 사용 가능합니다.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full">
                <KeyRound className="mr-2 h-4 w-4" />
                비밀번호 찾기 다시 시도
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                로그인 페이지로 이동
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 성공 상태
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-600">비밀번호 변경 완료!</CardTitle>
            <CardDescription className="mt-2">
              비밀번호가 성공적으로 변경되었습니다.
              <br />
              <span className="text-sm text-muted-foreground">
                3초 후 로그인 페이지로 이동합니다...
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-green-50 border-green-200">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800">
                새 비밀번호로 로그인해 주세요.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full">
                지금 로그인하기
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 비밀번호 입력 폼
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">새 비밀번호 설정</CardTitle>
          <CardDescription>
            {tokenInfo && (
              <>
                <span className="font-semibold text-foreground">{tokenInfo.company_name}</span>
                <br />
                <span className="text-xs">{tokenInfo.email}</span>
              </>
            )}
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
              <Label htmlFor="new_password">새 비밀번호</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="6자 이상 입력"
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                  required
                  disabled={submitting}
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* 비밀번호 강도 표시 */}
              {formData.new_password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${
                          i <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    passwordStrength.score <= 2 ? 'text-red-500' : 
                    passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    비밀번호 강도: {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">비밀번호 확인</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="비밀번호 재입력"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  required
                  disabled={submitting}
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirm_password && formData.new_password !== formData.confirm_password && (
                <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
              )}
              {formData.confirm_password && formData.new_password === formData.confirm_password && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> 비밀번호가 일치합니다.
                </p>
              )}
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                <strong>안전한 비밀번호 팁:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>8자 이상 권장</li>
                  <li>영문 대/소문자, 숫자, 특수문자 조합</li>
                  <li>다른 사이트와 다른 비밀번호 사용</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting || formData.new_password !== formData.confirm_password}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              비밀번호 변경
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

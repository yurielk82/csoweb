'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, AlertTriangle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<{ business_number: string; company_name: string; email: string; must_change_password: boolean; is_admin: boolean } | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          if (!result.data.must_change_password) {
            router.push(result.data.is_admin ? '/admin' : '/dashboard');
            return;
          }
          setSession(result.data);
          // @temp.local 이메일이면 실제 이메일 입력 필요
          if (result.data.email?.endsWith('@temp.local')) {
            setNeedsEmail(true);
          }
        } else {
          router.push('/login');
        }
      })
      .catch(() => {
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 이메일 유효성 검사
    if (needsEmail) {
      if (!formData.email.trim()) {
        setError('이메일을 입력해주세요.');
        return;
      }
      if (!EMAIL_REGEX.test(formData.email)) {
        setError('올바른 이메일 형식을 입력해주세요.');
        return;
      }
      if (formData.email.endsWith('@temp.local')) {
        setError('실제 사용하는 이메일을 입력해주세요.');
        return;
      }
    }

    if (formData.new_password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 초기 비밀번호 패턴 차단: u+사업자번호 (기존) + 뒤 5자리 (신규)
    const normalizedBN = session?.business_number.replace(/-/g, '') || '';
    const legacyDefault = `u${normalizedBN}`;
    const newDefault = normalizedBN.slice(-5);
    if (formData.new_password === legacyDefault || formData.new_password === newDefault) {
      setError('초기 비밀번호와 다른 비밀번호를 입력해주세요.');
      return;
    }

    setSaving(true);

    try {
      const body: Record<string, string> = {
        new_password: formData.new_password,
      };
      if (needsEmail) {
        body.email = formData.email.trim();
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '비밀번호 변경에 실패했습니다.');
        return;
      }

      router.push(result.data?.redirect || '/dashboard');
    } catch {
      setError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">초기 설정 필요</CardTitle>
          <CardDescription>
            {needsEmail
              ? '이메일과 비밀번호를 설정해주세요.'
              : '보안을 위해 비밀번호를 변경해주세요.'}
            <br />
            <span className="text-xs text-muted-foreground">
              {session?.company_name} ({session?.business_number})
            </span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {needsEmail
                  ? '처음 로그인하셨습니다. 이메일과 새 비밀번호를 설정해주세요.'
                  : '임시 비밀번호로 로그인하셨습니다. 새 비밀번호를 설정해주세요.'}
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {needsEmail && (
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="실제 사용하는 이메일 입력"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={saving}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  비밀번호 재설정 등에 사용됩니다.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new_password">새 비밀번호</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="6자 이상 입력"
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                required
                disabled={saving}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">새 비밀번호 확인</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="비밀번호 재입력"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                required
                disabled={saving}
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {needsEmail ? '설정 완료' : '비밀번호 변경'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

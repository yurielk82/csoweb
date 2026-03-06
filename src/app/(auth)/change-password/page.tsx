'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SessionData {
  business_number: string;
  company_name: string;
  email: string;
  must_change_password: boolean;
  profile_complete: boolean;
  is_admin: boolean;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SessionData | null>(null);

  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    async function init() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionResult = await sessionRes.json();

        if (!sessionResult.success || !sessionResult.data) {
          router.push('/login');
          return;
        }

        if (!sessionResult.data.must_change_password) {
          // 비밀번호 변경이 필요 없으면 프로필 완성 또는 대시보드로
          if (!sessionResult.data.profile_complete) {
            router.push('/complete-profile');
          } else {
            router.push(sessionResult.data.is_admin ? '/admin' : '/home');
          }
          return;
        }

        setSession(sessionResult.data);
      } catch (error) {
        console.error('비밀번호 변경 세션 확인 중 오류:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.new_password.length < 8 || !/[a-zA-Z]/.test(formData.new_password) || !/[0-9]/.test(formData.new_password)) {
      setError('비밀번호는 영문+숫자 조합 8자 이상이어야 합니다.');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 초기 비밀번호 패턴 차단
    const normalizedBN = session?.business_number.replace(/-/g, '') || '';
    const blockedPasswords = [
      `u${normalizedBN}`,
      normalizedBN,
      normalizedBN.slice(-5),
    ];
    if (blockedPasswords.includes(formData.new_password)) {
      setError('초기 비밀번호와 다른 비밀번호를 입력해주세요.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: formData.new_password }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '비밀번호 변경에 실패했습니다.');
        return;
      }

      router.push(result.data?.redirect || '/home');
    } catch (error) {
      console.error('비밀번호 변경 처리 중 오류:', error);
      setError('처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
              사업자번호: {session?.business_number}
            </span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="bg-warning/10 border-warning/20">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                임시 비밀번호로 로그인하셨습니다. 새 비밀번호를 설정해주세요.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="new_password">새 비밀번호</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="영문+숫자 조합 8자 이상"
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                required
                disabled={saving}
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
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                required
                disabled={saving}
                minLength={6}
                autoComplete="new-password"
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
              비밀번호 변경
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

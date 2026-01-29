'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<{ business_number: string; company_name: string; must_change_password: boolean } | null>(null);
  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    // 세션 확인
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          // 비밀번호 변경이 필요하지 않으면 대시보드로 리다이렉트
          if (!result.data.must_change_password) {
            router.push(result.data.is_admin ? '/admin' : '/dashboard');
            return;
          }
          setSession(result.data);
        } else {
          // 로그인 필요
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

    // 유효성 검사
    if (formData.new_password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 초기 비밀번호와 동일한지 체크 (u + 사업자번호)
    const defaultPassword = `u${session?.business_number.replace(/-/g, '')}`;
    if (formData.new_password === defaultPassword) {
      setError('초기 비밀번호와 다른 비밀번호를 입력해주세요.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_password: formData.new_password,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '비밀번호 변경에 실패했습니다.');
        return;
      }

      // 성공 시 대시보드로 리다이렉트
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
          <CardTitle className="text-2xl">비밀번호 변경 필요</CardTitle>
          <CardDescription>
            보안을 위해 비밀번호를 변경해주세요.
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
                임시 비밀번호로 로그인하셨습니다. 
                <br />
                계속 사용하시려면 새 비밀번호를 설정해주세요.
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
              비밀번호 변경
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

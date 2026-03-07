'use client';

import Link from 'next/link';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLogin } from '@/hooks/useLogin';
import { LoginFooter } from '@/components/auth/LoginFooter';

export default function LoginPage() {
  const {
    loading, error, formData, setFormData, companyInfo,
    handleBusinessNumberChange, handleSubmit,
  } = useLogin();

  return (
    <div className="login-glass-bg">
      {/* Animated Mesh Gradient Orbs */}
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="login-orb login-orb-3" aria-hidden="true" />

      {/* Main Content — centers the glass card */}
      <div className="login-glass-content">
        <div className="glass-card">
          {/* Icon with Glow */}
          <div className="login-icon-glow">
            <FileSpreadsheet />
          </div>

          {/* Title & Subtitle */}
          <h1 className="login-glass-title">CSO 정산서 포털</h1>
          <p className="login-glass-subtitle">사업자번호와 비밀번호로 로그인하세요</p>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-glass-form">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="login-glass-field">
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

            <div className="login-glass-field">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="glass-button" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              로그인
            </button>
          </form>

          {/* Links */}
          <div className="login-glass-links">
            <Link href="/forgot-password">
              비밀번호를 잊으셨나요?
            </Link>
            <p>
              계정이 없으신가요?{' '}
              <Link href="/register">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>

      <LoginFooter companyInfo={companyInfo} />
    </div>
  );
}

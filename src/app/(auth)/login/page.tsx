'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLogin } from '@/hooks/useLogin';

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

      {/* Footer */}
      <footer className="login-glass-footer">
        <div className="max-w-6xl mx-auto space-y-2">
          {/* 회사 정보 */}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
            {companyInfo?.company_name && (
              <span className="login-footer-company">{companyInfo.company_name}</span>
            )}
            {companyInfo?.company_name && (companyInfo.ceo_name || companyInfo.business_number || companyInfo.address || companyInfo.phone) && (
              <span className="login-footer-divider">|</span>
            )}
            {companyInfo?.ceo_name && (
              <span>대표: {companyInfo.ceo_name}</span>
            )}
            {companyInfo?.business_number && (
              <span>사업자: {companyInfo.business_number}</span>
            )}
            {companyInfo?.address && (
              <span>{companyInfo.address}</span>
            )}
            {companyInfo?.phone && (
              <span>TEL: {companyInfo.phone}</span>
            )}
            {companyInfo?.fax && (
              <span>FAX: {companyInfo.fax}</span>
            )}
            {companyInfo?.email && (
              <span>{companyInfo.email}</span>
            )}
            {companyInfo?.website && (
              <a
                href={companyInfo.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {companyInfo.website}
              </a>
            )}
          </div>

          {/* 저작권 및 라이선스 */}
          <div className="login-footer-copyright flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-1">
            <span>&copy; 2026 KDH | Sales Management Team</span>
            <span className="login-footer-divider">|</span>
            {/* 공공누리 */}
            <a
              href="https://www.kogl.or.kr/info/license.do#702"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
            >
              <Image
                src="https://www.kogl.or.kr/open/web/images/images_2014/codetype/new_img_opencode1.jpg"
                alt="공공누리"
                width={64}
                height={16}
                className="h-4 w-auto"
              />
              <span>공공누리</span>
            </a>
            <span className="login-footer-divider">|</span>
            {/* CC BY 4.0 */}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5"
            >
              <Image src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="CC" width={14} height={14} className="h-3.5 w-3.5" />
              <Image src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="BY" width={14} height={14} className="h-3.5 w-3.5" />
              <span>CC BY 4.0</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

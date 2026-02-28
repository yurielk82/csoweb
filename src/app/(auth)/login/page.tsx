'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CompanyInfo {
  company_name: string;
  ceo_name: string;
  business_number: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    business_number: '',
    password: '',
  });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  // 로그인 성공 후 이동할 경로 (상태 반영 후 이동용)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  // user 상태가 반영된 후에만 페이지 이동
  useEffect(() => {
    if (pendingRedirect && user) {
      router.push(pendingRedirect);
      setPendingRedirect(null);
    }
  }, [user, pendingRedirect, router]);

  useEffect(() => {
    // 회사 정보 로드
    fetch('/api/settings/company')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setCompanyInfo(result.data);
        }
      })
      .catch(console.error);
  }, []);

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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '로그인에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 로그인 성공: AuthContext 상태 업데이트 (localStorage도 자동 저장됨)
      if (result.data.user) {
        setPendingRedirect(result.data.redirect);
        setUser(result.data.user);
        // useEffect에서 user가 반영되면 자동으로 이동
      }
      // loading은 이동 완료 전까지 유지 (UX)
    } catch (error) {
      console.error('로그인 처리 중 오류:', error);
      setError('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

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

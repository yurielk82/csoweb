'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    business_number: '',
    password: '',
  });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

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
        return;
      }

      router.push(result.data.redirect);
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">CSO 정산서 포털</CardTitle>
            <CardDescription>사업자번호와 비밀번호로 로그인하세요</CardDescription>
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
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                로그인
              </Button>
              <div className="text-sm text-center text-muted-foreground space-y-1">
                <p>
                  <Link href="/forgot-password" className="text-primary hover:underline">
                    비밀번호를 잊으셨나요?
                  </Link>
                </p>
                <p>
                  계정이 없으신가요?{' '}
                  <Link href="/register" className="text-primary hover:underline">
                    회원가입
                  </Link>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-white/50 border-t py-3 px-4">
        <div className="max-w-6xl mx-auto text-xs text-muted-foreground space-y-2">
          {/* 회사 정보 */}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
            {companyInfo?.company_name && (
              <span className="font-medium text-foreground">{companyInfo.company_name}</span>
            )}
            {companyInfo?.company_name && (companyInfo.ceo_name || companyInfo.business_number || companyInfo.address || companyInfo.phone) && (
              <span className="text-muted-foreground/50">|</span>
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
                className="text-primary hover:underline"
              >
                {companyInfo.website}
              </a>
            )}
          </div>
          
          {/* 저작권 */}
          <div className="text-center pt-1 border-t border-muted-foreground/10">
            <span>© 2026 KDH | Sales Management Team</span>
          </div>
          
          {/* 라이선스 정보 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
            {/* 공공누리 KOGL 제1유형 라이선스 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md">
              <a 
                href="https://www.kogl.or.kr/info/license.do#702" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-shrink-0"
              >
                <img 
                  src="https://www.kogl.or.kr/open/web/images/images_2014/codetype/new_img_opencode1.jpg" 
                  alt="공공누리 1유형 마크" 
                  className="h-8 w-auto object-contain"
                />
              </a>
              <span className="text-[10px] leading-tight text-gray-600">
                공공누리 <strong className="text-teal-700">&quot;출처표시&quot;</strong> 조건
              </span>
            </div>
            
            {/* CC BY 4.0 라이선스 */}
            <a 
              href="https://creativecommons.org/licenses/by/4.0/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              title="CC BY 4.0 라이선스"
            >
              <img 
                src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" 
                alt="CC" 
                className="h-4 w-4"
              />
              <img 
                src="https://mirrors.creativecommons.org/presskit/icons/by.svg" 
                alt="BY" 
                className="h-4 w-4"
              />
              <span className="text-[10px] text-gray-600">CC BY 4.0</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

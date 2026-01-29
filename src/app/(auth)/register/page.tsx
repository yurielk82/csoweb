'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileSpreadsheet, Loader2, CheckCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// 다음 주소 검색 타입 선언
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
      }) => { open: () => void };
    };
  }
}

interface DaumPostcodeData {
  address: string;
  addressType: string;
  bname: string;
  buildingName: string;
  zonecode: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    business_number: '',
    company_name: '',
    ceo_name: '',
    address: '',
    address_detail: '',
    phone1: '',
    phone2: '',
    email: '',
    email2: '',
    password: '',
    password_confirm: '',
  });

  // 다음 주소 검색 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const formatBusinessNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
  };

  // 전화번호 포맷 (02-xxxx-xxxx, 0xx-xxx-xxxx, 0xx-xxxx-xxxx 모두 지원)
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    
    // 서울 지역번호 (02)
    if (digits.startsWith('02')) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
    }
    
    // 그 외 (010, 011, 031 등)
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBusinessNumber(e.target.value);
    setFormData({ ...formData, business_number: formatted });
  };

  const handlePhoneChange = (field: 'phone1' | 'phone2', value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData({ ...formData, [field]: formatted });
  };

  // 다음 주소 검색
  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum) {
      new window.daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          setFormData({ 
            ...formData, 
            address: data.address,
            address_detail: ''
          });
        },
      }).open();
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.password_confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    try {
      const fullAddress = formData.address_detail 
        ? `${formData.address} ${formData.address_detail}`
        : formData.address;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_number: formData.business_number,
          company_name: formData.company_name,
          ceo_name: formData.ceo_name,
          address: fullAddress,
          phone1: formData.phone1,
          phone2: formData.phone2 || undefined,
          email: formData.email,
          email2: formData.email2 || undefined,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '회원가입에 실패했습니다.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('회원가입 중 오류가 발생했습니다.');
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
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">회원가입 신청 완료</CardTitle>
            <CardDescription>
              회원가입 신청이 완료되었습니다.<br />
              관리자 승인 후 로그인하실 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => router.push('/login')}
            >
              로그인 페이지로 이동
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>CSO 정산서 포털 회원가입</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* 사업자번호 */}
            <div className="space-y-2">
              <Label htmlFor="business_number">사업자번호 *</Label>
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

            {/* 업체명 */}
            <div className="space-y-2">
              <Label htmlFor="company_name">업체명 *</Label>
              <Input
                id="company_name"
                type="text"
                placeholder="업체명을 입력하세요"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            {/* 대표자명 */}
            <div className="space-y-2">
              <Label htmlFor="ceo_name">대표자명 *</Label>
              <Input
                id="ceo_name"
                type="text"
                placeholder="대표자명을 입력하세요"
                value={formData.ceo_name}
                onChange={(e) => setFormData({ ...formData, ceo_name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            {/* 주소 */}
            <div className="space-y-2">
              <Label htmlFor="address">주소 *</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  type="text"
                  placeholder="주소 검색을 클릭하세요"
                  value={formData.address}
                  readOnly
                  required
                  disabled={loading}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddressSearch}
                  disabled={loading}
                >
                  <Search className="h-4 w-4 mr-1" />
                  검색
                </Button>
              </div>
              <Input
                type="text"
                placeholder="상세 주소를 입력하세요"
                value={formData.address_detail}
                onChange={(e) => setFormData({ ...formData, address_detail: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* 연락처 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone1">연락처1 *</Label>
                <Input
                  id="phone1"
                  type="text"
                  placeholder="010-0000-0000"
                  value={formData.phone1}
                  onChange={(e) => handlePhoneChange('phone1', e.target.value)}
                  maxLength={13}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone2">연락처2</Label>
                <Input
                  id="phone2"
                  type="text"
                  placeholder="선택사항"
                  value={formData.phone2}
                  onChange={(e) => handlePhoneChange('phone2', e.target.value)}
                  maxLength={13}
                  disabled={loading}
                />
              </div>
            </div>

            {/* 이메일 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">이메일2</Label>
                <Input
                  id="email2"
                  type="email"
                  placeholder="선택사항"
                  value={formData.email2}
                  onChange={(e) => setFormData({ ...formData, email2: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              알림을 받을 이메일 주소를 입력하세요.
            </p>

            {/* 비밀번호 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="6자 이상"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirm">비밀번호 확인 *</Label>
                <Input
                  id="password_confirm"
                  type="password"
                  placeholder="비밀번호 확인"
                  value={formData.password_confirm}
                  onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              회원가입 신청
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

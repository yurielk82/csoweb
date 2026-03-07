'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Loader2, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { API_ROUTES } from '@/constants/api';

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
  roadAddress: string;
  jibunAddress: string;
  addressType: string;
  bname: string;
  buildingName: string;
  zonecode: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SessionData {
  business_number: string;
  company_name: string;
  email: string;
  must_change_password: boolean;
  profile_complete: boolean;
  is_admin: boolean;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SessionData | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    ceo_name: '',
    zipcode: '',
    address1: '',
    address2: '',
    phone1: '',
    phone2: '',
    email: '',
    email2: '',
  });

  // 다음 주소 검색 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    async function init() {
      try {
        // 1. 세션 확인
        const sessionRes = await fetch(API_ROUTES.AUTH.SESSION);
        const sessionResult = await sessionRes.json();

        if (!sessionResult.success || !sessionResult.data) {
          router.push('/login');
          return;
        }

        // 비밀번호 변경이 아직 필요하면 그쪽으로
        if (sessionResult.data.must_change_password) {
          router.push('/change-password');
          return;
        }

        // 이미 프로필 완성됨
        if (sessionResult.data.profile_complete) {
          router.push(sessionResult.data.is_admin ? '/admin' : '/home');
          return;
        }

        setSession(sessionResult.data);

        // 2. DB에서 실제 프로필 조회하여 기존 데이터 프리필
        const profileRes = await fetch(API_ROUTES.USERS.PROFILE);
        const profileResult = await profileRes.json();

        if (profileResult.success && profileResult.data) {
          const p = profileResult.data;
          setFormData({
            company_name: p.company_name || '',
            ceo_name: p.ceo_name || '',
            zipcode: p.zipcode || '',
            address1: p.address1 || '',
            address2: p.address2 || '',
            phone1: p.phone1 || '',
            phone2: p.phone2 || '',
            email: p.email?.endsWith('@temp.local') ? '' : (p.email || ''),
            email2: p.email2 || '',
          });
        }
      } catch (error) {
        console.error('프로필 초기화 중 오류:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('02')) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
    }
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (field: 'phone1' | 'phone2', value: string) => {
    setFormData({ ...formData, [field]: formatPhoneNumber(value) });
  };

  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum) {
      new window.daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          const roadAddr = data.roadAddress || data.address;
          setFormData({
            ...formData,
            zipcode: data.zonecode,
            address1: roadAddr,
            address2: '',
          });
        },
      }).open();
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 필수 필드 유효성 검사
    if (!formData.company_name.trim()) {
      setError('업체명을 입력해주세요.');
      return;
    }
    if (!formData.ceo_name.trim()) {
      setError('대표자명을 입력해주세요.');
      return;
    }
    if (!formData.zipcode || !formData.address1) {
      setError('주소를 검색하여 입력해주세요.');
      return;
    }
    if (!formData.phone1.trim()) {
      setError('연락처를 입력해주세요.');
      return;
    }
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
    if (formData.email2 && !EMAIL_REGEX.test(formData.email2)) {
      setError('이메일2의 형식이 올바르지 않습니다.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(API_ROUTES.AUTH.COMPLETE_PROFILE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: formData.company_name.trim(),
          ceo_name: formData.ceo_name.trim(),
          zipcode: formData.zipcode,
          address1: formData.address1,
          address2: formData.address2 || undefined,
          phone1: formData.phone1,
          phone2: formData.phone2 || undefined,
          email: formData.email.trim(),
          email2: formData.email2 || undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '프로필 저장에 실패했습니다.');
        return;
      }

      router.push(result.data?.redirect || '/home');
    } catch (error) {
      console.error('프로필 저장 처리 중 오류:', error);
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
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">회원 정보 설정</CardTitle>
          <CardDescription>
            서비스 이용을 위해 회원 정보를 입력해주세요.
            <br />
            <span className="text-xs text-muted-foreground">
              사업자번호: {session?.business_number}
            </span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
                disabled={saving}
                autoComplete="organization"
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
                disabled={saving}
                autoComplete="name"
              />
            </div>

            {/* 주소 */}
            <div className="space-y-2">
              <Label htmlFor="address1">주소 *</Label>
              <div className="flex gap-2">
                <Input
                  id="zipcode"
                  type="text"
                  placeholder="우편번호"
                  value={formData.zipcode}
                  readOnly
                  required
                  disabled={saving}
                  className="w-28"
                  autoComplete="postal-code"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddressSearch}
                  disabled={saving}
                >
                  <Search className="h-4 w-4 mr-1" />
                  주소 검색
                </Button>
              </div>
              <Input
                id="address1"
                type="text"
                placeholder="도로명 주소"
                value={formData.address1}
                readOnly
                required
                disabled={saving}
                autoComplete="address-line1"
              />
              <Input
                id="address2"
                type="text"
                placeholder="상세 주소를 입력하세요"
                value={formData.address2}
                onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                disabled={saving}
                autoComplete="address-line2"
              />
            </div>

            {/* 연락처 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone1">연락처1 *</Label>
                <Input
                  id="phone1"
                  type="tel"
                  placeholder="010-0000-0000"
                  value={formData.phone1}
                  onChange={(e) => handlePhoneChange('phone1', e.target.value)}
                  maxLength={13}
                  required
                  disabled={saving}
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone2">연락처2</Label>
                <Input
                  id="phone2"
                  type="tel"
                  placeholder="선택사항"
                  value={formData.phone2}
                  onChange={(e) => handlePhoneChange('phone2', e.target.value)}
                  maxLength={13}
                  disabled={saving}
                  autoComplete="tel"
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
                  disabled={saving}
                  autoComplete="email"
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
                  disabled={saving}
                  autoComplete="email"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              알림을 받을 이메일 주소를 입력하세요.
            </p>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              설정 완료
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

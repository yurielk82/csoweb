'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, AlertTriangle, Search } from 'lucide-react';
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
  is_admin: boolean;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SessionData | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

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
    new_password: '',
    confirm_password: '',
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
          const isTempEmail = result.data.email?.endsWith('@temp.local');
          setNeedsProfile(isTempEmail);
          if (isTempEmail) {
            setFormData(prev => ({
              ...prev,
              company_name: result.data.company_name || '',
            }));
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

    // 프로필 양식 유효성 검사
    if (needsProfile) {
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
    }

    if (formData.new_password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 초기 비밀번호 패턴 차단: u+사업자번호(기존) + 사업자번호 전체(신규) + 뒤 5자리(레거시)
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
      const body: Record<string, string | undefined> = {
        new_password: formData.new_password,
      };

      if (needsProfile) {
        body.company_name = formData.company_name.trim();
        body.ceo_name = formData.ceo_name.trim();
        body.zipcode = formData.zipcode;
        body.address1 = formData.address1;
        body.address2 = formData.address2 || undefined;
        body.phone1 = formData.phone1;
        body.phone2 = formData.phone2 || undefined;
        body.email = formData.email.trim();
        body.email2 = formData.email2 || undefined;
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '설정에 실패했습니다.');
        return;
      }

      router.push(result.data?.redirect || '/dashboard');
    } catch {
      setError('처리 중 오류가 발생했습니다.');
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
      <Card className={needsProfile ? 'w-full max-w-lg' : 'w-full max-w-md'}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {needsProfile ? '회원 정보 설정' : '비밀번호 변경 필요'}
          </CardTitle>
          <CardDescription>
            {needsProfile
              ? '서비스 이용을 위해 회원 정보를 입력해주세요.'
              : '보안을 위해 비밀번호를 변경해주세요.'}
            <br />
            <span className="text-xs text-muted-foreground">
              사업자번호: {session?.business_number}
            </span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {!needsProfile && (
              <Alert variant="destructive" className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  임시 비밀번호로 로그인하셨습니다. 새 비밀번호를 설정해주세요.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {needsProfile && (
              <>
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
                  />
                  <Input
                    id="address2"
                    type="text"
                    placeholder="상세 주소를 입력하세요"
                    value={formData.address2}
                    onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                    disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
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
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  알림을 받을 이메일 주소를 입력하세요.
                </p>
              </>
            )}

            {/* 비밀번호 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">
                  {needsProfile ? '비밀번호 *' : '새 비밀번호'}
                </Label>
                <Input
                  id="new_password"
                  type="password"
                  placeholder="6자 이상"
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                  required
                  disabled={saving}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">
                  {needsProfile ? '비밀번호 확인 *' : '새 비밀번호 확인'}
                </Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="비밀번호 확인"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  required
                  disabled={saving}
                  minLength={6}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {needsProfile ? '설정 완료' : '비밀번호 변경'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

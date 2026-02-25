'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileSpreadsheet, Loader2, CheckCircle, Search, RefreshCw, ShieldCheck, AlertTriangle, XCircle, Info } from 'lucide-react';
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

// 국세청 사업자 인증 관련 타입
interface NtsVerificationData {
  b_no: string;
  b_stt: string;
  b_stt_cd: string;
  tax_type: string;
}

type BizVerificationStatus = 'idle' | 'loading' | 'success' | 'fail' | 'error';

interface BizVerification {
  status: BizVerificationStatus;
  data: NtsVerificationData | null;
  verifiedAt: string | null;
  errorMessage: string | null;
}

const INITIAL_BIZ_VERIFICATION: BizVerification = {
  status: 'idle',
  data: null,
  verifiedAt: null,
  errorMessage: null,
};

// 사업자 상태 코드별 설정
const BIZ_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof CheckCircle }> = {
  '01': { label: '계속사업자', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200', icon: ShieldCheck },
  '02': { label: '휴업자', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', icon: AlertTriangle },
  '03': { label: '폐업자', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', icon: XCircle },
};

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    business_number: '',
    company_name: '',
    ceo_name: '',
    zipcode: '',
    address1: '',
    address2: '',
    phone1: '',
    phone2: '',
    email: '',
    email2: '',
    password: '',
    password_confirm: '',
  });
  const [bizVerification, setBizVerification] = useState<BizVerification>(INITIAL_BIZ_VERIFICATION);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // 사업자번호 인증 API 호출
  const verifyBusinessNumber = useCallback(async (bizNumber: string) => {
    // 진행 중인 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setBizVerification({
      status: 'loading',
      data: null,
      verifiedAt: null,
      errorMessage: null,
    });

    try {
      const response = await fetch('/api/verify-biz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ b_no: bizNumber }),
        signal: controller.signal,
      });

      const result = await response.json();

      if (controller.signal.aborted) return;

      if (!result.success) {
        setBizVerification({
          status: result.code === 'NOT_REGISTERED' ? 'fail' : 'error',
          data: null,
          verifiedAt: null,
          errorMessage: result.error,
        });
        return;
      }

      const isActive = result.data.b_stt_cd === '01';
      setBizVerification({
        status: isActive ? 'success' : 'fail',
        data: result.data,
        verifiedAt: result.verified_at,
        errorMessage: null,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;

      console.error('[register] 사업자번호 인증 실패:', err);
      setBizVerification({
        status: 'error',
        data: null,
        verifiedAt: null,
        errorMessage: '조회에 실패했습니다. 다시 시도해주세요.',
      });
    }
  }, []);

  // 사업자번호 변경 감시: 10자리 도달 시 자동 검증
  useEffect(() => {
    const digits = formData.business_number.replace(/\D/g, '');

    if (digits.length === 10) {
      verifyBusinessNumber(digits);
    } else {
      // 10자리 미만이면 인증 결과 초기화
      if (bizVerification.status !== 'idle') {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setBizVerification(INITIAL_BIZ_VERIFICATION);
      }
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.business_number, verifyBusinessNumber]);

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

  // 다음 주소 검색 (도로명 주소 우선)
  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum) {
      new window.daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          // 도로명 주소 우선 사용
          const roadAddr = data.roadAddress || data.address;
          setFormData({
            ...formData,
            zipcode: data.zonecode,
            address1: roadAddr,
            address2: ''
          });
        },
      }).open();
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleRetryVerification = () => {
    const digits = formData.business_number.replace(/\D/g, '');
    if (digits.length === 10) {
      verifyBusinessNumber(digits);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (bizVerification.status !== 'success') {
      setError('사업자등록번호 국세청 인증이 필요합니다.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.password_confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8 || !/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError('비밀번호는 영문+숫자 조합 8자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_number: formData.business_number,
          company_name: formData.company_name,
          ceo_name: formData.ceo_name,
          zipcode: formData.zipcode,
          address1: formData.address1,
          address2: formData.address2 || undefined,
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

  // 가입 버튼 비활성 조건
  const isSubmitDisabled = loading || bizVerification.status !== 'success';

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

              {/* 국세청 인증 결과 UI */}
              <BizVerificationCard
                verification={bizVerification}
                digitCount={formData.business_number.replace(/\D/g, '').length}
                onRetry={handleRetryVerification}
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
              <Label htmlFor="address1">주소 *</Label>
              <div className="flex gap-2">
                <Input
                  id="zipcode"
                  type="text"
                  placeholder="우편번호"
                  value={formData.zipcode}
                  readOnly
                  required
                  disabled={loading}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddressSearch}
                  disabled={loading}
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
                disabled={loading}
              />
              <Input
                id="address2"
                type="text"
                placeholder="상세 주소를 입력하세요"
                value={formData.address2}
                onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
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
                  placeholder="영문+숫자 조합 8자 이상"
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
            <Button
              type="submit"
              className={`w-full transition-shadow duration-300 ${
                bizVerification.status === 'success'
                  ? 'shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                  : ''
              }`}
              disabled={isSubmitDisabled}
            >
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

// 사업자번호 국세청 인증 결과 카드 컴포넌트
function BizVerificationCard({
  verification,
  digitCount,
  onRetry,
}: {
  verification: BizVerification;
  digitCount: number;
  onRetry: () => void;
}) {
  const { status, data, verifiedAt, errorMessage } = verification;

  // idle 상태: 입력 진행도에 따라 안내 메시지 표시
  if (status === 'idle') {
    if (digitCount === 0) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
          <Info className="h-4 w-4 shrink-0" />
          <span>사업자등록번호 10자리를 입력하면 국세청에서 자동 인증합니다</span>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          <span>{digitCount}/10자리 입력 — 입력이 완료되면 자동으로 국세청 인증이 시작됩니다</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-400 transition-all duration-300"
            style={{ width: `${digitCount * 10}%` }}
          />
        </div>
      </div>
    );
  }

  // 조회 중
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>국세청 공식 데이터 확인 중...</span>
      </div>
    );
  }

  // API 에러 (타임아웃, 네트워크 오류 등)
  if (status === 'error') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <Info className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          다시 시도
        </Button>
      </div>
    );
  }

  // 미등록 사업자 (data가 없는 fail)
  if (status === 'fail' && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
        <div className="flex items-center gap-2 text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage || '국세청에 등록되지 않은 사업자등록번호입니다.'}</span>
        </div>
      </div>
    );
  }

  // 등록된 사업자 (계속/휴업/폐업)
  if (data) {
    const config = BIZ_STATUS_CONFIG[data.b_stt_cd];
    if (!config) {
      // 알 수 없는 상태코드 → 미등록/비정상으로 표시
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{data.b_stt || '확인할 수 없는 사업자 상태입니다.'}</span>
          </div>
        </div>
      );
    }

    const StatusIcon = config.icon;
    const isActive = data.b_stt_cd === '01';
    const statusMessage = isActive
      ? null
      : data.b_stt_cd === '02'
        ? '휴업 상태의 사업자는 가입할 수 없습니다.'
        : '폐업 상태의 사업자는 가입할 수 없습니다.';

    return (
      <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3 text-sm space-y-2`}>
        <div className={`flex items-center gap-2 ${config.color} font-medium`}>
          <StatusIcon className="h-4 w-4 shrink-0" />
          <span>{data.b_stt || config.label}</span>
          {data.tax_type && (
            <span className="font-normal opacity-75">· {data.tax_type}</span>
          )}
        </div>

        {statusMessage && (
          <p className={`${config.color} opacity-90`}>{statusMessage}</p>
        )}

        {/* 공식 인증 마킹 */}
        <div className={`pt-2 border-t ${config.borderColor} text-xs space-y-0.5 opacity-75`}>
          <p>
            {isActive ? '\u2705' : '\u274C'} 국세청(NTS) 인증 결과: {data.b_stt || config.label}
          </p>
          {verifiedAt && (
            <p>출처: 국세청 공공데이터 포털 실시간 정보 (조회 일시: {verifiedAt})</p>
          )}
          <p>보안 안내: 입력하신 정보는 본인 확인 즉시 파기되며 서버에 저장되지 않습니다.</p>
        </div>
      </div>
    );
  }

  return null;
}

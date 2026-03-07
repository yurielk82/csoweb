'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_ROUTES } from '@/constants/api';
import { formatPhoneNumber, formatBusinessNumber } from '@/lib/format';
import { useDaumPostcode } from '@/hooks/useDaumPostcode';

// ── 타입 ──

export interface NtsVerificationData {
  b_no: string;
  b_stt: string;
  b_stt_cd: string;
  tax_type: string;
}

export type BizVerificationStatus = 'idle' | 'loading' | 'success' | 'fail' | 'error';

export interface BizVerification {
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

const MIN_PASSWORD_LENGTH = 8;
const BIZ_NUMBER_DIGITS = 10;

// ── 훅 ──

export function useRegister() {
  const { openSearch } = useDaumPostcode();
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

  // 사업자번호 인증 API 호출
  const verifyBusinessNumber = useCallback(async (bizNumber: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setBizVerification({ status: 'loading', data: null, verifiedAt: null, errorMessage: null });

    try {
      const response = await fetch(API_ROUTES.VERIFY_BIZ, {
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
          data: null, verifiedAt: null, errorMessage: result.error,
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
        status: 'error', data: null, verifiedAt: null,
        errorMessage: '조회에 실패했습니다. 다시 시도해주세요.',
      });
    }
  }, []);

  // 사업자번호 변경 감시: 10자리 도달 시 자동 검증
  useEffect(() => {
    const digits = formData.business_number.replace(/\D/g, '');

    if (digits.length === BIZ_NUMBER_DIGITS) {
      verifyBusinessNumber(digits);
    } else if (bizVerification.status !== 'idle') {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setBizVerification(INITIAL_BIZ_VERIFICATION);
    }

    return () => { abortControllerRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.business_number, verifyBusinessNumber]);

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, business_number: formatBusinessNumber(e.target.value) });
  };

  const handlePhoneChange = (field: 'phone1' | 'phone2', value: string) => {
    setFormData({ ...formData, [field]: formatPhoneNumber(value) });
  };

  const handleEmailChange = (field: 'email' | 'email2', value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddressSearch = () => {
    openSearch((result) => {
      setFormData({ ...formData, zipcode: result.zonecode, address1: result.address, address2: '' });
    });
  };

  const handleRetryVerification = () => {
    const digits = formData.business_number.replace(/\D/g, '');
    if (digits.length === BIZ_NUMBER_DIGITS) verifyBusinessNumber(digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

    if (
      formData.password.length < MIN_PASSWORD_LENGTH ||
      !/[a-zA-Z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password)
    ) {
      setError('비밀번호는 영문+숫자 조합 8자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_ROUTES.AUTH.REGISTER, {
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
    } catch (err) {
      console.error('회원가입 처리 중 오류:', err);
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || bizVerification.status !== 'success';
  const bizDigitCount = formData.business_number.replace(/\D/g, '').length;

  return {
    loading, error, success, formData, setFormData,
    bizVerification, bizDigitCount, isSubmitDisabled,
    handleBusinessNumberChange, handlePhoneChange, handleEmailChange,
    handleAddressSearch, handleRetryVerification, handleSubmit,
  };
}

'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_ROUTES } from '@/constants/api';
import { TOAST_DURATION_MS, MIN_PASSWORD_LENGTH } from '@/constants/defaults';
import { getPasswordStrength } from '@/lib/format';

// ── 타입 ──

export interface TokenInfo {
  company_name: string;
  business_number: string;
  email: string;
  expires_at: string;
}

// ── 헬퍼 ──

async function verifyToken(
  token: string,
  setTokenInfo: Dispatch<SetStateAction<TokenInfo | null>>,
  setTokenError: Dispatch<SetStateAction<string>>,
  setLoading: Dispatch<SetStateAction<boolean>>,
) {
  try {
    const response = await fetch(`${API_ROUTES.AUTH.RESET_PASSWORD_VERIFY}?token=${token}`);
    const result = await response.json();

    if (!result.success) {
      setTokenError(result.error || '유효하지 않은 토큰입니다.');
      return;
    }
    setTokenInfo(result.data);
  } catch (err) {
    console.error('비밀번호 재설정 토큰 검증 중 오류:', err);
    setTokenError('토큰 검증 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
}

// ── 훅 ──

export function useResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({ new_password: '', confirm_password: '' });

  const passwordStrength = getPasswordStrength(formData.new_password);

  useEffect(() => {
    if (!token) {
      setTokenError('유효하지 않은 접근입니다. 비밀번호 찾기를 다시 시도해주세요.');
      setLoading(false);
      return;
    }
    verifyToken(token, setTokenInfo, setTokenError, setLoading);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (
      formData.new_password.length < MIN_PASSWORD_LENGTH ||
      !/[a-zA-Z]/.test(formData.new_password) ||
      !/[0-9]/.test(formData.new_password)
    ) {
      setError('비밀번호는 영문+숫자 조합 6자 이상이어야 합니다.');
      return;
    }
    if (formData.new_password !== formData.confirm_password) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(API_ROUTES.AUTH.RESET_PASSWORD_VERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...formData }),
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || '비밀번호 변경에 실패했습니다.');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/login'), TOAST_DURATION_MS);
    } catch (err) {
      console.error('비밀번호 재설정 처리 중 오류:', err);
      setError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleShowPassword = () => setShowPassword(prev => !prev);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(prev => !prev);

  return {
    loading, submitting, error, tokenError, success,
    tokenInfo, formData, setFormData, passwordStrength,
    showPassword, showConfirmPassword,
    toggleShowPassword, toggleShowConfirmPassword, handleSubmit,
  };
}

'use client';

import { useState } from 'react';
import { API_ROUTES } from '@/constants/api';
import { formatBusinessNumber } from '@/lib/format';

// ── 훅 ──

export function useForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ business_number: '', email: '' });

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, business_number: formatBusinessNumber(e.target.value) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_ROUTES.AUTH.FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_number: formData.business_number,
          email: formData.email,
        }),
      });
      const result = await response.json();

      if (!result.success) {
        setError(result.error || '비밀번호 재설정 요청에 실패했습니다.');
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('비밀번호 찾기 요청 중 오류:', err);
      setError('비밀번호 재설정 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setSuccess(false);
    setFormData({ business_number: '', email: '' });
  };

  return {
    loading, error, success, formData, setFormData,
    handleBusinessNumberChange, handleSubmit, handleRetry,
  };
}

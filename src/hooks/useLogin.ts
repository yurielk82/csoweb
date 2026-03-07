'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { API_ROUTES } from '@/constants/api';
import { formatBusinessNumber } from '@/lib/format';

// ── 타입 ──

export interface CompanyInfo {
  company_name: string;
  ceo_name: string;
  business_number: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
}

// ── 훅 ──

export function useLogin() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ business_number: '', password: '' });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  // user 상태가 반영된 후에만 페이지 이동
  useEffect(() => {
    if (pendingRedirect && user) {
      router.push(pendingRedirect);
      setPendingRedirect(null);
    }
  }, [user, pendingRedirect, router]);

  // 회사 정보 로드
  useEffect(() => {
    fetch(API_ROUTES.SETTINGS.COMPANY)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) setCompanyInfo(result.data);
      })
      .catch(console.error);
  }, []);

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, business_number: formatBusinessNumber(e.target.value) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_ROUTES.AUTH.LOGIN, {
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

      if (result.data.user) {
        setPendingRedirect(result.data.redirect);
        setUser(result.data.user);
      }
      // loading은 이동 완료 전까지 유지 (UX)
    } catch (err) {
      console.error('로그인 처리 중 오류:', err);
      setError('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return {
    loading, error, formData, setFormData, companyInfo,
    handleBusinessNumberChange, handleSubmit,
  };
}

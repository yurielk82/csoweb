'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '@/constants/api';

interface SessionData {
  business_number: string;
  company_name: string;
  email: string;
  must_change_password: boolean;
  profile_complete: boolean;
  is_admin: boolean;
}

const MIN_PASSWORD_LENGTH = 8;
const BLOCKED_SUFFIX_LENGTH = 5;

export function useChangePassword() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SessionData | null>(null);

  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    async function init() {
      try {
        const sessionRes = await fetch(API_ROUTES.AUTH.SESSION);
        const sessionResult = await sessionRes.json();

        if (!sessionResult.success || !sessionResult.data) {
          router.push('/login');
          return;
        }

        if (!sessionResult.data.must_change_password) {
          if (!sessionResult.data.profile_complete) {
            router.push('/complete-profile');
          } else {
            router.push(sessionResult.data.is_admin ? '/admin' : '/home');
          }
          return;
        }

        setSession(sessionResult.data);
      } catch (err) {
        console.error('비밀번호 변경 세션 확인 중 오류:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (
      formData.new_password.length < MIN_PASSWORD_LENGTH ||
      !/[a-zA-Z]/.test(formData.new_password) ||
      !/[0-9]/.test(formData.new_password)
    ) {
      setError('비밀번호는 영문+숫자 조합 8자 이상이어야 합니다.');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    const normalizedBN = session?.business_number.replace(/-/g, '') || '';
    const blockedPasswords = [
      `u${normalizedBN}`,
      normalizedBN,
      normalizedBN.slice(-BLOCKED_SUFFIX_LENGTH),
    ];
    if (blockedPasswords.includes(formData.new_password)) {
      setError('초기 비밀번호와 다른 비밀번호를 입력해주세요.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(API_ROUTES.AUTH.CHANGE_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: formData.new_password }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '비밀번호 변경에 실패했습니다.');
        return;
      }

      router.push(result.data?.redirect || '/home');
    } catch (err) {
      console.error('비밀번호 변경 처리 중 오류:', err);
      setError('처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return {
    loading, saving, error, session, formData, setFormData, handleSubmit,
  };
}

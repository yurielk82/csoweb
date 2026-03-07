'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES } from '@/constants/api';
import { formatPhoneNumber } from '@/lib/format';
import { useDaumPostcode } from '@/hooks/useDaumPostcode';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SessionData {
  business_number: string;
  company_name: string;
  email: string;
  must_change_password: boolean;
  profile_complete: boolean;
  is_admin: boolean;
}

interface ProfileFormData {
  company_name: string;
  ceo_name: string;
  zipcode: string;
  address1: string;
  address2: string;
  phone1: string;
  phone2: string;
  email: string;
  email2: string;
}

// ── Validation ──

function validateProfileForm(formData: ProfileFormData): string | null {
  if (!formData.company_name.trim()) return '업체명을 입력해주세요.';
  if (!formData.ceo_name.trim()) return '대표자명을 입력해주세요.';
  if (!formData.zipcode || !formData.address1) return '주소를 검색하여 입력해주세요.';
  if (!formData.phone1.trim()) return '연락처를 입력해주세요.';
  if (!formData.email.trim()) return '이메일을 입력해주세요.';
  if (!EMAIL_REGEX.test(formData.email)) return '올바른 이메일 형식을 입력해주세요.';
  if (formData.email.endsWith('@temp.local')) return '실제 사용하는 이메일을 입력해주세요.';
  if (formData.email2 && !EMAIL_REGEX.test(formData.email2)) return '이메일2의 형식이 올바르지 않습니다.';
  return null;
}

function buildProfilePayload(formData: ProfileFormData) {
  return {
    company_name: formData.company_name.trim(),
    ceo_name: formData.ceo_name.trim(),
    zipcode: formData.zipcode,
    address1: formData.address1,
    address2: formData.address2 || undefined,
    phone1: formData.phone1,
    phone2: formData.phone2 || undefined,
    email: formData.email.trim(),
    email2: formData.email2 || undefined,
  };
}

// ── Init helper ──

function mapProfileToForm(p: Record<string, string | null>): ProfileFormData {
  return {
    company_name: p.company_name || '',
    ceo_name: p.ceo_name || '',
    zipcode: p.zipcode || '',
    address1: p.address1 || '',
    address2: p.address2 || '',
    phone1: p.phone1 || '',
    phone2: p.phone2 || '',
    email: p.email?.endsWith('@temp.local') ? '' : (p.email || ''),
    email2: p.email2 || '',
  };
}

// ── Hook ──

export function useCompleteProfile() {
  const router = useRouter();
  const { openSearch } = useDaumPostcode();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SessionData | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    company_name: '', ceo_name: '', zipcode: '', address1: '',
    address2: '', phone1: '', phone2: '', email: '', email2: '',
  });

  useEffect(() => {
    async function init() {
      try {
        const sessionRes = await fetch(API_ROUTES.AUTH.SESSION);
        const sessionResult = await sessionRes.json();

        if (!sessionResult.success || !sessionResult.data) { router.push('/login'); return; }
        if (sessionResult.data.must_change_password) { router.push('/change-password'); return; }
        if (sessionResult.data.profile_complete) {
          router.push(sessionResult.data.is_admin ? '/admin' : '/home');
          return;
        }

        setSession(sessionResult.data);

        const profileRes = await fetch(API_ROUTES.USERS.PROFILE);
        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data) {
          setFormData(mapProfileToForm(profileResult.data));
        }
      } catch (err) {
        console.error('프로필 초기화 중 오류:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateProfileForm(formData);
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    try {
      const response = await fetch(API_ROUTES.AUTH.COMPLETE_PROFILE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildProfilePayload(formData)),
      });
      const result = await response.json();
      if (!result.success) { setError(result.error || '프로필 저장에 실패했습니다.'); return; }
      router.push(result.data?.redirect || '/home');
    } catch (err) {
      console.error('프로필 저장 처리 중 오류:', err);
      setError('처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return {
    loading, saving, error, session,
    formData, setFormData,
    handlePhoneChange, handleEmailChange, handleAddressSearch, handleSubmit,
  };
}

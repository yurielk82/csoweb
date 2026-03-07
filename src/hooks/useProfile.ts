'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDaumPostcode } from '@/hooks/useDaumPostcode';
import { API_ROUTES } from '@/constants/api';

// ── 타입 ──

export interface UserProfile {
  business_number: string;
  company_name: string;
  ceo_name: string;
  zipcode: string;
  address1: string;
  address2?: string;
  phone1: string;
  phone2?: string;
  email: string;
  email2?: string;
  is_admin: boolean;
  created_at: string;
}

export interface ProfileFormData {
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

const FORM_KEYS: (keyof ProfileFormData)[] = [
  'company_name', 'ceo_name', 'zipcode', 'address1', 'address2',
  'phone1', 'phone2', 'email', 'email2',
];

const INITIAL_FORM = Object.fromEntries(
  FORM_KEYS.map(k => [k, '']),
) as unknown as ProfileFormData;

function toFormData(d: UserProfile): ProfileFormData {
  return Object.fromEntries(
    FORM_KEYS.map(k => [k, d[k] ?? '']),
  ) as unknown as ProfileFormData;
}

function getChanges(formData: ProfileFormData, profile: UserProfile): Record<string, string> {
  const changes: Record<string, string> = {};
  for (const key of FORM_KEYS) {
    if (formData[key] !== (profile[key] ?? '')) changes[key] = formData[key];
  }
  return changes;
}

// ── 훅 ──

export function useProfile() {
  const { toast } = useToast();
  const { openSearch } = useDaumPostcode();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(INITIAL_FORM);

  useEffect(() => {
    fetch(API_ROUTES.USERS.PROFILE)
      .then(res => res.json())
      .then(result => {
        if (!result.success || !result.data) return;
        const d = result.data as UserProfile;
        setProfile(d);
        setFormData(toFormData(d));
      })
      .finally(() => setLoading(false));
  }, []);

  const updateField = useCallback(
    <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
      setFormData(prev => ({ ...prev, [key]: value }));
    }, [],
  );

  const openAddressSearch = useCallback(() => {
    openSearch(result => {
      setFormData(prev => ({
        ...prev,
        zipcode: result.zonecode,
        address1: result.address,
        address2: '',
      }));
    });
  }, [openSearch]);

  const hasProfileChanges = useCallback(() => {
    if (!profile) return false;
    return FORM_KEYS.some(key => formData[key] !== (profile[key] ?? ''));
  }, [profile, formData]);

  const handleSave = useCallback(async () => {
    if (!profile) return;
    const changes = getChanges(formData, profile);
    if (Object.keys(changes).length === 0) return;

    setSaving(true);
    try {
      const res = await fetch(API_ROUTES.USERS.PROFILE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const result = await res.json();

      if (result.success) {
        setProfile(prev => prev ? { ...prev, ...changes } : null);
        toast({ title: '정보 변경 완료', description: '프로필 정보가 성공적으로 변경되었습니다.' });
      } else {
        toast({ variant: 'destructive', title: '변경 실패', description: result.error });
      }
    } catch (error) {
      console.error('프로필 저장 중 오류:', error);
      toast({ variant: 'destructive', title: '오류', description: '정보 변경 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  }, [profile, formData, toast]);

  return {
    loading, saving, profile, formData,
    updateField, openAddressSearch, hasProfileChanges, handleSave,
  };
}

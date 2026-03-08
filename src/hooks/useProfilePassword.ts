'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';
import { MIN_PASSWORD_LENGTH, TEST_MIN_PASSWORD_LENGTH } from '@/constants/defaults';
import { useAuth } from '@/contexts/AuthContext';

export interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const INITIAL_PASSWORD: PasswordFormData = {
  currentPassword: '', newPassword: '', confirmPassword: '',
};

export function useProfilePassword() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isTest = user?.is_test ?? false;
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>(INITIAL_PASSWORD);
  const [passwordError, setPasswordError] = useState('');

  const handleUpdatePassword = useCallback(async () => {
    setPasswordError('');
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (isTest) {
      if (newPassword.length < TEST_MIN_PASSWORD_LENGTH) {
        setPasswordError('비밀번호는 4자 이상이어야 합니다.');
        return;
      }
    } else if (
      newPassword.length < MIN_PASSWORD_LENGTH ||
      !/[a-zA-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      setPasswordError('비밀번호는 영문+숫자 조합 6자 이상이어야 합니다.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(API_ROUTES.USERS.PROFILE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const result = await res.json();

      if (result.success) {
        setPasswordForm(INITIAL_PASSWORD);
        toast({ title: '비밀번호 변경 완료', description: '비밀번호가 성공적으로 변경되었습니다.' });
      } else {
        setPasswordError(result.error);
      }
    } catch (error) {
      console.error('비밀번호 변경 중 오류:', error);
      setPasswordError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [passwordForm, toast, isTest]);

  return {
    saving, passwordForm, passwordError,
    setPasswordForm, handleUpdatePassword,
  };
}

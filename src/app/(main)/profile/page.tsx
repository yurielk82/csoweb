'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Mail, Save, Loader2, CheckCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  business_number: string;
  company_name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // 업체명 변경
  const [newCompanyName, setNewCompanyName] = useState('');
  
  // 이메일 변경
  const [newEmail, setNewEmail] = useState('');
  
  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setProfile(result.data);
          setNewCompanyName(result.data.company_name);
          setNewEmail(result.data.email);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateCompanyName = async () => {
    if (!newCompanyName || newCompanyName === profile?.company_name) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: newCompanyName }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setProfile(prev => prev ? { ...prev, company_name: newCompanyName } : null);
        toast({
          title: '업체명 변경 완료',
          description: '업체명이 성공적으로 변경되었습니다.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: '변경 실패',
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '업체명 변경 중 오류가 발생했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === profile?.email) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setProfile(prev => prev ? { ...prev, email: newEmail } : null);
        toast({
          title: '이메일 변경 완료',
          description: '이메일이 성공적으로 변경되었습니다.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: '변경 실패',
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '이메일 변경 중 오류가 발생했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast({
          title: '비밀번호 변경 완료',
          description: '비밀번호가 성공적으로 변경되었습니다.',
        });
      } else {
        setPasswordError(result.error);
      }
    } catch {
      setPasswordError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" />
          내 정보
        </h1>
        <p className="text-muted-foreground">계정 정보를 확인하고 수정하세요.</p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
          <CardDescription>회원 가입 시 등록된 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">사업자번호</Label>
              <p className="font-medium">{profile?.business_number}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">회원 유형</Label>
              <p className="font-medium">{profile?.is_admin ? '관리자' : '일반 업체'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">가입일</Label>
              <p className="font-medium">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ko-KR') : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Name Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            업체명 변경
          </CardTitle>
          <CardDescription>표시되는 업체명을 변경합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">업체명</Label>
            <Input
              id="companyName"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="업체명 입력"
            />
          </div>
          <Button 
            onClick={handleUpdateCompanyName} 
            disabled={saving || newCompanyName === profile?.company_name || !newCompanyName}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            업체명 변경
          </Button>
        </CardContent>
      </Card>

      {/* Email Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            이메일 변경
          </CardTitle>
          <CardDescription>알림을 받을 이메일 주소를 변경합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <Button 
            onClick={handleUpdateEmail} 
            disabled={saving || newEmail === profile?.email}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            이메일 변경
          </Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            비밀번호 변경
          </CardTitle>
          <CardDescription>로그인에 사용하는 비밀번호를 변경합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && (
            <Alert variant="destructive">
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="currentPassword">현재 비밀번호</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호 입력"
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호 입력 (6자 이상)"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 다시 입력"
            />
          </div>
          
          <Button 
            onClick={handleUpdatePassword} 
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            비밀번호 변경
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

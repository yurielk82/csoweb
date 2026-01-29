'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Mail, Save, Loader2, CheckCircle, Building2, Phone, MapPin, Search } from 'lucide-react';
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
  ceo_name: string;
  address: string;
  phone1: string;
  phone2?: string;
  email: string;
  email2?: string;
  is_admin: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // 기본 정보 변경
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCeoName, setNewCeoName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone1, setNewPhone1] = useState('');
  const [newPhone2, setNewPhone2] = useState('');
  
  // 이메일 변경
  const [newEmail, setNewEmail] = useState('');
  const [newEmail2, setNewEmail2] = useState('');
  
  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetch('/api/users/profile')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setProfile(result.data);
          setNewCompanyName(result.data.company_name || '');
          setNewCeoName(result.data.ceo_name || '');
          setNewAddress(result.data.address || '');
          setNewPhone1(result.data.phone1 || '');
          setNewPhone2(result.data.phone2 || '');
          setNewEmail(result.data.email || '');
          setNewEmail2(result.data.email2 || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // 다음 주소 검색 함수
  const openAddressSearch = () => {
    if (typeof window !== 'undefined' && (window as unknown as { daum?: { Postcode: new (config: { oncomplete: (data: { address: string; roadAddress: string; jibunAddress: string }) => void }) => { open: () => void } } }).daum) {
      new (window as unknown as { daum: { Postcode: new (config: { oncomplete: (data: { address: string; roadAddress: string; jibunAddress: string }) => void }) => { open: () => void } } }).daum.Postcode({
        oncomplete: (data: { address: string; roadAddress: string; jibunAddress: string }) => {
          setNewAddress(data.roadAddress || data.jibunAddress || data.address);
        }
      }).open();
    } else {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '주소 검색 서비스를 불러올 수 없습니다.',
      });
    }
  };

  const handleUpdateCompanyInfo = async () => {
    if (newCompanyName === profile?.company_name && newCeoName === profile?.ceo_name) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          company_name: newCompanyName,
          ceo_name: newCeoName,
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setProfile(prev => prev ? { ...prev, company_name: newCompanyName, ceo_name: newCeoName } : null);
        toast({
          title: '업체 정보 변경 완료',
          description: '업체 정보가 성공적으로 변경되었습니다.',
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
        description: '업체 정보 변경 중 오류가 발생했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (newAddress === profile?.address) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: newAddress }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setProfile(prev => prev ? { ...prev, address: newAddress } : null);
        toast({
          title: '주소 변경 완료',
          description: '주소가 성공적으로 변경되었습니다.',
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
        description: '주소 변경 중 오류가 발생했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePhone = async () => {
    if (newPhone1 === profile?.phone1 && newPhone2 === (profile?.phone2 || '')) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone1: newPhone1,
          phone2: newPhone2,
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setProfile(prev => prev ? { ...prev, phone1: newPhone1, phone2: newPhone2 } : null);
        toast({
          title: '연락처 변경 완료',
          description: '연락처가 성공적으로 변경되었습니다.',
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
        description: '연락처 변경 중 오류가 발생했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (newEmail === profile?.email && newEmail2 === (profile?.email2 || '')) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: newEmail,
          email2: newEmail2,
        }),
      });
      
      const result = await res.json();
      
      if (result.success) {
        setProfile(prev => prev ? { ...prev, email: newEmail, email2: newEmail2 } : null);
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
              <Label className="text-muted-foreground">업체명</Label>
              <p className="font-medium">{profile?.company_name || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">대표자명</Label>
              <p className="font-medium">{profile?.ceo_name || '-'}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">주소</Label>
              <p className="font-medium">{profile?.address || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">연락처1</Label>
              <p className="font-medium">{profile?.phone1 || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">연락처2</Label>
              <p className="font-medium">{profile?.phone2 || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">이메일</Label>
              <p className="font-medium">{profile?.email || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">이메일2</Label>
              <p className="font-medium">{profile?.email2 || '-'}</p>
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

      {/* Company & CEO Info Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            업체 정보 변경
          </CardTitle>
          <CardDescription>업체명과 대표자명을 변경합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">업체명</Label>
              <Input
                id="companyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="업체명 입력"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ceoName">대표자명</Label>
              <Input
                id="ceoName"
                value={newCeoName}
                onChange={(e) => setNewCeoName(e.target.value)}
                placeholder="대표자명 입력"
              />
            </div>
          </div>
          <Button 
            onClick={handleUpdateCompanyInfo} 
            disabled={saving || (newCompanyName === profile?.company_name && newCeoName === profile?.ceo_name)}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            업체 정보 변경
          </Button>
        </CardContent>
      </Card>

      {/* Address Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            주소 변경
          </CardTitle>
          <CardDescription>사업장 주소를 변경합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="주소 입력"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={openAddressSearch}
              >
                <Search className="h-4 w-4 mr-2" />
                주소 검색
              </Button>
            </div>
          </div>
          <Button 
            onClick={handleUpdateAddress} 
            disabled={saving || newAddress === profile?.address}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            주소 변경
          </Button>
        </CardContent>
      </Card>

      {/* Phone Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            연락처 변경
          </CardTitle>
          <CardDescription>연락처를 변경합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone1">연락처1 *</Label>
              <Input
                id="phone1"
                value={newPhone1}
                onChange={(e) => setNewPhone1(e.target.value)}
                placeholder="연락처 입력"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone2">연락처2 (선택)</Label>
              <Input
                id="phone2"
                value={newPhone2}
                onChange={(e) => setNewPhone2(e.target.value)}
                placeholder="연락처 입력"
              />
            </div>
          </div>
          <Button 
            onClick={handleUpdatePhone} 
            disabled={saving || (newPhone1 === profile?.phone1 && newPhone2 === (profile?.phone2 || ''))}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            연락처 변경
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email2">이메일2 (선택)</Label>
              <Input
                id="email2"
                type="email"
                value={newEmail2}
                onChange={(e) => setNewEmail2(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>
          <Button 
            onClick={handleUpdateEmail} 
            disabled={saving || (newEmail === profile?.email && newEmail2 === (profile?.email2 || ''))}
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

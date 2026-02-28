'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Save, Loader2, CheckCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface DaumPostcodeData {
  address: string;
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
}

interface UserProfile {
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

export default function ProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // 기본 정보 변경
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCeoName, setNewCeoName] = useState('');
  const [newZipcode, setNewZipcode] = useState('');
  const [newAddress1, setNewAddress1] = useState('');
  const [newAddress2, setNewAddress2] = useState('');
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
          setNewZipcode(result.data.zipcode || '');
          setNewAddress1(result.data.address1 || '');
          setNewAddress2(result.data.address2 || '');
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
    const win = window as Window & { daum?: { Postcode: new (options: { oncomplete: (data: DaumPostcodeData) => void }) => { open: () => void } } };
    if (typeof window !== 'undefined' && win.daum) {
      new win.daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          const roadAddr = data.roadAddress || data.address;
          setNewZipcode(data.zonecode);
          setNewAddress1(roadAddr);
          setNewAddress2('');
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

  const hasProfileChanges = () => {
    if (!profile) return false;
    return (
      newCompanyName !== (profile.company_name || '') ||
      newCeoName !== (profile.ceo_name || '') ||
      newZipcode !== (profile.zipcode || '') ||
      newAddress1 !== (profile.address1 || '') ||
      newAddress2 !== (profile.address2 || '') ||
      newPhone1 !== (profile.phone1 || '') ||
      newPhone2 !== (profile.phone2 || '') ||
      newEmail !== (profile.email || '') ||
      newEmail2 !== (profile.email2 || '')
    );
  };

  const handleSave = async () => {
    if (!profile) return;

    const changes: Record<string, string> = {};
    if (newCompanyName !== (profile.company_name || '')) changes.company_name = newCompanyName;
    if (newCeoName !== (profile.ceo_name || '')) changes.ceo_name = newCeoName;
    if (newZipcode !== (profile.zipcode || '')) changes.zipcode = newZipcode;
    if (newAddress1 !== (profile.address1 || '')) changes.address1 = newAddress1;
    if (newAddress2 !== (profile.address2 || '')) changes.address2 = newAddress2;
    if (newPhone1 !== (profile.phone1 || '')) changes.phone1 = newPhone1;
    if (newPhone2 !== (profile.phone2 || '')) changes.phone2 = newPhone2;
    if (newEmail !== (profile.email || '')) changes.email = newEmail;
    if (newEmail2 !== (profile.email2 || '')) changes.email2 = newEmail2;

    if (Object.keys(changes).length === 0) return;

    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      const result = await res.json();

      if (result.success) {
        setProfile(prev => prev ? { ...prev, ...changes } : null);
        toast({
          title: '정보 변경 완료',
          description: '프로필 정보가 성공적으로 변경되었습니다.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: '변경 실패',
          description: result.error,
        });
      }
    } catch (error) {
      console.error('프로필 처리 중 오류:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: '정보 변경 중 오류가 발생했습니다.',
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
    } catch (error) {
      console.error('프로필 처리 중 오류:', error);
      setPasswordError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
          <span>사업자번호: <span className="font-medium text-foreground">{profile?.business_number}</span></span>
          <span className="text-muted-foreground/40">|</span>
          <span>{profile?.is_admin ? '관리자' : '일반 업체'}</span>
          <span className="text-muted-foreground/40">|</span>
          <span>가입일: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ko-KR') : '-'}</span>
        </div>
      </div>

      {/* Profile Info — 업체·주소·연락처·이메일 통합 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">업체명</Label>
              <Input
                id="companyName"
                autoComplete="organization"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="업체명 입력"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ceoName">대표자명</Label>
              <Input
                id="ceoName"
                autoComplete="name"
                value={newCeoName}
                onChange={(e) => setNewCeoName(e.target.value)}
                placeholder="대표자명 입력"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipcode">주소</Label>
            <div className="flex gap-2">
              <Input
                id="zipcode"
                autoComplete="postal-code"
                value={newZipcode}
                readOnly
                placeholder="우편번호"
                className="w-28"
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
            <Input
              id="address1"
              autoComplete="street-address"
              value={newAddress1}
              readOnly
              placeholder="도로명 주소"
            />
            <Input
              id="address2"
              autoComplete="address-line2"
              value={newAddress2}
              onChange={(e) => setNewAddress2(e.target.value)}
              placeholder="상세 주소를 입력하세요"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone1">연락처1 *</Label>
              <Input
                id="phone1"
                type="tel"
                autoComplete="tel"
                value={newPhone1}
                onChange={(e) => setNewPhone1(e.target.value)}
                placeholder="연락처 입력"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone2">연락처2 (선택)</Label>
              <Input
                id="phone2"
                type="tel"
                autoComplete="tel"
                value={newPhone2}
                onChange={(e) => setNewPhone2(e.target.value)}
                placeholder="연락처 입력"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
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
                autoComplete="email"
                value={newEmail2}
                onChange={(e) => setNewEmail2(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasProfileChanges()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            저장
          </Button>
        </CardFooter>
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
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호 입력"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
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
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 다시 입력"
            />
          </div>
        </CardContent>
        <CardFooter>
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
        </CardFooter>
      </Card>
    </div>
  );
}

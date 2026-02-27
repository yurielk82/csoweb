'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Save, Loader2, Building2, Phone, Mail, Globe, MapPin, FileText, Plug, Server, BellRing, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/shared/loading';

interface CompanyInfo {
  company_name: string;
  ceo_name: string;
  business_number: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  copyright: string;
  additional_info: string;
  notice_content: string;
  // 이메일 발송 설정
  email_provider: 'resend' | 'smtp';
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from_name: string;
  smtp_from_email: string;
  resend_from_email: string;
  test_recipient_email: string;
  email_send_delay_ms: number;
  email_notifications: {
    registration_request: boolean;
    approval_complete: boolean;
    approval_rejected: boolean;
    settlement_uploaded: boolean;
    password_reset: boolean;
  };
}

const EMAIL_NOTIFICATION_LABELS: Record<string, { label: string; description: string }> = {
  registration_request: { label: '회원가입 신청 알림', description: '새 회원가입 신청 시 관리자에게 이메일 발송' },
  approval_complete: { label: '가입 승인 알림', description: '관리자가 가입을 승인하면 사용자에게 이메일 발송' },
  approval_rejected: { label: '가입 거부 알림', description: '관리자가 가입을 거부하면 사용자에게 이메일 발송' },
  settlement_uploaded: { label: '정산서 업로드 알림', description: '정산서 업로드 시 해당 업체에 이메일 발송' },
  password_reset: { label: '비밀번호 재설정', description: '비밀번호 재설정 요청 시 사용자에게 이메일 발송' },
};

const defaultCompanyInfo: CompanyInfo = {
  company_name: '',
  ceo_name: '',
  business_number: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  website: '',
  copyright: '',
  additional_info: '',
  notice_content: '',
  email_provider: 'resend',
  smtp_host: '',
  smtp_port: 465,
  smtp_secure: true,
  smtp_user: '',
  smtp_password: '',
  smtp_from_name: '',
  smtp_from_email: '',
  resend_from_email: '',
  test_recipient_email: '',
  email_send_delay_ms: 6000,
  email_notifications: {
    registration_request: true,
    approval_complete: true,
    approval_rejected: true,
    settlement_uploaded: true,
    password_reset: true,
  },
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState<CompanyInfo>(defaultCompanyInfo);
  const initialDataRef = useRef<CompanyInfo>(defaultCompanyInfo);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch('/api/settings/company', { cache: 'no-store' })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          const merged = { ...defaultCompanyInfo, ...result.data };
          setFormData(merged);
          initialDataRef.current = merged;
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof CompanyInfo, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 변경된 필드만 PATCH로 저장
  const patchFields = async (fields: Partial<CompanyInfo>) => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const result = await res.json();
      if (result.success) {
        initialDataRef.current = { ...initialDataRef.current, ...fields };
        setSaveStatus('saved');
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        toast({ variant: 'destructive', title: '저장 실패', description: result.error });
      }
    } catch (error) {
      console.error('자동 저장 오류:', error);
      setSaveStatus('error');
      toast({ variant: 'destructive', title: '오류', description: '저장 중 오류가 발생했습니다.' });
    }
  };

  // 텍스트/숫자 필드: blur 시 변경 감지 후 저장
  const handleBlur = (field: keyof CompanyInfo) => {
    const currentValue = formData[field];
    const initialValue = initialDataRef.current[field];
    if (currentValue !== initialValue) {
      patchFields({ [field]: currentValue } as Partial<CompanyInfo>);
    }
  };

  // 체크박스/라디오: 변경 즉시 저장
  const handleChangeAndSave = (field: keyof CompanyInfo, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    patchFields({ [field]: value } as Partial<CompanyInfo>);
  };

  // 전체 저장 (fallback)
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.success) {
        initialDataRef.current = { ...formData };
        toast({
          title: '저장 완료',
          description: '회사 정보가 저장되었습니다.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: result.error,
        });
      }
    } catch (error) {
      console.error('설정 저장 오류:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: '저장 중 오류가 발생했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectionTest = async () => {
    setTesting(true);
    try {
      // 이메일 관련 필드만 PATCH로 저장
      const emailFields: Partial<CompanyInfo> = {
        email_provider: formData.email_provider,
        test_recipient_email: formData.test_recipient_email,
      };
      if (formData.email_provider === 'smtp') {
        emailFields.smtp_host = formData.smtp_host;
        emailFields.smtp_port = formData.smtp_port;
        emailFields.smtp_secure = formData.smtp_secure;
        emailFields.smtp_user = formData.smtp_user;
        emailFields.smtp_password = formData.smtp_password;
        emailFields.smtp_from_name = formData.smtp_from_name;
        emailFields.smtp_from_email = formData.smtp_from_email;
      } else {
        emailFields.resend_from_email = formData.resend_from_email;
      }

      const saveRes = await fetch('/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailFields),
      });
      const saveResult = await saveRes.json();
      if (!saveResult.success) {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: saveResult.error || '설정 저장에 실패하여 연결 테스트를 진행할 수 없습니다.',
        });
        return;
      }
      initialDataRef.current = { ...initialDataRef.current, ...emailFields };

      // 저장된 DB 값으로 연결 테스트
      const res = await fetch('/api/settings/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: formData.email_provider,
          send_test_email: false,
        }),
      });

      const result = await res.json();

      if (result.success && result.data?.connected) {
        toast({
          title: '연결 성공',
          description: result.data.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: '연결 실패',
          description: result.error || result.data?.message || '연결에 실패했습니다.',
        });
      }
    } catch (error) {
      console.error('연결 테스트 오류:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: '연결 테스트 중 오류가 발생했습니다.',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <Loading text="설정을 불러오는 중..." />;
  }

  const delaySeconds = formData.email_send_delay_ms / 1000;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            사이트 설정
          </h1>
          <p className="text-muted-foreground">로그인 화면 푸터에 표시될 회사 정보를 설정합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              저장 중...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-600 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              저장됨
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-600">저장 실패</span>
          )}
          <Button onClick={handleSave} variant="outline" size="sm" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            전체 저장
          </Button>
        </div>
      </div>

      {/* Company Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            기본 정보
          </CardTitle>
          <CardDescription>회사의 기본 정보를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">회사명</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                onBlur={() => handleBlur('company_name')}
                placeholder="(주)회사명"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ceo_name">대표자명</Label>
              <Input
                id="ceo_name"
                value={formData.ceo_name}
                onChange={(e) => handleChange('ceo_name', e.target.value)}
                onBlur={() => handleBlur('ceo_name')}
                placeholder="홍길동"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_number">사업자등록번호</Label>
            <Input
              id="business_number"
              value={formData.business_number}
              onChange={(e) => handleChange('business_number', e.target.value)}
              onBlur={() => handleBlur('business_number')}
              placeholder="000-00-00000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              주소
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              onBlur={() => handleBlur('address')}
              placeholder="서울특별시 강남구 테헤란로 123"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            연락처 정보
          </CardTitle>
          <CardDescription>연락처 정보를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                placeholder="02-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fax">팩스번호</Label>
              <Input
                id="fax"
                value={formData.fax}
                onChange={(e) => handleChange('fax', e.target.value)}
                onBlur={() => handleBlur('fax')}
                placeholder="02-1234-5679"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              이메일
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="info@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              웹사이트
            </Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              onBlur={() => handleBlur('website')}
              placeholder="https://www.company.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            푸터 텍스트
          </CardTitle>
          <CardDescription>로그인 화면 하단에 표시될 추가 텍스트를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 저작권 문구 - 수정 불가 (고정) */}
          <div className="space-y-2">
            <Label htmlFor="copyright">저작권 문구</Label>
            <Input
              id="copyright"
              value="© 2026 KDH | Sales Management Team. All rights reserved."
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">저작권 문구는 수정할 수 없습니다.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="additional_info">추가 정보</Label>
            <Textarea
              id="additional_info"
              value={formData.additional_info}
              onChange={(e) => handleChange('additional_info', e.target.value)}
              onBlur={() => handleBlur('additional_info')}
              placeholder="추가로 표시할 정보를 입력하세요."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Provider Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            이메일 발송 설정
          </CardTitle>
          <CardDescription>이메일 발송에 사용할 프로바이더를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label>발송 프로바이더</Label>
            <RadioGroup
              value={formData.email_provider}
              onValueChange={(v) => handleChangeAndSave('email_provider', v)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="resend" id="provider-resend" />
                <Label htmlFor="provider-resend" className="cursor-pointer">
                  Resend API
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="smtp" id="provider-smtp" />
                <Label htmlFor="provider-smtp" className="cursor-pointer">
                  SMTP (하이웍스 등)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Resend Settings (resend일 때만 표시) */}
          {formData.email_provider === 'resend' && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Resend 설정</Label>
                <Badge variant="secondary" className="text-xs">활성</Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resend_from_email">발신 이메일</Label>
                <Input
                  id="resend_from_email"
                  type="email"
                  value={formData.resend_from_email}
                  onChange={(e) => handleChange('resend_from_email', e.target.value)}
                  onBlur={() => handleBlur('resend_from_email')}
                  placeholder="onboarding@resend.dev"
                />
                <p className="text-xs text-muted-foreground">
                  비워두면 환경변수(EMAIL_FROM) 또는 기본값(onboarding@resend.dev)을 사용합니다.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleConnectionTest}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4 mr-2" />
                )}
                연결 테스트
              </Button>
            </div>
          )}

          {/* SMTP Settings (smtp일 때만 표시) */}
          {formData.email_provider === 'smtp' && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">SMTP 설정</Label>
                <Badge variant="secondary" className="text-xs">
                  {formData.email_provider === 'smtp' ? '활성' : '비활성'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP 호스트</Label>
                  <Input
                    id="smtp_host"
                    value={formData.smtp_host}
                    onChange={(e) => handleChange('smtp_host', e.target.value)}
                    onBlur={() => handleBlur('smtp_host')}
                    placeholder="smtps.hiworks.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">포트</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="smtp_port"
                      type="number"
                      value={formData.smtp_port}
                      onChange={(e) => handleChange('smtp_port', parseInt(e.target.value) || 465)}
                      onBlur={() => handleBlur('smtp_port')}
                      className="w-24"
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="smtp_secure"
                        checked={formData.smtp_secure}
                        onCheckedChange={(checked) => handleChangeAndSave('smtp_secure', !!checked)}
                      />
                      <Label htmlFor="smtp_secure" className="text-sm cursor-pointer">
                        SSL/TLS
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_user">계정</Label>
                <Input
                  id="smtp_user"
                  value={formData.smtp_user}
                  onChange={(e) => handleChange('smtp_user', e.target.value)}
                  onBlur={() => handleBlur('smtp_user')}
                  placeholder="user@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_password">비밀번호</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  value={formData.smtp_password}
                  onChange={(e) => handleChange('smtp_password', e.target.value)}
                  onBlur={() => handleBlur('smtp_password')}
                  placeholder="비밀번호 입력"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name">발신자명</Label>
                  <Input
                    id="smtp_from_name"
                    value={formData.smtp_from_name}
                    onChange={(e) => handleChange('smtp_from_name', e.target.value)}
                    onBlur={() => handleBlur('smtp_from_name')}
                    placeholder="CSO 정산서 포털"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_email">발신 이메일</Label>
                  <Input
                    id="smtp_from_email"
                    value={formData.smtp_from_email}
                    onChange={(e) => handleChange('smtp_from_email', e.target.value)}
                    onBlur={() => handleBlur('smtp_from_email')}
                    placeholder="noreply@company.com"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleConnectionTest}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4 mr-2" />
                )}
                연결 테스트
              </Button>
            </div>
          )}

          {/* Send Delay */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="email_send_delay">일괄 발송 지연 (초)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="email_send_delay"
                type="number"
                min={0.5}
                max={30}
                step={0.5}
                value={delaySeconds}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    const clamped = Math.max(0.5, Math.min(30, val));
                    handleChange('email_send_delay_ms', Math.round(clamped * 1000));
                  }
                }}
                onBlur={() => handleBlur('email_send_delay_ms')}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">초 (0.5~30)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              스팸 필터 방지를 위해 최소 6초를 권장합니다.
            </p>
          </div>

          {/* Test Recipient Email */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="test_recipient_email">테스트 수신 이메일</Label>
            <Input
              id="test_recipient_email"
              type="email"
              value={formData.test_recipient_email}
              onChange={(e) => handleChange('test_recipient_email', e.target.value)}
              onBlur={() => handleBlur('test_recipient_email')}
              placeholder="test@example.com"
            />
            <p className="text-xs text-muted-foreground">
              연결 테스트 및 메일머지 테스트 발송 시 사용할 수신자 이메일입니다. 비워두면 로그인된 관리자의 이메일로 발송됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Notification Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            이메일 알림 설정
          </CardTitle>
          <CardDescription>이메일 유형별로 발송 여부를 설정합니다. 비활성화하면 해당 유형의 이메일이 발송되지 않습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(EMAIL_NOTIFICATION_LABELS).map(([key, { label, description }]) => (
            <div key={key} className="flex items-start space-x-3 py-3 border-b last:border-b-0">
              <Checkbox
                id={`notif-${key}`}
                checked={formData.email_notifications[key as keyof typeof formData.email_notifications]}
                onCheckedChange={(checked) => {
                  const newNotifications = {
                    ...formData.email_notifications,
                    [key]: !!checked,
                  };
                  setFormData(prev => ({
                    ...prev,
                    email_notifications: newNotifications,
                  }));
                  patchFields({ email_notifications: newNotifications });
                }}
              />
              <div className="space-y-0.5 leading-none">
                <Label htmlFor={`notif-${key}`} className="text-sm font-medium cursor-pointer">
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-3">
            메일머지(수동 발송)는 항상 발송되며, 이 설정의 영향을 받지 않습니다.
          </p>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">미리보기</CardTitle>
          <CardDescription>로그인 화면 푸터에 한 줄로 표시됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
              {formData.company_name && (
                <span className="font-medium text-foreground">{formData.company_name}</span>
              )}
              {formData.company_name && (formData.ceo_name || formData.business_number) && (
                <span className="text-muted-foreground/50">|</span>
              )}
              {formData.ceo_name && <span>대표: {formData.ceo_name}</span>}
              {formData.business_number && <span>사업자: {formData.business_number}</span>}
              {formData.address && <span>{formData.address}</span>}
              {formData.phone && <span>TEL: {formData.phone}</span>}
              {formData.fax && <span>FAX: {formData.fax}</span>}
              {formData.email && <span>{formData.email}</span>}
              {formData.website && <span className="text-primary">{formData.website}</span>}
              <span className="text-muted-foreground/50">|</span>
              <span>© 2026 KDH | Sales Management Team. All rights reserved.</span>
            </div>
            {formData.additional_info && (
              <p className="text-center mt-1 text-muted-foreground/70">{formData.additional_info}</p>
            )}
            {!formData.company_name && !formData.copyright && (
              <p className="text-center italic">표시할 정보가 없습니다.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

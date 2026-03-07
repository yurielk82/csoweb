'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Save, Loader2, Building2, Phone, Mail, Globe, MapPin, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_COMPANY_INFO } from '@/constants/defaults';
import { API_ROUTES } from '@/constants/api';
import type { CompanyInfo } from '@/domain/company/types';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyInfo>(DEFAULT_COMPANY_INFO);
  const initialDataRef = useRef<CompanyInfo>(DEFAULT_COMPANY_INFO);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    fetch(API_ROUTES.SETTINGS.COMPANY, { cache: 'no-store' })
      .then(r => r.json())
      .then((companyResult) => {
        if (companyResult.success && companyResult.data) {
          const merged = { ...DEFAULT_COMPANY_INFO, ...companyResult.data };
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
      const res = await fetch(API_ROUTES.SETTINGS.COMPANY, {
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

  // 전체 저장 (fallback)
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(API_ROUTES.SETTINGS.COMPANY, {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            사이트 설정
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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

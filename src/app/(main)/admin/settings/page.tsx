'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Building2, Phone, Mail, Globe, MapPin, FileText, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  // Notice 영역 설정 (하나의 텍스트로 통합)
  notice_content: string;
}

const DEFAULT_NOTICE = `1. 세금계산서 작성일자: {{정산월}} 29일 이내
2. 세금계산서 취합 마감일: {{정산월}} 29일 (기간내 미발행 할 경우 무통보 이월)
3. 세금계산서 메일 주소: unioncsosale@ukp.co.kr
4. 품목명: "마케팅 용역 수수료" 또는 "판매대행 수수료" ('00월'표기 금지)
5. 대표자: {{대표자명}}
6. 다음달 EDI 입력 마감일: {{정산월+1}} 11일 (수)까지 (설 연휴 등으로 일자변경 가능)`;

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
  notice_content: DEFAULT_NOTICE,
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyInfo>(defaultCompanyInfo);

  useEffect(() => {
    fetch('/api/settings/company', { cache: 'no-store' })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setFormData({ ...defaultCompanyInfo, ...result.data });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof CompanyInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
    } catch {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '저장 중 오류가 발생했습니다.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading text="설정을 불러오는 중..." />;
  }

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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          저장
        </Button>
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
                placeholder="(주)회사명"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ceo_name">대표자명</Label>
              <Input
                id="ceo_name"
                value={formData.ceo_name}
                onChange={(e) => handleChange('ceo_name', e.target.value)}
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
                placeholder="02-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fax">팩스번호</Label>
              <Input
                id="fax"
                value={formData.fax}
                onChange={(e) => handleChange('fax', e.target.value)}
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
              placeholder="추가로 표시할 정보를 입력하세요."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            정산서 Notice 설정
          </CardTitle>
          <CardDescription>
            정산서 조회 페이지 &apos;조회 조건&apos; 아래에 표시될 안내사항입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notice_content">Notice 내용</Label>
            <Textarea
              id="notice_content"
              value={formData.notice_content}
              onChange={(e) => handleChange('notice_content', e.target.value)}
              placeholder={DEFAULT_NOTICE}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>사용 가능한 변수:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>{`{{정산월}}`} - 현재 조회 중인 정산월 (예: 1월)</li>
                <li>{`{{정산월+1}}`} - 다음달 (예: 2월)</li>
                <li>{`{{대표자명}}`} - 기본 정보의 대표자명</li>
              </ul>
            </div>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => handleChange('notice_content', DEFAULT_NOTICE)}
          >
            기본값으로 초기화
          </Button>
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

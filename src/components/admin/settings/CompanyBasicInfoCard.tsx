'use client';

import { Building2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyInfo } from '@/domain/company/types';

interface CompanyBasicInfoCardProps {
  formData: CompanyInfo;
  onChange: (field: keyof CompanyInfo, value: string) => void;
  onBlur: (field: keyof CompanyInfo) => void;
}

export function CompanyBasicInfoCard({ formData, onChange, onBlur }: CompanyBasicInfoCardProps) {
  return (
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
              onChange={(e) => onChange('company_name', e.target.value)}
              onBlur={() => onBlur('company_name')}
              placeholder="(주)회사명"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ceo_name">대표자명</Label>
            <Input
              id="ceo_name"
              value={formData.ceo_name}
              onChange={(e) => onChange('ceo_name', e.target.value)}
              onBlur={() => onBlur('ceo_name')}
              placeholder="홍길동"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="business_number">사업자등록번호</Label>
          <Input
            id="business_number"
            value={formData.business_number}
            onChange={(e) => onChange('business_number', e.target.value)}
            onBlur={() => onBlur('business_number')}
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
            onChange={(e) => onChange('address', e.target.value)}
            onBlur={() => onBlur('address')}
            placeholder="서울특별시 강남구 테헤란로 123"
          />
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Phone, Mail, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyInfo } from '@/domain/company/types';

interface CompanyContactCardProps {
  formData: CompanyInfo;
  onChange: (field: keyof CompanyInfo, value: string) => void;
  onBlur: (field: keyof CompanyInfo) => void;
}

export function CompanyContactCard({ formData, onChange, onBlur }: CompanyContactCardProps) {
  return (
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
              onChange={(e) => onChange('phone', e.target.value)}
              onBlur={() => onBlur('phone')}
              placeholder="02-1234-5678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fax">팩스번호</Label>
            <Input
              id="fax"
              value={formData.fax}
              onChange={(e) => onChange('fax', e.target.value)}
              onBlur={() => onBlur('fax')}
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
            onChange={(e) => onChange('email', e.target.value)}
            onBlur={() => onBlur('email')}
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
            onChange={(e) => onChange('website', e.target.value)}
            onBlur={() => onBlur('website')}
            placeholder="https://www.company.com"
          />
        </div>
      </CardContent>
    </Card>
  );
}

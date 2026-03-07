'use client';

import { FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyInfo } from '@/domain/company/types';

interface CompanyFooterCardProps {
  formData: CompanyInfo;
  onChange: (field: keyof CompanyInfo, value: string) => void;
  onBlur: (field: keyof CompanyInfo) => void;
}

export function CompanyFooterCard({ formData, onChange, onBlur }: CompanyFooterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          푸터 텍스트
        </CardTitle>
        <CardDescription>로그인 화면 하단에 표시될 추가 텍스트를 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            onChange={(e) => onChange('additional_info', e.target.value)}
            onBlur={() => onBlur('additional_info')}
            placeholder="추가로 표시할 정보를 입력하세요."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}

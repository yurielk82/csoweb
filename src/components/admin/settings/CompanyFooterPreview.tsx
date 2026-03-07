'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyInfo } from '@/domain/company/types';

interface CompanyFooterPreviewProps {
  formData: CompanyInfo;
}

export function CompanyFooterPreview({ formData }: CompanyFooterPreviewProps) {
  return (
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
  );
}

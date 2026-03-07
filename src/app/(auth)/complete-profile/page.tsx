'use client';

import { UserCheck, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCompleteProfile } from '@/hooks/useCompleteProfile';
import { AddressFormSection } from '@/components/auth/AddressFormSection';
import { ContactFormSection } from '@/components/auth/ContactFormSection';

export default function CompleteProfilePage() {
  const d = useCompleteProfile();

  if (d.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">회원 정보 설정</CardTitle>
          <CardDescription>
            서비스 이용을 위해 회원 정보를 입력해주세요.
            <br />
            <span className="text-xs text-muted-foreground">
              사업자번호: {d.session?.business_number}
            </span>
          </CardDescription>
        </CardHeader>
        <form onSubmit={d.handleSubmit}>
          <CardContent className="space-y-4">
            {d.error && (
              <Alert variant="destructive">
                <AlertDescription>{d.error}</AlertDescription>
              </Alert>
            )}

            {/* 업체명 */}
            <div className="space-y-2">
              <Label htmlFor="company_name">업체명 *</Label>
              <Input
                id="company_name"
                type="text"
                placeholder="업체명을 입력하세요"
                value={d.formData.company_name}
                onChange={(e) => d.setFormData({ ...d.formData, company_name: e.target.value })}
                required
                disabled={d.saving}
                autoComplete="organization"
              />
            </div>

            {/* 대표자명 */}
            <div className="space-y-2">
              <Label htmlFor="ceo_name">대표자명 *</Label>
              <Input
                id="ceo_name"
                type="text"
                placeholder="대표자명을 입력하세요"
                value={d.formData.ceo_name}
                onChange={(e) => d.setFormData({ ...d.formData, ceo_name: e.target.value })}
                required
                disabled={d.saving}
                autoComplete="name"
              />
            </div>

            <AddressFormSection
              zipcode={d.formData.zipcode}
              address1={d.formData.address1}
              address2={d.formData.address2}
              onAddress2Change={(v) => d.setFormData({ ...d.formData, address2: v })}
              onSearch={d.handleAddressSearch}
              disabled={d.saving}
            />

            <ContactFormSection
              phone1={d.formData.phone1}
              phone2={d.formData.phone2}
              email={d.formData.email}
              email2={d.formData.email2}
              onPhoneChange={d.handlePhoneChange}
              onEmailChange={d.handleEmailChange}
              disabled={d.saving}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={d.saving}>
              {d.saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              설정 완료
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

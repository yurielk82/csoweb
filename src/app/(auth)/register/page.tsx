'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileSpreadsheet, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRegister } from '@/hooks/useRegister';
import { BizVerificationCard } from '@/components/auth/BizVerificationCard';
import { AddressFormSection } from '@/components/auth/AddressFormSection';
import { ContactFormSection } from '@/components/auth/ContactFormSection';

export default function RegisterPage() {
  const router = useRouter();
  const d = useRegister();

  if (d.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-success/10 rounded-full">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl">회원가입 신청 완료</CardTitle>
            <CardDescription>
              회원가입 신청이 완료되었습니다.<br />
              관리자 승인 후 로그인하실 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push('/login')}>
              로그인 페이지로 이동
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>CSO 정산서 포털 회원가입</CardDescription>
        </CardHeader>
        <form onSubmit={d.handleSubmit}>
          <CardContent className="space-y-4">
            {d.error && (
              <Alert variant="destructive">
                <AlertDescription>{d.error}</AlertDescription>
              </Alert>
            )}

            {/* 사업자번호 */}
            <div className="space-y-2">
              <Label htmlFor="business_number">사업자번호 *</Label>
              <Input
                id="business_number"
                type="text"
                placeholder="000-00-00000"
                value={d.formData.business_number}
                onChange={d.handleBusinessNumberChange}
                maxLength={12}
                required
                disabled={d.loading}
                autoComplete="off"
              />
              <BizVerificationCard
                verification={d.bizVerification}
                digitCount={d.bizDigitCount}
                onRetry={d.handleRetryVerification}
              />
            </div>

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
                disabled={d.loading}
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
                disabled={d.loading}
                autoComplete="name"
              />
            </div>

            <AddressFormSection
              zipcode={d.formData.zipcode}
              address1={d.formData.address1}
              address2={d.formData.address2}
              onAddress2Change={(v) => d.setFormData({ ...d.formData, address2: v })}
              onSearch={d.handleAddressSearch}
              disabled={d.loading}
            />

            <ContactFormSection
              phone1={d.formData.phone1}
              phone2={d.formData.phone2}
              email={d.formData.email}
              email2={d.formData.email2}
              onPhoneChange={d.handlePhoneChange}
              onEmailChange={d.handleEmailChange}
              disabled={d.loading}
            />

            {/* 비밀번호 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="영문+숫자 조합 8자 이상"
                  value={d.formData.password}
                  onChange={(e) => d.setFormData({ ...d.formData, password: e.target.value })}
                  required
                  disabled={d.loading}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirm">비밀번호 확인 *</Label>
                <Input
                  id="password_confirm"
                  type="password"
                  placeholder="비밀번호 확인"
                  value={d.formData.password_confirm}
                  onChange={(e) => d.setFormData({ ...d.formData, password_confirm: e.target.value })}
                  required
                  disabled={d.loading}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className={`w-full transition-shadow duration-300 ${
                d.bizVerification.status === 'success' ? 'shadow-lg shadow-success/40' : ''
              }`}
              disabled={d.isSubmitDisabled}
            >
              {d.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              회원가입 신청
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

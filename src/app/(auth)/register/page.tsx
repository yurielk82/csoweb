'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRegister } from '@/hooks/useRegister';
import { RegisterSuccessCard } from '@/components/auth/RegisterSuccessCard';
import { RegisterFormFields } from '@/components/auth/RegisterFormFields';

export default function RegisterPage() {
  const router = useRouter();
  const d = useRegister();

  if (d.success) {
    return <RegisterSuccessCard onNavigateLogin={() => router.push('/login')} />;
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
          <RegisterFormFields d={d} />
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

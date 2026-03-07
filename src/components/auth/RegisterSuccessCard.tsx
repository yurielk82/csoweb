import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface RegisterSuccessCardProps {
  onNavigateLogin: () => void;
}

export function RegisterSuccessCard({ onNavigateLogin }: RegisterSuccessCardProps) {
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
          <Button className="w-full" onClick={onNavigateLogin}>
            로그인 페이지로 이동
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

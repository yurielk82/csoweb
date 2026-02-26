import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { SendResult as SendResultType } from '@/hooks/useMailMerge';

interface SendResultProps {
  result: SendResultType;
}

export function SendResult({ result }: SendResultProps) {
  return (
    <Alert variant={result.failed > 0 ? 'destructive' : 'default'}>
      <AlertTitle>발송 결과</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-1">
          <p>전체 대상: {result.total}개 업체</p>
          <p className="text-green-600">발송 성공: {result.sent}건</p>
          {result.failed > 0 && <p className="text-red-600">발송 실패: {result.failed}건</p>}
        </div>
      </AlertDescription>
    </Alert>
  );
}

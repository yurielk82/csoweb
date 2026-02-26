import { CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { UploadResult } from '@/hooks/useFileUpload';

interface UploadResultCardProps {
  result: UploadResult;
}

export function UploadResultCard({ result }: UploadResultCardProps) {
  return (
    <Alert variant={result.success ? 'default' : 'destructive'}>
      {result.success ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle>
        {result.success ? '업로드 완료' : '업로드 실패'}
      </AlertTitle>
      <AlertDescription>
        {result.success ? (
          <div className="mt-2 space-y-2">
            <p>{result.message}</p>
            {result.data?.rowCount && (
              <p className="text-sm">• 데이터: {result.data.rowCount.toLocaleString()}건</p>
            )}
            {result.data?.settlementMonths && result.data.settlementMonths.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">• 정산월:</span>
                {result.data.settlementMonths.map(month => (
                  <Badge key={month} variant="secondary" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {month}
                  </Badge>
                ))}
              </div>
            )}
            {result.data?.errors && result.data.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">경고:</p>
                <ul className="text-sm list-disc list-inside">
                  {result.data.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.data.errors.length > 5 && (
                    <li>... 외 {result.data.errors.length - 5}건</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ) : (
          result.error
        )}
      </AlertDescription>
    </Alert>
  );
}

import { AlertCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** 초기 로딩 스켈레톤 (셸) */
export function DashboardSkeleton({ header }: { header: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {header}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-7 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** 인증 오류 */
export function AuthErrorCard({ header, error }: { header: React.ReactNode; error: string | null }) {
  return (
    <div className="space-y-6">
      {header}
      <Card className="border-destructive/20 bg-destructive/10">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            {error || '세션이 만료되었거나 로그인이 필요합니다.'}
          </p>
          <Button variant="destructive" onClick={() => window.location.href = '/login'}>
            로그인 페이지로 이동
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** 네트워크 오류 */
export function NetworkErrorCard({ header, error }: { header: React.ReactNode; error: string | null }) {
  return (
    <div className="space-y-6">
      {header}
      <Card className="border-border bg-muted">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">연결 오류</h2>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            {error || '서버와 연결할 수 없습니다. 인터넷 연결을 확인해주세요.'}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** 정산서 미업로드 */
export function NoDataCard({ header }: { header: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {header}
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileSpreadsheet className="h-16 w-16 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">정산서가 아직 업로드되지 않았습니다</h2>
          <p className="text-muted-foreground text-center max-w-md">
            관리자가 정산서를 업로드하면 이곳에서 조회할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** CSO 매칭 없음 */
export function NoMatchingCard({ header }: { header: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {header}
      <Card className="border-warning/20 bg-warning/10">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-16 w-16 text-warning mb-4" />
          <h2 className="text-xl font-semibold mb-2">조회 가능한 정산 데이터가 없습니다</h2>
          <p className="text-muted-foreground text-center max-w-md">
            현재 회원님의 사업자번호와 매칭된 정산 데이터가 없습니다.<br />
            관리자에게 문의하여 CSO 매칭 등록을 요청해주세요.
          </p>
          <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-foreground">
            <p><strong>문의 시 안내사항:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>가입 시 등록한 사업자번호 확인</li>
              <li>CSO 업체명 및 거래처명 확인</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

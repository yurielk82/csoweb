import { Loader2, CheckCircle, RefreshCw, ShieldCheck, AlertTriangle, XCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BizVerification } from '@/hooks/useRegister';

const BIZ_STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle;
}> = {
  '01': { label: '계속사업자', color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-success/20', icon: ShieldCheck },
  '02': { label: '휴업자', color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning/20', icon: AlertTriangle },
  '03': { label: '폐업자', color: 'text-destructive', bgColor: 'bg-destructive/10', borderColor: 'border-destructive/20', icon: XCircle },
};

interface BizVerificationCardProps {
  verification: BizVerification;
  digitCount: number;
  onRetry: () => void;
}

export function BizVerificationCard({ verification, digitCount, onRetry }: BizVerificationCardProps) {
  const { status, data, verifiedAt, errorMessage } = verification;

  if (status === 'idle') {
    return <IdleCard digitCount={digitCount} />;
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>국세청 공식 데이터 확인 중...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-lg border border-border bg-muted p-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (status === 'fail' && !data) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm">
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage || '국세청에 등록되지 않은 사업자등록번호입니다.'}</span>
        </div>
      </div>
    );
  }

  if (data) {
    return <VerifiedCard data={data} verifiedAt={verifiedAt} />;
  }

  return null;
}

function IdleCard({ digitCount }: { digitCount: number }) {
  if (digitCount === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <span>사업자등록번호 10자리를 입력하면 국세청에서 자동 인증합니다</span>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground space-y-2">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 shrink-0" />
        <span>{digitCount}/10자리 입력 — 입력이 완료되면 자동으로 국세청 인증이 시작됩니다</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${digitCount * 10}%` }}
        />
      </div>
    </div>
  );
}

function VerifiedCard({ data, verifiedAt }: {
  data: NonNullable<BizVerification['data']>;
  verifiedAt: string | null;
}) {
  const config = BIZ_STATUS_CONFIG[data.b_stt_cd];
  if (!config) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm">
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{data.b_stt || '확인할 수 없는 사업자 상태입니다.'}</span>
        </div>
      </div>
    );
  }

  const StatusIcon = config.icon;
  const isActive = data.b_stt_cd === '01';
  const statusMessage = isActive
    ? null
    : data.b_stt_cd === '02'
      ? '휴업 상태의 사업자는 가입할 수 없습니다.'
      : '폐업 상태의 사업자는 가입할 수 없습니다.';

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3 text-sm space-y-2`}>
      <div className={`flex items-center gap-2 ${config.color} font-medium`}>
        <StatusIcon className="h-4 w-4 shrink-0" />
        <span>{data.b_stt || config.label}</span>
        {data.tax_type && (
          <span className="font-normal opacity-75">· {data.tax_type}</span>
        )}
      </div>

      {statusMessage && (
        <p className={`${config.color} opacity-90`}>{statusMessage}</p>
      )}

      <div className={`pt-2 border-t ${config.borderColor} text-xs space-y-0.5 opacity-75`}>
        <p>
          {isActive ? '\u2705' : '\u274C'} 국세청(NTS) 인증 결과: {data.b_stt || config.label}
        </p>
        {verifiedAt && (
          <p>출처: 국세청 공공데이터 포털 실시간 정보 (조회 일시: {verifiedAt})</p>
        )}
        <p>보안 안내: 입력하신 정보는 본인 확인 즉시 파기되며 서버에 저장되지 않습니다.</p>
      </div>
    </div>
  );
}

import type { SettlementResponse } from '@/hooks/useMasterData';

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('ko-KR');
}

interface MasterSummaryProps {
  data: SettlementResponse;
}

export function MasterSummary({ data }: MasterSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="tds-card">
        <p className="text-sm text-muted-foreground mb-2">총 수량</p>
        <p className="text-2xl font-bold font-mono tabular-nums">{formatNumber(data.totals.수량)}</p>
      </div>
      <div className="tds-card">
        <p className="text-sm text-muted-foreground mb-2">총 금액</p>
        <p className="text-2xl font-bold font-mono tabular-nums">
          {formatNumber(data.totals.금액)}<span className="text-base font-normal ml-0.5">원</span>
        </p>
      </div>
      <div className="tds-card border-primary/20">
        <p className="text-sm text-muted-foreground mb-2">제약수수료 합계</p>
        <p className="text-2xl font-bold font-mono tabular-nums text-primary">
          {formatNumber(data.totals.제약수수료_합계)}<span className="text-base font-normal ml-0.5">원</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">(세금계산서 발행 금액 / VAT 포함)</p>
      </div>
    </div>
  );
}

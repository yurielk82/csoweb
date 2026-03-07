import { memo } from 'react';
import { Package, Banknote, Calculator } from 'lucide-react';

interface SummaryCardsProps {
  totals: {
    수량: number;
    금액: number;
    제약수수료_합계: number;
    담당수수료_합계: number;
  };
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('ko-KR');
}

export const SummaryCards = memo(function SummaryCards({ totals }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 수량 카드 */}
      <div className="glass-kpi-card">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-4 w-4 glass-icon-cyan" />
          <span className="text-sm text-muted-foreground">총 수량</span>
        </div>
        <p className="text-2xl font-bold font-mono tabular-nums">
          {formatNumber(totals.수량)}
        </p>
      </div>

      {/* 금액 카드 */}
      <div className="glass-kpi-card">
        <div className="flex items-center gap-2 mb-2">
          <Banknote className="h-4 w-4 glass-icon-green" />
          <span className="text-sm text-muted-foreground">총 금액</span>
        </div>
        <p className="text-2xl font-bold font-mono tabular-nums">
          {formatNumber(totals.금액)}<span className="text-base font-normal ml-0.5">원</span>
        </p>
      </div>

      {/* 제약수수료 합계 카드 — primary 강조 */}
      <div className="glass-kpi-card border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 glass-icon-blue" />
          <span className="text-sm text-muted-foreground">제약수수료 합계</span>
        </div>
        <p className="text-2xl font-bold font-mono tabular-nums text-primary">
          {formatNumber(totals.제약수수료_합계)}<span className="text-base font-normal ml-0.5">원</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">(세금계산서 발행 금액 / VAT 포함)</p>
      </div>
    </div>
  );
});

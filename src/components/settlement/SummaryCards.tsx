import { memo } from 'react';
import { Calculator, Building2, Package } from 'lucide-react';

interface SummaryCardsProps {
  totals: {
    제약수수료_합계: number;
    거래처수: number;
    제품수: number;
  };
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('ko-KR');
}

export const SummaryCards = memo(function SummaryCards({ totals }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 제약수수료 합계 카드 — primary 강조 */}
      <div className="tds-card border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 tds-icon-blue" />
          <span className="text-sm text-muted-foreground">제약수수료 합계</span>
        </div>
        <p className="text-2xl font-bold font-mono tabular-nums text-primary">
          {formatNumber(totals.제약수수료_합계)}<span className="text-base font-normal ml-0.5">원</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">(세금계산서 발행 금액 / VAT 포함)</p>
      </div>

      {/* 거래처 수 */}
      <div className="tds-card">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 tds-icon-cyan" />
          <span className="text-sm text-muted-foreground">거래처 수</span>
        </div>
        <p className="text-2xl font-bold font-mono tabular-nums">
          {formatNumber(totals.거래처수)}<span className="text-base font-normal ml-0.5">곳</span>
        </p>
      </div>

      {/* 제품 수 */}
      <div className="tds-card">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-4 w-4 tds-icon-green" />
          <span className="text-sm text-muted-foreground">제품 수</span>
        </div>
        <p className="text-2xl font-bold font-mono tabular-nums">
          {formatNumber(totals.제품수)}<span className="text-base font-normal ml-0.5">종</span>
        </p>
      </div>
    </div>
  );
});

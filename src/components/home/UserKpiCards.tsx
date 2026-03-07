import { Banknote, Building2, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function formatManWon(value: number): string {
  const man = Math.round(value / 10000);
  if (man >= 10000) return `${(man / 10000).toFixed(1)}억`;
  return `${man.toLocaleString()}만`;
}

function monthKeyToLabel(monthKey: string): string {
  const [year, mm] = monthKey.split('-');
  return `${year}년 ${parseInt(mm, 10)}월`;
}

interface UserKpiCardsProps {
  loading: boolean;
  latestMonth: string;
  latestCommission: number;
  latestClientCount: number;
  latestProductCount: number;
}

export function UserKpiCards({
  loading,
  latestMonth,
  latestCommission,
  latestClientCount,
  latestProductCount,
}: UserKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiItem
        loading={loading}
        latestMonth={latestMonth}
        icon={<Banknote className="h-4 w-4 glass-icon-orange" />}
        label="수수료"
        value={formatManWon(latestCommission)}
        suffix="원"
        emphasis
      />
      <KpiItem
        loading={loading}
        latestMonth={latestMonth}
        icon={<Building2 className="h-4 w-4 glass-icon-cyan" />}
        label="거래처 수"
        value={latestClientCount.toLocaleString()}
        suffix="곳"
      />
      <KpiItem
        loading={loading}
        latestMonth={latestMonth}
        icon={<Package className="h-4 w-4 glass-icon-green" />}
        label="제품 수"
        value={latestProductCount.toLocaleString()}
        suffix="종"
      />
    </div>
  );
}

interface KpiItemProps {
  loading: boolean;
  latestMonth: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix: string;
  emphasis?: boolean;
}

function KpiItem({ loading, latestMonth, icon, label, value, suffix, emphasis }: KpiItemProps) {
  return (
    <div className={`glass-kpi-card py-5 px-6 ${emphasis ? 'border-primary/20' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-9 w-24" />
      ) : latestMonth ? (
        <>
          <p className={`text-3xl font-bold font-mono tabular-nums ${emphasis ? 'text-primary' : ''}`}>
            {value}
            <span className="text-base font-normal ml-0.5">{suffix}</span>
          </p>
          <p className="text-sm mt-1 text-muted-foreground">{monthKeyToLabel(latestMonth)}</p>
        </>
      ) : (
        <p className="text-3xl font-bold text-muted-foreground">&mdash;</p>
      )}
    </div>
  );
}

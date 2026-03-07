# 어드민 대시보드 UI 재설계 — 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 반페이지(~500px) 안에 모든 정보를 수용하는 Command Center 레이아웃으로 전면 재구성

**Architecture:** KPI 3장 + 할 일 패널을 같은 행에, 이메일+시스템 상태를 슬림 바로, 차트 3개를 60/40 2열로 배치. OperationsTab/AnalyticsTab 이중 구조를 단일 page.tsx로 병합.

**Tech Stack:** Next.js 14, React (memo), Tailwind CSS, Recharts, Lucide Icons

---

## Task 1: KpiCard 컴포넌트 생성

**Files:**
- Create: `src/components/admin/dashboard/KpiCard.tsx`

**Step 1: 파일 생성**

```tsx
'use client';

import { memo } from 'react';
import { formatDelta, getDeltaColor } from '@/lib/dashboard-utils';
import type { DeltaResult } from '@/lib/dashboard-utils';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  suffix?: string;
  icon: LucideIcon;
  iconColor: string;
  delta: DeltaResult | null;
  emphasis?: boolean;
  sub?: string;
  subColor?: string;
}

export const KpiCard = memo(function KpiCard({
  title,
  value,
  suffix,
  icon: Icon,
  iconColor,
  delta,
  emphasis,
  sub,
  subColor,
}: KpiCardProps) {
  return (
    <div className={`glass-kpi-card ${emphasis ? 'border-primary/20' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        {delta?.percent != null && (
          <span className={`text-xs font-medium ${getDeltaColor(delta.percent)}`}>
            {formatDelta(delta.percent)}
          </span>
        )}
      </div>
      <p className={`text-xl font-bold font-mono tabular-nums ${emphasis ? 'text-primary' : ''}`}>
        {value}
        {suffix && <span className="text-sm font-normal ml-0.5">{suffix}</span>}
      </p>
      {sub && (
        <p className={`text-xs mt-0.5 ${subColor || 'text-muted-foreground'}`}>{sub}</p>
      )}
    </div>
  );
});
```

**Step 2: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: 커밋**

```bash
git add src/components/admin/dashboard/KpiCard.tsx
git commit -m "feat: KpiCard 단일 카드 컴포넌트 생성"
```

---

## Task 2: TodoPanel 컴포넌트 생성

**Files:**
- Create: `src/components/admin/dashboard/TodoPanel.tsx`

**Step 1: 파일 생성**

```tsx
'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Upload, Users, Link2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TodoPanelProps {
  currentMonthUploaded: boolean;
  pendingCount: number;
  unmappedCount: number;
}

export const TodoPanel = memo(function TodoPanel({
  currentMonthUploaded,
  pendingCount,
  unmappedCount,
}: TodoPanelProps) {
  const items: { href: string; icon: typeof Upload; label: string; iconColor: string }[] = [];

  if (!currentMonthUploaded) {
    items.push({ href: '/admin/upload', icon: Upload, label: '정산서 업로드 필요', iconColor: 'glass-icon-blue' });
  }
  if (pendingCount > 0) {
    items.push({ href: '/admin/members?filter=pending', icon: Users, label: `승인 대기 ${pendingCount}명`, iconColor: 'glass-icon-green' });
  }
  if (unmappedCount > 0) {
    items.push({ href: '/admin/integrity', icon: Link2, label: `CSO 미매칭 ${unmappedCount}건`, iconColor: 'glass-icon-cyan' });
  }

  return (
    <div className="glass-kpi-card flex flex-col">
      <div className="flex items-center gap-1.5 mb-2">
        {items.length > 0 ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-semibold">할 일</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-semibold text-muted-foreground">처리 완료</span>
          </>
        )}
      </div>
      {items.length > 0 ? (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <item.icon className={`h-3 w-3 shrink-0 ${item.iconColor}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">처리할 항목 없음</p>
      )}
    </div>
  );
});
```

**Step 2: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: 커밋**

```bash
git add src/components/admin/dashboard/TodoPanel.tsx
git commit -m "feat: TodoPanel 컴포넌트 생성 — KPI 옆 배치용"
```

---

## Task 3: EmailSystemBar 컴포넌트 생성

**Files:**
- Create: `src/components/admin/dashboard/EmailSystemBar.tsx`

**Step 1: 파일 생성**

```tsx
'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { SystemStatus } from '@/types';

interface EmailSystemBarProps {
  emailStats: { total: number; sent: number; failed: number; pending: number } | null;
  systemLoaded: boolean;
  systemStatus: SystemStatus;
  activeProvider: string;
}

export const EmailSystemBar = memo(function EmailSystemBar({
  emailStats,
  systemLoaded,
  systemStatus,
  activeProvider,
}: EmailSystemBarProps) {
  const emailOk =
    activeProvider === 'smtp'
      ? systemStatus.smtp.configured
      : systemStatus.resend;
  const emailLabel =
    activeProvider === 'smtp'
      ? `SMTP${systemStatus.resend ? '/Resend' : ''}`
      : `Resend${systemStatus.smtp.configured ? '/SMTP' : ''}`;

  const checks = [
    { label: 'DB', ok: systemStatus.supabase },
    { label: '국세청', ok: systemStatus.nts_api },
    { label: '심평원(병원)', ok: systemStatus.hira_hospital_api },
    { label: '심평원(약국)', ok: systemStatus.hira_pharmacy_api },
    { label: emailLabel, ok: emailOk },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-xs text-muted-foreground">
      {/* 이메일 발송 현황 */}
      <div className="flex items-center gap-1.5">
        <Mail className="h-3 w-3" />
        {emailStats ? (
          <span>
            {emailStats.sent.toLocaleString()}건 발송
            {emailStats.failed > 0 && (
              <span className="text-destructive ml-1">
                · 실패 {emailStats.failed}건
              </span>
            )}
          </span>
        ) : (
          <span>이메일 정보 없음</span>
        )}
      </div>

      {/* 시스템 상태 */}
      <div className="flex items-center gap-2">
        {systemLoaded ? (
          checks.map(({ label, ok }) => (
            <span key={label} className="flex items-center gap-1">
              <span className={ok ? 'dashboard-status-dot-ok' : 'dashboard-status-dot-fail'} />
              <span className={ok ? '' : 'text-destructive'}>{label}</span>
            </span>
          ))
        ) : (
          <Skeleton className="h-3 w-48" />
        )}
        <Link
          href="/admin/system"
          className="flex items-center gap-0.5 hover:text-foreground transition-colors ml-1"
        >
          상세
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
});
```

**Step 2: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: 커밋**

```bash
git add src/components/admin/dashboard/EmailSystemBar.tsx
git commit -m "feat: EmailSystemBar — 이메일+시스템 상태 통합 바"
```

---

## Task 4: 차트 compact 모드 추가

**Files:**
- Modify: `src/components/shared/MonthlyStatsChart.tsx`
- Modify: `src/components/admin/dashboard/CsoShareChart.tsx`
- Modify: `src/components/admin/dashboard/EmailStatsChart.tsx`

### Step 1: MonthlyStatsChart — compact prop 추가

`src/components/shared/MonthlyStatsChart.tsx`

변경 사항:
1. props에 `compact?: boolean`, `title?: string` 추가
2. compact일 때 차트 높이 축소: `h-60 lg:h-64` → `h-44 lg:h-48`
3. title이 있으면 카드 내부에 표시

```tsx
// Props 인터페이스 수정
interface MonthlyStatsChartProps {
  data: MonthlyStatData[];
  compact?: boolean;
  title?: string;
}

// 컴포넌트 시그니처 수정
export default function MonthlyStatsChart({ data, compact, title }: MonthlyStatsChartProps) {
  // ... 기존 로직 유지 ...

  return (
    <div className="glass-chart-card">
      {title && (
        <h3 className={`font-semibold mb-1 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
      )}
      <ChartContainer
        config={chartConfig}
        className={`${compact ? 'h-44 lg:h-48' : 'h-60 lg:h-64'} w-full`}
      >
        {/* ... 기존 차트 내용 그대로 ... */}
      </ChartContainer>
    </div>
  );
}
```

주의: home/page.tsx에서 props 없이 호출하므로 기존 동작 유지됨.

### Step 2: CsoShareChart — compact prop 추가

`src/components/admin/dashboard/CsoShareChart.tsx`

변경 사항:
1. props에 `compact?: boolean` 추가
2. compact일 때: 차트 높이 `h-52 lg:h-56` → `h-28`, 도넛 반경 축소, Legend 숨김

```tsx
// Props 수정
interface CsoShareChartProps {
  data: { name: string; value: number }[];
  title?: string;
  compact?: boolean;
}

// 컴포넌트 시그니처
export const CsoShareChart = memo(function CsoShareChart({
  data, title = '월별 수수료 비중', compact,
}: CsoShareChartProps) {
  // ... 기존 로직 ...

  // empty state 높이 조정
  // compact ? 'h-32' : 'h-52'

  return (
    <div className="glass-chart-card">
      <div className={compact ? 'px-3 pt-3 pb-1' : 'px-5 pt-5 pb-3'}>
        <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
      </div>
      <ChartContainer config={chartConfig} className={`${compact ? 'h-28' : 'h-52 lg:h-56'} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer>
            {/* ... 기존 tooltip ... */}
            <Pie
              data={chartData}
              cx="50%"
              cy={compact ? '50%' : '45%'}
              innerRadius={compact ? 30 : 45}
              outerRadius={compact ? 50 : 75}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              strokeWidth={0}
            >
              {/* ... cells + label ... */}
            </Pie>
            {!compact && <ChartLegend content={<ChartLegendContent />} />}
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
});
```

### Step 3: EmailStatsChart — compact prop 추가

`src/components/admin/dashboard/EmailStatsChart.tsx`

변경 사항:
1. props에 `compact?: boolean` 추가
2. compact일 때: 차트 높이 `h-48 lg:h-52` → `h-24`, Y축 숨김, 바 사이즈 축소

```tsx
// Props 수정
interface EmailStatsChartProps {
  data: EmailMonthlyStat[];
  compact?: boolean;
}

// 컴포넌트 수정
export const EmailStatsChart = memo(function EmailStatsChart({
  data, compact,
}: EmailStatsChartProps) {
  // ... 기존 로직 ...

  return (
    <div className="glass-chart-card">
      <div className={compact ? 'px-3 pt-3 pb-1' : 'px-5 pt-5 pb-3'}>
        <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>이메일 발송 현황</h3>
        {!compact && (
          <p className="text-sm text-muted-foreground mt-0.5">
            총 <span className="font-medium text-foreground">{totalSent.toLocaleString()}건</span> 발송
          </p>
        )}
      </div>
      <ChartContainer config={chartConfig} className={`${compact ? 'h-24' : 'h-48 lg:h-52'} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            {/* ... defs, grid 유지 ... */}
            <XAxis dataKey="label" tick={{ fontSize: compact ? 10 : 12 }} tickLine={false} tickMargin={compact ? 4 : 10} axisLine={false} />
            {!compact && <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />}
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`${value}건`, '발송']} />} />
            <Bar dataKey="total" fill="url(#fillEmail)" radius={[6, 6, 0, 0]} barSize={compact ? 12 : 24} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
});
```

**Step 4: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: PASS (compact prop은 optional이므로 기존 호출 영향 없음)

**Step 5: 커밋**

```bash
git add src/components/shared/MonthlyStatsChart.tsx src/components/admin/dashboard/CsoShareChart.tsx src/components/admin/dashboard/EmailStatsChart.tsx
git commit -m "feat: 차트 compact 모드 추가 — 대시보드 반페이지 대응"
```

---

## Task 5: page.tsx 재작성

**Files:**
- Modify: `src/app/(main)/admin/page.tsx` (전체 재작성)

**Step 1: page.tsx 전체 교체**

```tsx
'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Calculator, Building2, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { calculateDelta } from '@/lib/dashboard-utils';
import { KpiCard } from '@/components/admin/dashboard/KpiCard';
import { TodoPanel } from '@/components/admin/dashboard/TodoPanel';
import { EmailSystemBar } from '@/components/admin/dashboard/EmailSystemBar';
import { CsoShareChart } from '@/components/admin/dashboard/CsoShareChart';
import { EmailStatsChart } from '@/components/admin/dashboard/EmailStatsChart';

const MonthlyStatsChart = dynamic(
  () => import('@/components/shared/MonthlyStatsChart'),
  { ssr: false, loading: () => <Skeleton className="h-full rounded-xl" /> },
);

const RECENT_SHARE_MONTHS = 6;

function formatManWon(value: number): string {
  const man = Math.round(value / 10000);
  if (man >= 10000) return `${(man / 10000).toFixed(1)}억`;
  return `${man.toLocaleString()}만`;
}

export default function AdminDashboardPage() {
  const data = useAdminDashboard();
  const {
    kpiLoaded,
    systemLoaded,
    selectedMonth,
    months,
    enrichedChartData,
    emailStats,
    emailMonthlyStats,
    pendingCount,
    unmappedCount,
    allSnapshots,
    systemStatus,
    activeProvider,
    currentMonthKey,
  } = data;

  const sortedMonths = useMemo(
    () => [...months].sort((a, b) => a.month.localeCompare(b.month)),
    [months],
  );
  const currentMonth = sortedMonths.find((m) => m.month === selectedMonth);
  const currentIdx = sortedMonths.findIndex((m) => m.month === selectedMonth);
  const prevMonth = currentIdx > 0 ? sortedMonths[currentIdx - 1] : undefined;

  const commissionDelta = calculateDelta(currentMonth?.totalCommission ?? 0, prevMonth?.totalCommission);
  const csoDelta = calculateDelta(currentMonth?.csoCount ?? 0, prevMonth?.csoCount);

  const selectedSnapshot = allSnapshots.find((s) => s.settlement_month === selectedMonth);
  const accessedCount = selectedSnapshot?.accessed_business_numbers?.length ?? 0;
  const totalCsoCount = months.find((m) => m.month === selectedMonth)?.csoCount ?? 0;
  const accessRate = totalCsoCount > 0 ? Math.round((accessedCount / totalCsoCount) * 100) : 0;

  const currentMonthUploaded = months.some((m) => m.month === currentMonthKey);

  const csoShareData = useMemo(() => {
    const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month));
    return sorted
      .filter((m) => m.totalCommission > 0)
      .slice(-RECENT_SHARE_MONTHS)
      .map((m) => ({ name: `${m.month.split('-')[1]}월`, value: m.totalCommission }));
  }, [months]);

  return (
    <div className="flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">관리자 대시보드</h1>
        {systemLoaded && (
          <span className="text-xs text-muted-foreground font-mono">
            {systemStatus.version} · {systemStatus.environment}
          </span>
        )}
      </div>

      {/* KPI + 할 일 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiLoaded ? (
          <>
            <KpiCard
              title="수수료 총액"
              value={currentMonth ? formatManWon(currentMonth.totalCommission) : '-'}
              suffix="원"
              icon={Calculator}
              iconColor="glass-icon-blue"
              delta={commissionDelta}
              emphasis
            />
            <KpiCard
              title="CSO 업체"
              value={currentMonth ? currentMonth.csoCount.toLocaleString() : '-'}
              suffix="개"
              icon={Building2}
              iconColor="glass-icon-cyan"
              delta={csoDelta}
            />
            <KpiCard
              title="접속률"
              value={`${accessRate}`}
              suffix="%"
              icon={Activity}
              iconColor="glass-icon-green"
              delta={null}
              sub={`${accessedCount} / ${totalCsoCount}`}
            />
          </>
        ) : (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        )}
        <TodoPanel
          currentMonthUploaded={currentMonthUploaded}
          pendingCount={pendingCount}
          unmappedCount={unmappedCount}
        />
      </div>

      {/* 이메일 + 시스템 상태 바 */}
      <EmailSystemBar
        emailStats={emailStats}
        systemLoaded={systemLoaded}
        systemStatus={systemStatus}
        activeProvider={activeProvider}
      />

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          {kpiLoaded ? (
            <MonthlyStatsChart data={enrichedChartData} title="월별 정산 추이" compact />
          ) : (
            <Skeleton className="h-64 rounded-xl" />
          )}
        </div>
        <div className="lg:col-span-2 flex flex-col gap-3">
          <CsoShareChart data={csoShareData} title="수수료 비중" compact />
          <EmailStatsChart data={emailMonthlyStats} compact />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 빌드 확인**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: 개발 서버에서 시각 확인**

Run: `npm run dev`
확인: http://localhost:3000/admin 에서 반페이지 안에 모든 요소가 보이는지 확인

**Step 4: 커밋**

```bash
git add src/app/\(main\)/admin/page.tsx
git commit -m "refactor: 어드민 대시보드 Command Center 레이아웃으로 재구성"
```

---

## Task 6: 구 컴포넌트 삭제 + 정리

**Files:**
- Delete: `src/components/admin/dashboard/OperationsTab.tsx`
- Delete: `src/components/admin/dashboard/AnalyticsTab.tsx`
- Delete: `src/components/admin/dashboard/AdminKpiCards.tsx`
- Delete: `src/components/admin/dashboard/TodoAlerts.tsx`

**Step 1: 참조 확인**

```bash
grep -r "OperationsTab\|AnalyticsTab\|AdminKpiCards\|TodoAlerts" src/ --include="*.tsx" --include="*.ts"
```

Expected: page.tsx에서 더 이상 import하지 않음 (Task 5에서 교체됨)

**Step 2: 삭제**

```bash
rm src/components/admin/dashboard/OperationsTab.tsx
rm src/components/admin/dashboard/AnalyticsTab.tsx
rm src/components/admin/dashboard/AdminKpiCards.tsx
rm src/components/admin/dashboard/TodoAlerts.tsx
```

**Step 3: 빌드 검증**

Run: `npx tsc --noEmit && npx eslint --no-warn-ignored .`
Expected: PASS

**Step 4: 커밋**

```bash
git add -A
git commit -m "refactor: 어드민 대시보드 구 컴포넌트 삭제 (OperationsTab, AnalyticsTab, AdminKpiCards, TodoAlerts)"
```

---

## Task 7: 빌드 + 테스트 검증

**Step 1: 전체 빌드**

Run: `npm run build`
Expected: Build 성공

**Step 2: 테스트**

Run: `npm test`
Expected: 기존 테스트 전부 통과

**Step 3: 시각 확인 항목**

- [ ] Desktop(1920px): 스크롤 없이 전체 보임
- [ ] Desktop(1440px): 스크롤 없이 전체 보임
- [ ] Desktop(1080px): 반페이지 내 수용
- [ ] Tablet(768px): 자연스러운 폴백
- [ ] Mobile(375px): 수직 스택, 가독성 유지
- [ ] 다크모드: 색상/대비 정상
- [ ] 할 일 0개: "처리 완료" 표시
- [ ] 할 일 3개: 모두 표시, 링크 동작

**Step 4: 최종 커밋 + 버전 범프**

```bash
# version bump (minor — UI 전면 재구성)
npm version minor --no-git-tag-version
git add package.json package-lock.json CHANGELOG.md
git commit -m "refactor: 어드민 대시보드 Command Center 레이아웃 (v0.36.0)"
```

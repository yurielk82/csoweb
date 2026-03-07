# 관리자 대시보드 분할 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 관리자 대시보드를 운영 현황 + 정산 분석 2개 탭으로 분할하고, KPI 카드에 전월 대비 증감을 표시한다.

**Architecture:** 기존 `/admin/page.tsx`의 데이터 페칭 로직은 커스텀 훅 `useAdminDashboard`로 추출한다. 렌더링은 `OperationsTab`과 `AnalyticsTab` 두 컴포넌트로 분리하고, shadcn/ui `Tabs`로 전환한다. 도넛 차트는 recharts `PieChart`로 구현한다.

**Tech Stack:** Next.js 14, React, TypeScript, shadcn/ui Tabs, recharts (PieChart, BarChart), Tailwind CSS, Supabase

**Design Doc:** `docs/plans/2026-03-07-admin-dashboard-split-design.md`

**Design System:** `.interface-design/system.md` — glass-kpi-card, glass-chart-card 패턴 적용

---

## Task 1: 전월 대비 증감 유틸리티

**Files:**
- Create: `src/lib/dashboard-utils.ts`
- Create: `src/lib/dashboard-utils.test.ts`

**Step 1: 테스트 작성**

```typescript
// src/lib/dashboard-utils.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDelta, formatDelta } from './dashboard-utils';

describe('calculateDelta', () => {
  it('양수 증감을 계산한다', () => {
    expect(calculateDelta(120, 100)).toEqual({ value: 20, percent: 20 });
  });

  it('음수 증감을 계산한다', () => {
    expect(calculateDelta(80, 100)).toEqual({ value: -20, percent: -20 });
  });

  it('전월이 0이면 percent는 null', () => {
    expect(calculateDelta(50, 0)).toEqual({ value: 50, percent: null });
  });

  it('동일하면 0%', () => {
    expect(calculateDelta(100, 100)).toEqual({ value: 0, percent: 0 });
  });

  it('전월이 undefined면 null 반환', () => {
    expect(calculateDelta(100, undefined)).toBeNull();
  });
});

describe('formatDelta', () => {
  it('양수면 ▲ 접두사', () => {
    expect(formatDelta(20)).toBe('▲ 20%');
  });

  it('음수면 ▼ 접두사', () => {
    expect(formatDelta(-15)).toBe('▼ 15%');
  });

  it('0이면 — 표시', () => {
    expect(formatDelta(0)).toBe('—');
  });

  it('null이면 빈 문자열', () => {
    expect(formatDelta(null)).toBe('');
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- src/lib/dashboard-utils.test.ts`
Expected: FAIL — 모듈 없음

**Step 3: 구현**

```typescript
// src/lib/dashboard-utils.ts

export interface DeltaResult {
  value: number;
  percent: number | null;
}

/** 이번 달과 전월의 차이를 계산한다 */
export function calculateDelta(
  current: number,
  previous: number | undefined,
): DeltaResult | null {
  if (previous === undefined) return null;
  const value = current - previous;
  const percent = previous === 0 ? null : Math.round((value / previous) * 100);
  return { value, percent };
}

/** 증감 퍼센트를 포맷한다: ▲ 20%, ▼ 15%, —, '' */
export function formatDelta(percent: number | null): string {
  if (percent === null) return '';
  if (percent === 0) return '—';
  if (percent > 0) return `▲ ${percent}%`;
  return `▼ ${Math.abs(percent)}%`;
}

/** 증감 방향에 따른 CSS 클래스 */
export function getDeltaColor(percent: number | null): string {
  if (percent === null || percent === 0) return 'text-muted-foreground';
  return percent > 0 ? 'text-success' : 'text-destructive';
}
```

**Step 4: 테스트 통과 확인**

Run: `npm test -- src/lib/dashboard-utils.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add src/lib/dashboard-utils.ts src/lib/dashboard-utils.test.ts
git commit -m "feat: 전월 대비 증감 유틸리티 추가"
```

---

## Task 2: useAdminDashboard 훅 추출

**Files:**
- Create: `src/hooks/useAdminDashboard.ts`
- Modify: `src/app/(main)/admin/page.tsx`

**목적:** 기존 `page.tsx`의 450줄 중 상태·데이터 페칭 로직(~200줄)을 커스텀 훅으로 추출. 렌더링 코드만 page.tsx에 남긴다.

**Step 1: 훅 생성**

기존 `page.tsx`에서 아래 코드를 `useAdminDashboard.ts`로 이동:
- 모든 `useState` 선언 (line 92~123)
- `adminBusinessNumbers`, `filteredCsoBusinessNumbers` 계산 (line 126~131)
- `enrichedChartData` useMemo (line 134~147)
- `fetchEmailStats`, `fetchCsoCompanies` useCallback (line 150~182)
- `useEffect` 초기 로드 (line 185~281)
- `handleMonthChange` (line 284~291)
- `monthOptions` 계산 (line 294~298)
- `badgeMap` 계산 (line 303~323)

훅 반환 타입:

```typescript
export interface AdminDashboardData {
  // 로딩 상태
  kpiLoaded: boolean;
  badgesLoaded: boolean;
  systemLoaded: boolean;
  // 선택
  selectedMonth: string;
  handleMonthChange: (month: string) => void;
  monthOptions: string[];
  // KPI 데이터
  months: SettlementMonth[];
  enrichedChartData: EnrichedChartData[];
  filteredCsoBusinessNumbers: string[];
  emailStats: EmailStats | null;
  // 배지/할 일
  badgeMap: Record<string, { label: string; variant: 'secondary' | 'outline' }>;
  pendingCount: number;
  unmappedCount: number;
  // 차트 데이터
  allSnapshots: SettlementUpload[];
  emailMonthlyStats: EmailMonthlyStat[];
  // 시스템
  systemStatus: SystemStatus;
  activeProvider: string;
}
```

**Step 2: page.tsx를 훅 사용으로 전환**

`page.tsx`에서 상태/페칭 코드를 제거하고 `const data = useAdminDashboard()`로 교체.
기존 렌더링 JSX는 그대로 유지 (이 시점에서는 탭 전환 미적용).

**Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공, 기존과 동일한 화면

**Step 4: 커밋**

```bash
git add src/hooks/useAdminDashboard.ts src/app/(main)/admin/page.tsx
git commit -m "refactor: 관리자 대시보드 상태/페칭 로직 useAdminDashboard 훅 추출"
```

---

## Task 3: AdminKpiCards 컴포넌트

**Files:**
- Create: `src/components/admin/dashboard/AdminKpiCards.tsx`

**의존:** Task 1 (dashboard-utils)

**Step 1: 구현**

KPI 카드 4개: 수수료 총액, CSO 업체 수, 접속률, 이메일 발송.
기존 `glass-kpi-card` 클래스 + `glass-icon-{color}` 패턴 적용.
각 카드에 `calculateDelta` + `formatDelta` + `getDeltaColor` 로 전월 대비 표시.

```typescript
// Props
interface AdminKpiCardsProps {
  months: SettlementMonth[];
  selectedMonth: string;
  accessedCount: number;
  totalCsoCount: number;
  emailStats: EmailStats | null;
}
```

카드 구성:

| # | 타이틀 | 값 | 아이콘 | 색상 |
|---|--------|-----|--------|------|
| 1 | 수수료 총액 | `months[selected].totalCommission` (만원 단위) | Calculator | glass-icon-blue |
| 2 | CSO 업체 수 | `months[selected].csoCount` | Building2 | glass-icon-cyan |
| 3 | 접속률 | `accessedCount / totalCsoCount * 100` (%) | Activity | glass-icon-green |
| 4 | 이메일 발송 | `emailStats.sent` | Mail | glass-icon-purple |

전월 대비: `months` 배열에서 `selectedMonth`의 이전 월 데이터를 찾아 delta 계산.

**Step 2: 빌드 확인** (아직 page에 연결 안 됨, import만 확인)

Run: `npx tsc --noEmit`
Expected: 타입 에러 없음

**Step 3: 커밋**

```bash
git add src/components/admin/dashboard/AdminKpiCards.tsx
git commit -m "feat: AdminKpiCards — KPI 카드 4개 + 전월 대비 증감 표시"
```

---

## Task 4: TodoAlerts 컴포넌트

**Files:**
- Create: `src/components/admin/dashboard/TodoAlerts.tsx`

**Step 1: 구현**

할 일이 있을 때만 표시되는 알림 배너. 기존 `badgeMap` 로직 기반.

```typescript
interface TodoAlertsProps {
  currentMonthUploaded: boolean;
  pendingCount: number;
  unmappedCount: number;
  emailNeeded: boolean; // CSO 있는데 이메일 미발송
}
```

조건부 렌더링: 모든 값이 정상이면 컴포넌트 자체를 렌더링하지 않음 (`return null`).

디자인: `glass-chart-card` 배경 + `border-warning/20` 테두리 + 각 항목에 아이콘 + 링크.

**Step 2: 커밋**

```bash
git add src/components/admin/dashboard/TodoAlerts.tsx
git commit -m "feat: TodoAlerts — 조건부 할 일 알림 컴포넌트"
```

---

## Task 5: OperationsTab 컴포넌트

**Files:**
- Create: `src/components/admin/dashboard/OperationsTab.tsx`

**의존:** Task 2 (useAdminDashboard), Task 3 (AdminKpiCards), Task 4 (TodoAlerts)

**Step 1: 구현**

기존 page.tsx의 빠른 작업 그리드 + 시스템 상태 풋터를 이 컴포넌트로 이동.
구성 순서: AdminKpiCards → TodoAlerts → 빠른 작업 → 시스템 풋터.

```typescript
interface OperationsTabProps {
  data: AdminDashboardData;
}
```

`quickActions` 배열과 시스템 상태 렌더링 코드를 `page.tsx`에서 이동.

**Step 2: 커밋**

```bash
git add src/components/admin/dashboard/OperationsTab.tsx
git commit -m "feat: OperationsTab — 운영 현황 탭 컴포넌트"
```

---

## Task 6: CsoShareChart + EmailStatsChart

**Files:**
- Create: `src/components/admin/dashboard/CsoShareChart.tsx`
- Create: `src/components/admin/dashboard/EmailStatsChart.tsx`

**Step 1: CsoShareChart — CSO별 수수료 비중 도넛 차트**

recharts `PieChart` + `Pie` + `Cell` 사용.
데이터: `months` 배열의 현재 월에서 CSO별 수수료 합계가 직접 구할 수 없으므로,
**대안**: 전체 `months` 데이터에서 `totalCommission`의 월별 비중을 도넛으로 표시.
또는 `cso-summary` API를 추가하면 CSO별 표시 가능.

**일단 월별 수수료 비중으로 구현 → 추후 CSO별로 전환 가능하게 props 설계.**

```typescript
interface CsoShareChartProps {
  data: { name: string; value: number; }[];
  title: string;
}
```

shadcn/ui `ChartContainer` + `ChartConfig` 패턴 적용. 상위 5개 + "기타" 그룹핑.

색상: `hsl(var(--chart-1))` ~ `hsl(var(--chart-5))` + `hsl(var(--muted))`.

**Step 2: EmailStatsChart — 이메일 월별 발송 현황 바 차트**

recharts `BarChart` 사용. `emailMonthlyStats` 데이터 기반.

```typescript
interface EmailStatsChartProps {
  data: EmailMonthlyStat[];
}
```

**Step 3: 타입 검증**

Run: `npx tsc --noEmit`

**Step 4: 커밋**

```bash
git add src/components/admin/dashboard/CsoShareChart.tsx src/components/admin/dashboard/EmailStatsChart.tsx
git commit -m "feat: CsoShareChart + EmailStatsChart — 분석 탭 차트 2종"
```

---

## Task 7: AnalyticsTab 컴포넌트

**Files:**
- Create: `src/components/admin/dashboard/AnalyticsTab.tsx`

**의존:** Task 6 (차트), Task 1 (delta utils)

**Step 1: 구현**

구성 순서:
1. 기존 `MonthlyStatsChart` (재사용)
2. 전월 대비 증감 카드 3개 (수수료, 건수, 접속률)
3. CsoShareChart (월별 수수료 비중)
4. EmailStatsChart (이메일 추이)

```typescript
interface AnalyticsTabProps {
  data: AdminDashboardData;
}
```

레이아웃: 차트는 `glass-chart-card`로 감싸고, 증감 카드는 `glass-kpi-card` 사용.
증감 카드 3개는 `grid grid-cols-1 sm:grid-cols-3 gap-4`.
하단 2개 차트는 `grid grid-cols-1 lg:grid-cols-2 gap-6`.

**Step 2: 커밋**

```bash
git add src/components/admin/dashboard/AnalyticsTab.tsx
git commit -m "feat: AnalyticsTab — 정산 분석 탭 컴포넌트"
```

---

## Task 8: page.tsx 탭 전환 적용

**Files:**
- Modify: `src/app/(main)/admin/page.tsx`

**의존:** Task 5 (OperationsTab), Task 7 (AnalyticsTab)

**Step 1: page.tsx를 탭 컨테이너로 전환**

기존 렌더링 코드를 모두 제거하고 `Tabs` + `OperationsTab` + `AnalyticsTab`으로 교체.

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OperationsTab } from '@/components/admin/dashboard/OperationsTab';
import { AnalyticsTab } from '@/components/admin/dashboard/AnalyticsTab';

// page.tsx는 ~60줄로 축소:
// - useAdminDashboard() 호출
// - 헤더 + 월 선택기
// - Tabs(operations, analytics)
// - 각 TabsContent에 해당 탭 컴포넌트
```

탭 아이콘: `Activity` (운영), `BarChart3` (분석).

**Step 2: 빌드 확인**

Run: `npm run build`
Expected: 성공

**Step 3: 브라우저 확인**

`http://localhost:3000/admin`에서:
- 기본 탭: 운영 현황 (KPI 카드 4개 + 할 일 + 빠른 작업 + 시스템 상태)
- 분석 탭 클릭 시: 차트 + 증감 + 비중 + 이메일 추이

**Step 4: 커밋**

```bash
git add src/app/(main)/admin/page.tsx
git commit -m "feat: 관리자 대시보드 운영/분석 2탭 분할"
```

---

## Task 9: 린트 + 문서 + 버전업

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `package.json`

**Step 1: 린트 실행**

Run: `npm run lint`
Expected: 에러 0

**Step 2: CHANGELOG 추가**

최상단에 v0.33.0 항목 추가.

**Step 3: 버전 동기화**

`package.json` + `README.md` 버전을 `0.33.0`으로.

**Step 4: 최종 커밋 + 푸시**

```bash
git add -A
git commit -m "feat: 관리자 대시보드 운영/분석 2탭 분할 (v0.33.0)"
~/.claude/scripts/smart-push.sh 2
```

---

## 의존성 그래프

```
Task 1 (delta utils)
  ├── Task 3 (AdminKpiCards)
  └── Task 7 (AnalyticsTab)

Task 2 (useAdminDashboard 훅)
  └── Task 5 (OperationsTab)
       └── Task 8 (page.tsx 탭 전환)

Task 4 (TodoAlerts) ─── Task 5

Task 6 (Charts) ─── Task 7 (AnalyticsTab) ─── Task 8

Task 8 ─── Task 9 (린트/문서/버전)
```

**병렬 가능 그룹:**
- Group A: Task 1, Task 4 (독립)
- Group B: Task 3, Task 6 (Task 1 완료 후 병렬)
- Group C: Task 5, Task 7 (의존 완료 후 병렬)
- Sequential: Task 2 → Task 8 → Task 9

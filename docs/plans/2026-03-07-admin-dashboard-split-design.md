# 관리자 대시보드 분할 설계

## 개요

단일 관리자 대시보드(`/admin`)를 **운영 현황**과 **정산 분석** 2개 탭으로 분할한다.

## 현재 문제

- `/admin/page.tsx` 450줄에 운영(빠른 작업) + 분석(차트) + 인프라(시스템 상태) 혼재
- KPI 카드 없음 — 차트만 있고 핵심 숫자 한눈에 파악 불가
- 전월 대비 증감 없음 — 숫자만 보여주고 맥락 부재

## 설계

### 탭 구조

URL: `/admin` (탭 상태는 query param `?tab=analytics` 또는 기본 `operations`)

| 탭 | 핵심 질문 | 구성 |
|----|----------|------|
| **운영 현황** (기본) | "지금 뭘 해야 하나?" | KPI 카드 4개 + 할 일 배지 + 빠른 작업 + 시스템 상태 |
| **정산 분석** | "추세가 어떤가?" | 월별 차트 + 전월 대비 증감 + CSO별 비중 + 이메일 추이 |

### 운영 현황 탭

```
[월 선택기]

KPI 카드 4개 (glass-kpi-card + 전월 대비 증감 표시)
┌──────────┬──────────┬──────────┬──────────┐
│ 수수료   │ CSO      │ 접속률   │ 이메일   │
│ 총액     │ 업체수   │          │ 발송     │
│ ▲12%    │ 42개     │ 90%      │ 156건    │
└──────────┴──────────┴──────────┴──────────┘

할 일 알림 (조건부 표시 — 할 일이 있을 때만)
┌─────────────────────────────────────────┐
│ ⚠ 정산서 업로드 필요                     │
│ ⚠ 승인대기 3명                           │
│ ⚠ 미매칭 5건                             │
└─────────────────────────────────────────┘

빠른 작업 (기존 7개 액션 카드 — 배지 포함)

시스템 상태 (기존 풋터)
```

**KPI 카드 상세:**

| 카드 | 데이터 소스 | 전월 대비 |
|------|-----------|----------|
| 수수료 총액 | `months[selected].totalCommission` | `(이번달 - 전월) / 전월 * 100` |
| CSO 업체 수 | `months[selected].csoCount` | 전월 대비 증감 |
| 접속률 | `accessedCount / filteredCsoBusinessNumbers.length` | 전월 대비 증감 |
| 이메일 발송 | `emailStats.sent` | 전월 대비 증감 |

**전월 대비 증감 표시 규칙:**
- 양수: `text-success` + `▲` 접두사
- 음수: `text-destructive` + `▼` 접두사
- 동일: `text-muted-foreground` + `—`
- 전월 데이터 없음: 표시 안 함

### 정산 분석 탭

```
[월 선택기 — 공유]

월별 정산 추이 (기존 MonthlyStatsChart 재사용)

전월 대비 증감 카드 3개
┌──────────┬──────────┬──────────┐
│ 수수료   │ 건수     │ 접속률   │
│ +12%     │ -3%      │ 90%→95% │
└──────────┴──────────┴──────────┘

CSO별 수수료 비중 (도넛 차트 — recharts PieChart)
- 상위 5개 CSO + 기타

이메일 발송 현황 (월별 발송/실패 BarChart)
```

### 컴포넌트 분리 계획

```
src/app/(main)/admin/page.tsx          — 탭 컨테이너 + 공유 상태/데이터 페칭
src/components/admin/OperationsTab.tsx — 운영 현황 탭
src/components/admin/AnalyticsTab.tsx  — 정산 분석 탭
src/components/admin/AdminKpiCards.tsx  — KPI 카드 4개 (증감 표시 포함)
src/components/admin/TodoAlerts.tsx    — 할 일 알림
src/components/admin/CsoShareChart.tsx — CSO별 수수료 비중 도넛 차트
src/components/admin/EmailStatsChart.tsx — 이메일 발송 현황 차트
```

기존 유지:
- `MonthlyStatsChart` — 그대로 재사용
- `quickActions` 배열 + `badgeMap` — 운영 탭으로 이동

### 데이터 흐름

```
page.tsx (공유 상태)
├── selectedMonth, months, allUsers, systemStatus (기존)
├── 탭 상태: useState<'operations' | 'analytics'>
│
├── OperationsTab
│   ├── AdminKpiCards (months, selectedMonth, accessedCount, emailStats)
│   ├── TodoAlerts (pendingCount, unmappedCount, currentMonthUploaded, emailStats)
│   ├── QuickActions (quickActions, badgeMap)
│   └── SystemFooter (systemStatus)
│
└── AnalyticsTab
    ├── MonthlyStatsChart (enrichedChartData) — 기존 재사용
    ├── DeltaCards (selectedMonth vs 전월)
    ├── CsoShareChart (months[selected] 기반 CSO별 수수료)
    └── EmailStatsChart (emailMonthlyStats)
```

### 신규 API

없음. 기존 API만 사용.

CSO별 수수료 비중은 `/api/settlements/stats`의 months 데이터에서 계산 불가 — CSO별 분리가 안 되어 있음. 두 가지 옵션:
1. `/api/settlements/cso-companies` + 개별 조회 (N+1 문제)
2. 신규 API `/api/settlements/cso-summary?month=YYYY-MM` 추가

→ 옵션 2 선택: 신규 API 1개 추가 (`cso-summary`)

### 디자인 토큰

기존 `.interface-design/system.md` 패턴 유지:
- KPI 카드: `glass-kpi-card`
- 차트 컨테이너: `glass-chart-card`
- 증감 표시: `text-success` / `text-destructive`
- 탭: shadcn/ui `Tabs` 컴포넌트

## 작업 범위

1. `page.tsx` 리팩토링 — 탭 컨테이너로 전환
2. `OperationsTab` — KPI 카드 + 할 일 알림 + 빠른 작업 + 시스템 상태
3. `AnalyticsTab` — 차트 + 증감 + CSO 비중 + 이메일 추이
4. `AdminKpiCards` — 전월 대비 증감 로직 포함
5. `CsoShareChart` — 도넛 차트 (recharts PieChart)
6. `EmailStatsChart` — 이메일 월별 BarChart
7. `/api/settlements/cso-summary` — CSO별 수수료 합계 API (선택)

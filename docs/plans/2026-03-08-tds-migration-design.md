# csoweb 토스 디자인 시스템 마이그레이션 설계

## 개요

csoweb의 기존 Glass-like 디자인 시스템을 토스 디자인 시스템(TDS) 기반으로 전면 교체한다.

## 범위

- **대상**: 로그인 페이지 제외 전체 UI
- **유지**: 로그인 Liquid Glass (`.login-glass-bg`, `.glass-card`, `.glass-button` 등 전부)
- **제거**: 대시보드 glass 클래스 (`.glass-kpi-card`, `.glass-chart-card`, `.glass-action-card`, `.glass-icon`, `.dashboard-status-dot-*`)

## 설계 결정 (승인됨)

| 항목 | 결정 | 이유 |
|------|------|------|
| 깊이 표현 | Glass → 토스 Elevation 전면 교체 | 일관성, 로그인만 예외 |
| 폰트 | Inter → Pretendard Variable (CDN) | 한글+영문 일관성, tabular-nums 우수 |
| 색상 포맷 | HEX → HSL 변환, shadcn 패턴 유지 | shadcn/ui 24개 컴포넌트 수정 불필요 |
| Radius | 단일 → 4단계 (8/12/16/20px) | 카드/버튼/모달 시각적 구분 |

---

## 1. 색상 토큰 (HEX → HSL)

### 시맨틱 매핑

| CSS 변수 | Light (토스 HEX) | Light (HSL) | Dark (토스 HEX) | Dark (HSL) |
|----------|-----------------|-------------|-----------------|------------|
| --background | #F2F4F6 | 210 20% 96% | #101012 | 240 10% 7% |
| --foreground | #191F28 | 215 25% 13% | #F9FAFB | 210 20% 98% |
| --card | #FFFFFF | 0 0% 100% | #17171C | 240 8% 10% |
| --card-foreground | #191F28 | 215 25% 13% | #F9FAFB | 210 20% 98% |
| --popover | #FFFFFF | 0 0% 100% | #17171C | 240 8% 10% |
| --popover-foreground | #191F28 | 215 25% 13% | #F9FAFB | 210 20% 98% |
| --primary | #3182F6 | 216 91% 58% | #4891FF | 216 100% 65% |
| --primary-foreground | #FFFFFF | 0 0% 100% | #FFFFFF | 0 0% 100% |
| --secondary | #F2F4F6 | 210 20% 96% | #1E1E24 | 240 11% 13% |
| --secondary-foreground | #4E5968 | 213 12% 33% | #ADB5BD | 210 9% 71% |
| --muted | #F9FAFB | 210 20% 98% | #1E1E24 | 240 11% 13% |
| --muted-foreground | #8B95A1 | 213 10% 59% | #6B7684 | 213 10% 47% |
| --accent | #E8F3FF | 212 100% 95% | #17171C | 240 8% 10% |
| --accent-foreground | #1B64DA | 216 79% 48% | #4891FF | 216 100% 65% |
| --destructive | #F04452 | 355 86% 60% | #FF6B6B | 0 100% 71% |
| --destructive-foreground | #FFFFFF | 0 0% 100% | #FFFFFF | 0 0% 100% |
| --success | #03B26C | 157 97% 36% | #2DE58F | 153 76% 54% |
| --success-foreground | #FFFFFF | 0 0% 100% | #FFFFFF | 0 0% 100% |
| --warning | #FE9800 | 36 100% 50% | #FFB74D | 33 100% 65% |
| --warning-foreground | #191F28 | 215 25% 13% | #191F28 | 215 25% 13% |
| --border | #E5E8EB | 210 14% 91% | #2C2C34 | 240 8% 19% |
| --input | #D1D6DB | 210 10% 84% | #3A3A44 | 240 8% 25% |
| --ring | #3182F6 | 216 91% 58% | #4891FF | 216 100% 65% |

### 차트 8색 (기존 5색 → 8색 확장)

| # | Light HEX | Light HSL | Dark HEX | Dark HSL |
|---|-----------|-----------|----------|----------|
| 1 | #3182F6 | 216 91% 58% | #4891FF | 216 100% 65% |
| 2 | #F04452 | 355 86% 60% | #FF6B6B | 0 100% 71% |
| 3 | #03B26C | 157 97% 36% | #2DE58F | 153 76% 54% |
| 4 | #FE9800 | 36 100% 50% | #FFB74D | 33 100% 65% |
| 5 | #A234C7 | 281 55% 49% | #C770E4 | 281 65% 67% |
| 6 | #18A5A5 | 180 75% 37% | #58C7C7 | 180 52% 56% |
| 7 | #1B64DA | 216 79% 48% | #64A8FF | 216 100% 70% |
| 8 | #E45600 | 23 100% 45% | #FF8A50 | 19 100% 66% |

---

## 2. 폰트

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.min.css');

font-family: 'Pretendard Variable', Pretendard, system-ui, -apple-system, sans-serif;
```

| Scale | Size | Weight | Line-height | Letter-spacing |
|-------|------|--------|-------------|----------------|
| Display | 32px | 700 | 1.3 | -0.03em |
| Headline | 20px | 700 | 1.4 | -0.02em |
| Body | 15px | 400 | 1.6 | -0.01em |
| Caption | 13px | 400 | 1.5 | -0.005em |
| Label | 11px | 600 | 1.2 | +0.02em |

숫자 정렬: `font-variant-numeric: tabular-nums`
한글: `word-break: keep-all`

---

## 3. Elevation (Glass 대체)

### CSS 클래스

| 클래스 | Light | Dark | 용도 |
|--------|-------|------|------|
| `.elevation-xs` | `0 1px 2px rgba(0,0,0,0.04)` | `0 0 0 1px rgba(255,255,255,0.04)` | 뱃지, 칩 |
| `.elevation-sm` | `0 2px 8px rgba(0,0,0,0.08)` | `0 0 0 1px rgba(255,255,255,0.06)` | 카드 기본 |
| `.elevation-md` | `0 4px 16px rgba(0,0,0,0.08)` | `0 2px 8px rgba(0,0,0,0.4)` | 카드 hover |
| `.elevation-lg` | `0 8px 32px rgba(0,0,0,0.12)` | `0 4px 16px rgba(0,0,0,0.5)` | 모달 |
| `.elevation-xl` | `0 16px 48px rgba(0,0,0,0.16)` | `0 8px 32px rgba(0,0,0,0.6)` | 시트 |

### 카드 컴포넌트 클래스

| 클래스 | 동작 |
|--------|------|
| `.tds-card` | `elevation-sm` + `radius-lg` + hover → `elevation-md` + `translateY(-2px)` |
| `.tds-card-interactive` | `elevation-sm` + hover → `elevation-md` + `translateY(-3px) scale(1.02)` + active → `scale(0.98)` |
| `.tds-icon` | 2.5rem 원형 컨테이너 (기존 glass-icon과 동일 크기) |
| `.tds-icon-{color}` | 7색: blue, green, cyan, purple, orange, pink, teal (토스 팔레트) |
| `.tds-dot-ok` | 3px 원, success 색상 |
| `.tds-dot-fail` | 3px 원, destructive 색상 |

### 기존 → 신규 매핑

| 기존 | 신규 |
|------|------|
| `glass-kpi-card` | `tds-card` |
| `glass-chart-card` | `tds-card` |
| `glass-action-card` | `tds-card-interactive` |
| `glass-icon` | `tds-icon` |
| `glass-icon-{color}` | `tds-icon-{color}` |
| `dashboard-status-dot-ok` | `tds-dot-ok` |
| `dashboard-status-dot-fail` | `tds-dot-fail` |

---

## 4. Radius

```css
--radius-sm: 8px;   /* chip, badge */
--radius-md: 12px;  /* button */
--radius-lg: 16px;  /* card */
--radius-xl: 20px;  /* modal, dialog */
```

### shadcn/ui 매핑

| shadcn 변수 | 매핑 |
|-------------|------|
| `--radius` (기존) | 제거, 아래로 교체 |
| tailwind `radius.lg` | `var(--radius-lg)` (card) |
| tailwind `radius.md` | `var(--radius-md)` (button) |
| tailwind `radius.sm` | `var(--radius-sm)` (chip) |
| tailwind `radius.xl` | `var(--radius-xl)` (modal) |

---

## 5. Motion

```css
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 350ms;
--easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--easing-ease: cubic-bezier(0.22, 0.68, 0, 1);
```

---

## 6. 원본 토스 팔레트 (참조용)

### Grey
50: #F9FAFB, 100: #F2F4F6, 200: #E5E8EB, 300: #D1D6DB, 400: #B0B8C1, 500: #8B95A1, 600: #6B7684, 700: #4E5968, 800: #333D4B, 900: #191F28

### Blue
50: #E8F3FF, 100: #C9E2FF, 200: #90C2FF, 300: #64A8FF, 400: #4593FC, 500: #3182F6, 600: #2272EB, 700: #1B64DA, 800: #1957C2, 900: #194AA6

### Red
50: #FFEEEE, 100: #FFD4D6, 200: #FEAFB4, 300: #FB8890, 400: #F66570, 500: #F04452, 600: #E42939, 700: #D22030, 800: #BC1B2A, 900: #A51926

### Green
50: #F0FAF6, 100: #AEEFD5, 200: #76E4B8, 300: #3FD599, 400: #15C47E, 500: #03B26C, 600: #02A262, 700: #029359, 800: #028450, 900: #027648

### Orange
50: #FFF3E0, 100: #FFE0B0, 200: #FFCD80, 300: #FFBD51, 400: #FFA927, 500: #FE9800, 600: #FB8800, 700: #F57800, 800: #ED6700, 900: #E45600

### Purple
50: #F9F0FC, 100: #EDCCF8, 200: #DA9BEF, 300: #C770E4, 400: #B44BD7, 500: #A234C7, 600: #9128B4, 700: #8222A2, 800: #73228E, 900: #65237B

### Teal
50: #EDF8F8, 100: #BCE9E9, 200: #89D8D8, 300: #58C7C7, 400: #30B6B6, 500: #18A5A5, 600: #109595, 700: #0C8585, 800: #097575, 900: #076565

# csoweb 디자인 시스템 — TDS (토스 기반)

> **v0.38.0** — Glass-like → TDS(토스 디자인 시스템) 전면 교체. 로그인만 Liquid Glass 유지.

## 색상 토큰

### 시맨틱 토큰 (CSS 변수)

| 토큰 | Light | Dark | 용도 |
|------|-------|------|------|
| `--background` | 210 20% 96% | 240 10% 7% | 페이지 배경 |
| `--foreground` | 215 25% 13% | 210 20% 98% | 본문 텍스트 |
| `--card` | 0 0% 100% | 240 8% 10% | 카드 배경 |
| `--primary` | 216 91% 58% | 216 100% 65% | 주 액션 (토스 Blue 500/400) |
| `--secondary` | 210 20% 96% | 240 11% 13% | 보조 배경 |
| `--muted` | 210 20% 98% | 240 11% 13% | 비활성 배경 |
| `--accent` | 212 100% 95% | 240 8% 10% | 강조 배경 |
| `--destructive` | 355 86% 60% | 0 100% 71% | 삭제/에러 |
| `--success` | 157 97% 36% | 153 76% 54% | 성공 |
| `--warning` | 36 100% 50% | 33 100% 65% | 경고 |
| `--border` | 210 14% 91% | 240 8% 19% | 테두리 |
| `--input` | 210 10% 84% | 240 8% 25% | 입력 필드 테두리 |
| `--ring` | 216 91% 58% | 216 100% 65% | 포커스 링 |

### 사용 규칙

- Tailwind: `text-primary`, `bg-muted`, `border-border` (시맨틱 변수만)
- **금지**: `text-blue-500`, `bg-gray-100` 등 기본 팔레트 직접 사용
- **금지**: `p-[13px]`, `text-[#333]` 등 Arbitrary values
- **금지**: `style={{ color: '#fff' }}` 인라인 CSS 색상

### 상태별 색상 패턴

| 상태 | 배경 | 텍스트 | 테두리 |
|------|------|--------|--------|
| 성공 | `bg-success/10` | `text-success` | `border-success/30` |
| 경고 | `bg-warning/10` | `text-warning` | `border-warning/30` |
| 에러 | `bg-destructive/10` | `text-destructive` | `border-destructive/30` |
| 정보 | `bg-primary/10` | `text-primary` | `border-primary/30` |
| 중립 | `bg-muted` | `text-muted-foreground` | `border-border` |

## Elevation (깊이 5단계)

| 단계 | Light | Dark | 용도 |
|------|-------|------|------|
| xs | `0 1px 2px rgba(0,0,0,0.04)` | `0 0 0 1px rgba(255,255,255,0.04)` | 뱃지, 칩 |
| sm | `0 2px 8px rgba(0,0,0,0.08)` | `0 0 0 1px rgba(255,255,255,0.06)` | 카드 기본 |
| md | `0 4px 16px rgba(0,0,0,0.08)` | `0 2px 8px rgba(0,0,0,0.4)` | 카드 hover |
| lg | `0 8px 32px rgba(0,0,0,0.12)` | `0 4px 16px rgba(0,0,0,0.5)` | 모달 |
| xl | `0 16px 48px rgba(0,0,0,0.16)` | `0 8px 32px rgba(0,0,0,0.6)` | 시트 |

CSS 변수: `var(--elevation-sm)` 등. 다크모드 자동 전환.

## Radius (4단계)

| 단계 | 값 | Tailwind | 용도 |
|------|-----|---------|------|
| sm | 8px | `rounded-sm` | 뱃지, 칩, 메뉴 아이템 |
| md | 12px | `rounded-md` | 버튼, 입력 필드, 셀렉트 |
| lg | 16px | `rounded-lg` | 카드, 알림 |
| xl | 20px | `rounded-xl` | 모달, 다이얼로그 |

## Typography

- **폰트**: Pretendard Variable (CDN)
- **폴백**: system-ui, -apple-system, sans-serif
- `letter-spacing: -0.01em`, `word-break: keep-all`
- 숫자: `font-variant-numeric: tabular-nums` (정산 테이블)

## Motion

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--duration-fast` | 150ms | 호버, 포커스 |
| `--duration-normal` | 250ms | 카드 전환 |
| `--duration-slow` | 350ms | 모달 진입 |
| `--easing-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 바운스 효과 |
| `--easing-ease` | `cubic-bezier(0.22, 0.68, 0, 1)` | 부드러운 전환 |

## 차트 8색

| # | Light | Dark | 용도 |
|---|-------|------|------|
| 1 | Blue 500 (#3182F6) | Blue 400 (#4891FF) | 기본/매출 |
| 2 | Red 500 (#F04452) | Red 300 (#FF6B6B) | 비교/비용 |
| 3 | Green 500 (#03B26C) | Green 300 (#2DE58F) | 성장/이익 |
| 4 | Orange 500 (#FE9800) | Orange 300 (#FFB74D) | 경고/주의 |
| 5 | Purple 500 (#A234C7) | Purple 300 (#C770E4) | 보조 1 |
| 6 | Teal 500 (#18A5A5) | Teal 300 (#58C7C7) | 보조 2 |
| 7 | Blue 700 (#1B64DA) | Blue 300 (#64A8FF) | 보조 3 |
| 8 | Orange 900 (#E45600) | Orange 400 (#FF8A50) | 보조 4 |

Tailwind: `text-chart-1` ~ `text-chart-8`

## TDS 컴포넌트 클래스

| 클래스 | 동작 |
|--------|------|
| `.tds-card` | elevation-sm + radius-lg, hover → elevation-md + translateY(-2px) |
| `.tds-card-interactive` | tds-card + 클릭 가능, hover → scale(1.02), active → scale(0.98) |
| `.tds-icon` | 2.5rem 원형 컨테이너 |
| `.tds-icon-{color}` | 7색: blue, green, cyan, purple, orange, pink, teal |
| `.tds-dot-ok` | success 색상 상태 dot (0.375rem) |
| `.tds-dot-fail` | destructive 색상 상태 dot (0.375rem) |

## 로그인 — Liquid Glass (별도 유지)

로그인 페이지만 Liquid Glass 스타일 유지. 나머지 페이지에서 사용 금지.

- `.login-glass-bg` — 메시 그래디언트 배경 + 오브
- `.glass-card` — 프로스트 유리 카드 (backdrop-filter)
- `.glass-button` — 유리 효과 버튼
- `.login-glass-*` — 로그인 전용 타이포, 폼, 링크, 푸터

## 파일 위치

| 파일 | 역할 |
|------|------|
| `src/app/globals.css` | CSS 변수 + TDS/Glass 클래스 정의 |
| `tailwind.config.ts` | 시맨틱 색상 매핑 + radius + chart 확장 |
| `src/app/layout.tsx` | Pretendard CDN link |

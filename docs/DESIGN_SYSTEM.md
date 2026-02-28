# Design System

CSO 정산 포털 디자인 토큰 및 색상 시스템 정의.

## 색상 토큰

### 기본 토큰 (shadcn/ui 기본)

| 토큰 | CSS 변수 | Tailwind 클래스 | 용도 |
|------|----------|----------------|------|
| background | `--background` | `bg-background` | 페이지 배경 |
| foreground | `--foreground` | `text-foreground` | 기본 텍스트 |
| primary | `--primary` | `bg-primary`, `text-primary` | 주요 액션, 링크, 정보 강조 |
| secondary | `--secondary` | `bg-secondary` | 보조 요소 |
| muted | `--muted` | `bg-muted`, `text-muted-foreground` | 비활성, 중립 배경, auth 페이지 배경 |
| accent | `--accent` | `bg-accent` | 강조 요소 |
| destructive | `--destructive` | `bg-destructive`, `text-destructive` | 에러, 삭제, 위험 |
| border | `--border` | `border-border` | 테두리 |
| card | `--card` | `bg-card` | 카드 배경 |

### 확장 토큰 (v0.25.1 추가)

| 토큰 | CSS 변수 | Light 값 (HSL) | Dark 값 (HSL) | 용도 |
|------|----------|----------------|---------------|------|
| success | `--success` | `142 76% 36%` | `142 71% 45%` | 성공, 완료, 활성 상태 |
| success-foreground | `--success-foreground` | `0 0% 100%` | `0 0% 100%` | success 위 텍스트 |
| warning | `--warning` | `38 92% 50%` | `45 93% 47%` | 경고, 주의, 휴업 상태 |
| warning-foreground | `--warning-foreground` | `0 0% 100%` | `0 0% 100%` | warning 위 텍스트 |

## 색상 사용 규칙

### 상태별 패턴

| 상태 | 배경 | 텍스트 | 테두리 |
|------|------|--------|--------|
| 성공 | `bg-success/10` | `text-success` | `border-success/20` |
| 경고 | `bg-warning/10` | `text-warning` | `border-warning/20` |
| 에러 | `bg-destructive/10` | `text-destructive` | `border-destructive/20` |
| 정보 | `bg-primary/10` | `text-primary` | `border-primary/20` |
| 중립 | `bg-muted` | `text-muted-foreground` | `border-border` |

### 금지 사항

- Tailwind 기본 팔레트 직접 사용 금지 (`text-blue-500`, `bg-gray-100` 등)
- Arbitrary values 금지 (`text-[10px]`, `p-[13px]`, `shadow-[...]` 등)
- 인라인 CSS 색상 금지 (`style={{ color: '#fff' }}`)

### auth 페이지 배경

- **로그인**: Liquid Glass — `.login-glass-bg` (animated mesh gradient + frosted glass card). 테마 독립적 다크 그래디언트 배경.
- **기타 auth 페이지** (회원가입, 비밀번호 찾기): `bg-muted`

### Liquid Glass 토큰

#### 공통 CSS 변수

| 변수 | 값 | 용도 |
|------|-----|------|
| `--glass-bg` | `oklch(1 0 0 / 75%)` | 글래스 카드 배경 |
| `--glass-bg-hover` | `oklch(1 0 0 / 80%)` | 호버 시 카드 배경 |
| `--glass-bg-action` | `oklch(1 0 0 / 70%)` | 액션 카드 배경 (약간 더 투명) |
| `--glass-border` | `oklch(0 0 0 / 8%)` | 기본 글래스 테두리 |
| `--glass-border-light` | `oklch(0 0 0 / 6%)` | 연한 글래스 테두리 |
| `--glass-radius` | `1.25rem` | 글래스 카드 radius |
| `--glass-blur` | `20px` | Backdrop blur |
| `--glass-saturate` | `180%` | Backdrop saturate |
| `--glass-shadow` | `0 8px 32px oklch(0 0 0 / 8%)` | 카드 외부 그림자 |
| `--glass-shadow-inset` | `inset 0 1px 0 oklch(1 0 0 / 50%)` | 내부 상단 하이라이트 |
| `--glass-easing` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Spring easing |
| `--glass-duration` | `200ms` | 트랜지션 시간 |
| `--glass-gradient` | `linear-gradient(135deg, ...)` | 배경 그래디언트 |

#### 로그인 전용

| 클래스 | 용도 |
|--------|------|
| `.login-glass-bg` | 메시 그래디언트 배경 컨테이너 |
| `.login-orb-{1,2,3}` | 떠다니는 그래디언트 오브 (Teal/Violet/Green-Teal) |
| `.glass-card` | Frosted glass 카드 (`backdrop-filter: blur(20px)`) |
| `.glass-button` | 3D 유리 버튼 (hover scale + spring easing) |
| `.login-icon-glow` | 아이콘 네온 글로우 + pulse 애니메이션 |
| `.login-glass-footer` | 반투명 유리 푸터 |

#### 대시보드 전용 (v0.28.1 — Glass-like 카드/버튼)

배경은 흰색(`bg-background`) 유지. `backdrop-filter` 대신 멀티레이어 소프트 쉐도우 + 인셋 하이라이트 + oklch 컬러 아이콘으로 Glass-like 시각 품질 확보.

**CSS 변수** (`:root`)

| 변수 | 값 | 용도 |
|------|-----|------|
| `--glass-border` | `oklch(0 0 0 / 8%)` | 카드 테두리 |
| `--glass-radius` | `1.25rem` | 카드 border-radius |
| `--glass-shadow` | 멀티레이어 소프트 쉐도우 | 카드 기본 그림자 |
| `--glass-shadow-hover` | 확대 소프트 쉐도우 | 호버 시 그림자 |
| `--glass-shadow-inset` | `inset 0 1px 0 oklch(1 0 0 / 70%)` | 상단 인셋 하이라이트 |
| `--glass-easing` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Spring easing |
| `--glass-duration` | `200ms` | 트랜지션 시간 |

**클래스**

| 클래스 | 용도 |
|--------|------|
| `.glass-kpi-card` | KPI 카드 — 소프트 쉐도우 + 인셋 하이라이트 + hover translateY(-2px) |
| `.glass-action-card` | Quick Action 카드 — hover translateY(-3px) scale(1.02) + active press |
| `.glass-icon` | 아이콘 글로우 컨테이너 (2.5rem 원형, Quick Action 전용) |
| `.glass-icon-{color}` | 아이콘 hue 7색 — blue/green/cyan/purple/orange/pink/teal (oklch) |
| `.dashboard-status-dot-ok` | 상태 dot 정상 — oklch green + box-shadow glow |
| `.dashboard-status-dot-fail` | 상태 dot 실패 — oklch red + box-shadow glow |

**KPI 아이콘**: `.glass-icon` 래핑 없이 `h-4 w-4 glass-icon-{color}` 색상만 적용.
**Quick Action 아이콘**: `.glass-icon glass-icon-{color}` 원형 배경 + 글로우 + `h-5 w-5` 아이콘.

`prefers-reduced-motion: reduce` 시 hover lift/scale 비활성화.

## 파일 위치

- CSS 변수 정의: `src/app/globals.css`
- Tailwind 매핑: `tailwind.config.ts`

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

- 통일: `bg-muted` (이전: `bg-gradient-to-br from-blue-50 to-indigo-100`)

## 파일 위치

- CSS 변수 정의: `src/app/globals.css`
- Tailwind 매핑: `tailwind.config.ts`

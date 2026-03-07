# Interface Design System — csoweb

## Direction
전문 B2B 제약 CSO 정산 도구. 정돈, 신뢰, 전문성.
정산 담당자가 월별 수수료를 빠르게 확인·검증·다운로드하는 전문 도구.
숫자는 정돈되고, 계층 구조가 한눈에 파악 가능해야 한다.

## Depth Strategy
Glass-like soft shadow — admin 대시보드와 동일.
`backdrop-filter` 대신 멀티레이어 소프트 쉐도우 + 인셋 하이라이트로 구현.
CSS 변수: `--glass-shadow`, `--glass-shadow-hover`, `--glass-shadow-inset`.

## Spacing
4px base (Tailwind 기본). 섹션 간격: `space-y-6`.

## Colors
DESIGN_SYSTEM.md 토큰만 사용. Tailwind 기본 팔레트 직접 사용 금지.
- 성공: `bg-success/10 text-success border-success/20`
- 경고: `bg-warning/10 text-warning border-warning/20`
- 에러: `bg-destructive/10 text-destructive border-destructive/20`
- 정보/강조: `bg-primary/10 text-primary border-primary/20`
- 중립: `bg-muted text-muted-foreground border-border`

## Typography
시스템 폰트 유지. 숫자: `font-mono tabular-nums text-right`.

## Key Component Patterns

### KPI/Summary Cards
`glass-kpi-card` 클래스 적용. 강조 카드는 `border-primary/20` 추가.
아이콘: `glass-icon-{color}` 색상만 (원형 배경 없이 `h-4 w-4`).

### Data Tables
shadcn/ui `Table` 컴포넌트 사용. HTML table 직접 사용 금지.
- 헤더: `sticky top-0 bg-muted z-10`
- 숫자 셀: `text-right font-mono tabular-nums`
- 소계 행: `bg-muted font-medium` + `text-muted-foreground` 라벨 + `text-primary` 수수료
- 총합계 행: `bg-primary/5 font-bold border-b-2 border-primary/20` + `text-primary` 라벨

### Notice Card
`border-warning/20 bg-warning/10` + `text-warning` 제목 + `text-foreground` 본문.

### Status Cards (에러/빈 상태)
- 인증 오류: `destructive` 토큰
- 네트워크 오류: `muted` 토큰
- 정산서 미업로드: `primary` 토큰
- CSO 매칭 없음: `warning` 토큰

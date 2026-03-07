# csoweb 인터페이스 디자인 시스템

## Direction

B2B 제약 CSO 정산 도구 — 정돈, 신뢰, 전문성.
토스 디자인 시스템(TDS) 기반: Elevation + Pretendard + 토스 팔레트.

## Depth Strategy — TDS Elevation

Elevation 5단계로 깊이 표현. CSS 변수 `var(--elevation-sm)` 등 사용.
다크모드 자동 전환 (CSS 변수 `.dark` 오버라이드).

| 용도 | Elevation | 예시 |
|------|-----------|------|
| 카드 기본 | sm | KPI 카드, 차트 카드 |
| 카드 hover | md | 마우스 오버 시 |
| 모달/다이얼로그 | lg | Dialog, AlertDialog |
| 시트/오버레이 | xl | Sheet, Drawer |

## Spacing

- Base: 4px
- 섹션 간격: `space-y-6`
- 카드 내부: `p-4` ~ `py-5 px-6`
- 컴포넌트 간: `gap-4` ~ `gap-6`

## Colors

`docs/DESIGN_SYSTEM.md`의 시맨틱 토큰만 사용. 기본 팔레트/Arbitrary values 금지.

## Typography

- 폰트: Pretendard Variable (CDN, layout.tsx link)
- 숫자 열: `font-mono tabular-nums text-right`
- 한글: `word-break: keep-all` (globals.css body)
- 금액: `toLocaleString('ko-KR')` 포맷

## 주요 컴포넌트 패턴

### KPI/Summary Cards

```tsx
<div className="tds-card py-5 px-6">
  <div className="tds-icon tds-icon-blue"><Icon /></div>
  <p className="text-2xl font-bold">{value}</p>
  <p className="text-sm text-muted-foreground">{label}</p>
</div>
```

- 아이콘 색상: `tds-icon-{blue|green|cyan|purple|orange|pink|teal}`
- 강조 카드: `tds-card border-primary/20` 추가

### Chart Cards

```tsx
<div className="tds-card">
  <h3>차트 제목</h3>
  <ChartContainer>...</ChartContainer>
</div>
```

### Interactive Cards (Quick Action)

```tsx
<div className="tds-card-interactive">
  <div className="tds-icon tds-icon-blue"><Icon /></div>
  <span>라벨</span>
</div>
```

### Data Tables

- shadcn/ui `<Table>` 사용 (HTML table 금지)
- 헤더: `sticky top-0 bg-muted`
- 숫자 열: `text-right font-mono tabular-nums`
- 정렬: 클릭 가능한 헤더

### Notice Card

- `bg-warning/10 border-warning/30` 배경
- 아이콘: `text-warning`

### Status Indicators

- 상태 dot: `tds-dot-ok` (성공), `tds-dot-fail` (실패)
- 매칭 상태 뱃지: `bg-success/10 text-success` 등

## 로그인 페이지 (Liquid Glass — 별도)

로그인만 Glass 스타일. `.login-glass-bg`, `.glass-card`, `.glass-button` 등.
다른 페이지에서 Glass 클래스 사용 금지.

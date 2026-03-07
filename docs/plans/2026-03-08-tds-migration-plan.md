# 토스 디자인 시스템 마이그레이션 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** csoweb의 Glass 디자인 시스템을 토스 디자인 시스템(TDS)으로 전면 교체한다. 로그인 페이지는 기존 Liquid Glass 유지.

**Design Doc:** `docs/plans/2026-03-08-tds-migration-design.md`

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, Pretendard Variable

---

## Task 1: CSS 변수 + 폰트 교체

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: globals.css — :root CSS 변수 교체**

`:root` 블록의 기존 HSL 값을 디자인 문서의 토스 Light 값으로 교체.
`.dark` 블록도 토스 Dark 값으로 교체.

추가할 새 변수:
```css
/* Radius 4단계 */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;

/* Motion */
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 350ms;
--easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--easing-ease: cubic-bezier(0.22, 0.68, 0, 1);

/* Elevation */
--elevation-xs: 0 1px 2px rgba(0,0,0,0.04);
--elevation-sm: 0 2px 8px rgba(0,0,0,0.08);
--elevation-md: 0 4px 16px rgba(0,0,0,0.08);
--elevation-lg: 0 8px 32px rgba(0,0,0,0.12);
--elevation-xl: 0 16px 48px rgba(0,0,0,0.16);

/* 차트 8색 */
--chart-1 ~ --chart-8
```

`.dark` 블록에 다크 elevation 값도 추가.

**주의**: 로그인 전용 클래스 (`.login-glass-bg`, `.glass-card`, `.glass-button`, `.login-icon-glow`, `.login-glass-*`, keyframes `login-float-*`) 는 **절대 삭제하지 않는다**.

**Step 2: globals.css — glass 대시보드 클래스 → tds 클래스 교체**

삭제 대상 (대시보드 glass 클래스 전부):
- `.glass-kpi-card`, `.glass-chart-card`, `.glass-action-card`
- `.glass-icon`, `.glass-icon-blue` ~ `.glass-icon-teal`
- `.dashboard-status-dot-ok`, `.dashboard-status-dot-fail`
- glass 관련 CSS 변수: `--glass-border`, `--glass-radius`, `--glass-shadow`, `--glass-shadow-hover`, `--glass-shadow-inset`, `--glass-easing`, `--glass-duration`

추가 대상 (tds 클래스):
```css
/* TDS 카드 */
.tds-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-sm);
  transition: box-shadow var(--duration-normal) var(--easing-ease),
              transform var(--duration-normal) var(--easing-ease);
  padding: 1rem;
}
.tds-card:hover {
  box-shadow: var(--elevation-md);
  transform: translateY(-2px);
}

/* TDS 인터랙티브 카드 */
.tds-card-interactive {
  /* tds-card 기본 + */
  cursor: pointer;
}
.tds-card-interactive:hover {
  box-shadow: var(--elevation-md);
  transform: translateY(-3px) scale(1.02);
}
.tds-card-interactive:active {
  transform: scale(0.98);
  box-shadow: var(--elevation-xs);
}

/* TDS 아이콘 */
.tds-icon { /* 2.5rem 원형 컨테이너 */ }
.tds-icon-blue ~ .tds-icon-teal { /* 토스 팔레트 기반 */ }

/* TDS 상태 dot */
.tds-dot-ok { /* success 색상 */ }
.tds-dot-fail { /* destructive 색상 */ }
```

**Step 3: layout.tsx — 폰트 교체**

```typescript
// 변경 전
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });
// body className={inter.className}

// 변경 후
// Inter 삭제, globals.css에 Pretendard CDN import 추가
// body className에서 inter.className 제거, 대신 globals.css font-family 적용
```

globals.css 상단에 추가:
```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.min.css');
```

body 기본 스타일에 추가:
```css
body {
  font-family: 'Pretendard Variable', Pretendard, system-ui, -apple-system, sans-serif;
  letter-spacing: -0.01em;
  word-break: keep-all;
}
```

**Step 4: 빌드 확인**

Run: `npm run build`
Expected: 성공 (이 시점에서 glass 클래스를 참조하는 컴포넌트에서 스타일이 깨지지만 빌드는 통과)

**Step 5: 커밋**

```
feat: TDS 토큰 교체 — 토스 색상/폰트/elevation/radius CSS 변수 적용
```

---

## Task 2: tailwind.config.ts 업데이트

**Files:**
- Modify: `tailwind.config.ts`

**Step 1: radius 4단계 교체**

```typescript
// 변경 전
borderRadius: {
  lg: 'var(--radius)',
  md: 'calc(var(--radius) - 2px)',
  sm: 'calc(var(--radius) - 4px)',
}

// 변경 후
borderRadius: {
  xl: 'var(--radius-xl)',
  lg: 'var(--radius-lg)',
  md: 'var(--radius-md)',
  sm: 'var(--radius-sm)',
}
```

**Step 2: 차트 색상 8색 확장**

기존 5색을 8색으로 확장. tailwind.config의 colors.chart 또는 CSS 변수 참조.

**Step 3: 타입 체크**

Run: `npx tsc --noEmit`

**Step 4: 커밋**

```
feat: tailwind radius 4단계 + 차트 8색 확장
```

---

## Task 3: 컴포넌트 클래스명 일괄 치환

**Files:**
- Modify: ~24개 파일 (glass 클래스 사용 파일)

**Step 1: 일괄 치환 목록**

전체 `src/` 디렉토리에서 아래 치환을 수행한다. `src/app/(auth)/login/` 하위 파일은 **제외**.

| 검색 | 치환 |
|------|------|
| `glass-kpi-card` | `tds-card` |
| `glass-chart-card` | `tds-card` |
| `glass-action-card` | `tds-card-interactive` |
| `glass-icon-blue` | `tds-icon-blue` |
| `glass-icon-green` | `tds-icon-green` |
| `glass-icon-cyan` | `tds-icon-cyan` |
| `glass-icon-purple` | `tds-icon-purple` |
| `glass-icon-orange` | `tds-icon-orange` |
| `glass-icon-pink` | `tds-icon-pink` |
| `glass-icon-teal` | `tds-icon-teal` |
| `glass-icon` (단독, 색상 접미사 없는 것) | `tds-icon` |
| `dashboard-status-dot-ok` | `tds-dot-ok` |
| `dashboard-status-dot-fail` | `tds-dot-fail` |

**Step 2: 로그인 파일 확인**

`src/app/(auth)/login/page.tsx`와 `src/components/auth/LoginFooter.tsx`에서 `.login-glass-*`, `.glass-card`, `.glass-button` 등이 **변경되지 않았는지** 확인.

**Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공, 스타일 정상 적용

**Step 4: 커밋**

```
refactor: glass-* → tds-* 클래스명 일괄 치환
```

---

## Task 4: shadcn/ui 컴포넌트 radius 업데이트

**Files:**
- Modify: `src/components/ui/` 하위 파일 중 radius 관련

**Step 1: 변경이 필요한 컴포넌트 확인**

shadcn/ui 컴포넌트 24개에서 `rounded-lg`, `rounded-md`, `rounded-sm` 사용 현황 확인.
tailwind.config에서 radius 값을 변경했으므로, 기존 `rounded-lg` = 0.5rem이던 것이 16px로 바뀜.

대부분 자동으로 적용되지만, 하드코딩된 radius가 있으면 수정:
- `dialog.tsx` → `rounded-xl` (모달은 20px)
- `sheet.tsx` → `rounded-xl`
- `card.tsx` → `rounded-lg` (카드 16px) — 이미 맞음
- `button.tsx` → `rounded-md` (버튼 12px) — 확인 필요
- `badge.tsx` → `rounded-sm` (뱃지 8px) — 확인 필요

**Step 2: 빌드 확인**

Run: `npm run build`

**Step 3: 커밋**

```
refactor: shadcn/ui 컴포넌트 radius 토스 4단계 적용
```

---

## Task 5: 문서 업데이트

**Files:**
- Modify: `docs/DESIGN_SYSTEM.md`
- Modify: `.interface-design/system.md`

**Step 1: DESIGN_SYSTEM.md 전면 재작성**

토스 기반 디자인 시스템으로 전면 교체:
- 색상 토큰 (시맨틱 + 팔레트)
- Elevation 5단계
- Radius 4단계
- Typography (Pretendard)
- Motion
- 차트 8색
- 상태별 색상 패턴 (기존 유지, 색상만 토스로)
- 로그인 Liquid Glass (별도 섹션으로 분리)

**Step 2: .interface-design/system.md 업데이트**

Glass 규칙 → Elevation 규칙으로 교체:
- `glass-kpi-card` → `tds-card`
- `glass-chart-card` → `tds-card`
- 아이콘 규칙 유지 (클래스명만 변경)

**Step 3: 커밋**

```
docs: DESIGN_SYSTEM.md + interface-design 토스 기반 재작성
```

---

## Task 6: 최종 검증 + 버전업

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`

**Step 1: 전체 린트**

Run: `npx eslint --no-warn-ignored .` 또는 `npm run lint`

**Step 2: 전체 빌드**

Run: `npm run build`

**Step 3: 전체 테스트**

Run: `npm test`

**Step 4: 브라우저 확인**

`http://localhost:3000`에서:
- 관리자 대시보드 (`/admin`): tds-card 스타일 정상
- 정산 조회 (`/dashboard`): 차트/카드 스타일 정상
- 로그인 (`/login`): Liquid Glass **그대로 유지** 확인
- 다크모드 전환 정상

**Step 5: 버전 + CHANGELOG**

version: `0.37.0` → `0.38.0` (minor — 디자인 시스템 교체)

CHANGELOG:
```markdown
## [0.38.0] - 2026-03-08

### Changed
- 디자인 시스템을 토스(TDS) 기반으로 전면 교체
- Inter → Pretendard Variable 폰트 교체
- Glass-like 카드 → Elevation 5단계 시스템
- Radius 단일 → 4단계 (8/12/16/20px)
- 차트 5색 → 8색 확장
- 로그인 Liquid Glass 유지
```

**Step 6: 커밋 + 푸시**

```bash
git add -A
git commit -m "feat: 토스 디자인 시스템(TDS) 전면 마이그레이션 (v0.38.0)"
~/.claude/scripts/smart-push.sh 2
```

---

## 의존성 그래프

```
Task 1 (CSS 변수 + 폰트)
  └── Task 2 (tailwind.config)
       └── Task 3 (클래스명 치환)
            └── Task 4 (shadcn radius)
                 └── Task 5 (문서)
                      └── Task 6 (검증 + 버전업)
```

모든 태스크는 순차적 — 병렬 불가 (각 태스크가 이전 결과에 의존).

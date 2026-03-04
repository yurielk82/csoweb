# Changelog

이 프로젝트의 모든 주요 변경사항을 기록합니다.

## [0.29.2] - 2026-03-04

### Fixed
- 접속업체 KPI 자동 갱신: 사용자 로그인 시 접속업체 스냅샷에 자동 반영
- 거래처 매핑 upsert: 기존 매핑과 사업자번호 불일치 시 충돌 거부 → 업데이트로 변경
[Semantic Versioning](https://semver.org/) 및 [Keep a Changelog](https://keepachangelog.com/) 형식을 따릅니다.

## [0.29.1] - 2026-03-04

### Fixed
- 관리자 대시보드 당월 접속업체 KPI 카드 제거 (업로드 스냅샷 기반으로 통합)
- CSO 매칭 무결성 검사에서 관리자 사업자번호 필터링 추가

## [0.29.0] - 2026-03-04

### Added
- 정산서 업로드 시 접속업체 스냅샷 저장 (`settlement_uploads` 테이블)
- 과거 월 접속업체 데이터 조회 (업로드 시점 스냅샷 기반)
- 업로드 스냅샷 조회 API (`GET /api/settlements/uploads`)
- 사용자 대시보드 "정산서 미업로드" 안내 화면 (매칭은 있으나 데이터 없는 경우)

### Changed
- 관리자 대시보드 기본 표시 월을 정산서 업로드 기준으로 변경
- 접속 업체 KPI 분모에서 관리자 business_number 제외
- 메일머지 배지 판단에서도 관리자 제외

## [0.28.12] - 2026-03-04

### Improved
- 거래처 매핑 엑셀 업로드 스마트 upsert: 파일 내 중복 제거, DB 비교 후 신규/스킵/충돌 분류, 상세 결과 메시지

## [0.28.11] - 2026-03-04

### Added
- 로드맵: 실시간 상담 시스템 Phase 1~7 추가 (채널톡 유사, Supabase Realtime 기반)
- 로드맵 정렬: 완료 항목 상단, 미완료 항목 하단으로 재배치

## [0.28.10] - 2026-03-03

### Changed
- CLAUDE.md Deploy 항목: Netlify → Vercel (프로덕션) + Netlify (레거시) 업데이트

### Chore
- 원격 claude/* 브랜치 11개 정리 (PR 없는 잔존 브랜치 삭제)

## [0.28.9] - 2026-03-03

### Fixed
- netlify.toml `[functions]` region 설정 문법 오류 제거 — CLI 파싱 정상화

## [0.28.8] - 2026-03-01

### Fixed
- Vitest worker 타임아웃 해결 — WSL2+OneDrive 환경 대응 (maxWorkers: 1 + postinstall 패치)
- 전역 afterEach(cleanup) 추가로 테스트 간 DOM 정리 보장

## [0.28.7] - 2026-03-01

### Removed
- 로드맵에서 다국어 지원 항목 삭제

---

## [0.27.0~0.28.4] - 2026-02-28

### 개선 — 관리자 대시보드 UI 리디자인

Liquid Glass 시도/철회 후 Glass-like 카드 + 단일 4열 그리드 확정.

#### 변경
- v0.27.0: Liquid Glass 전면 재구성 (KPI glass-kpi-card + Quick Action glass-action-card + 배경 orbs)
- v0.27.1~v0.27.4: 수수료 단위·배지 톤 다운, 점진적 로딩, full-bleed 배경, 푸터 div 중첩 제거
- v0.27.6: Liquid Glass 제거 — shadcn Card + Tailwind 표준으로 전환
- v0.28.0: Bento Grid + Liquid Glass 재시도 → 즉시 revert
- v0.28.1~v0.28.2: Glass-like 디자인 적용 + 빠른작업 그룹 분리 + 이메일 카드 개선
- v0.28.3: 헤더 메뉴 반응형 정렬 수정 (`container` → `max-w-screen-xl` 통일)
- v0.28.4: 빠른작업 그룹 분리 제거, 단일 4열 그리드로 통합 (동일 크기 카드)

#### 수정 파일
- `src/app/(main)/admin/page.tsx`
- `src/app/globals.css`
- `src/components/shared/header.tsx`
- `docs/DESIGN_SYSTEM.md`

---

## [0.27.5] - 2026-02-28

### 리팩토링 — 레이아웃 max-width 2-Tier 라우트 그룹 표준화

페이지별 개별 max-width 선언을 제거하고, 라우트 그룹 레이아웃으로 자동 적용하는 2-Tier 구조로 전환.

#### 변경
- `(main)/layout.tsx`: `max-w-screen-2xl` (1536px) → `max-w-screen-xl` (1280px)
- `(narrow)/layout.tsx` 2개 신규 생성: `max-w-3xl` (768px) 자동 적용
- 6개 폼/설정 페이지를 `(narrow)` 라우트 그룹으로 이동 + 개별 max-w 선언 제거

| Tier | max-width | 대상 |
|------|-----------|------|
| wide | `max-w-screen-xl` (1280px) | dashboard, monthly-summary, admin/* |
| narrow | `max-w-3xl` (768px) | profile, upload, email-settings, settings, system, mailmerge |

- URL 변경 없음 (라우트 그룹은 URL 세그먼트에 미포함)

#### 수정 파일
- `src/app/(main)/layout.tsx`
- `src/app/(main)/(narrow)/layout.tsx` (신규)
- `src/app/(main)/admin/(narrow)/layout.tsx` (신규)
- `src/app/(main)/(narrow)/profile/page.tsx` (이동)
- `src/app/(main)/admin/(narrow)/upload/page.tsx` (이동)
- `src/app/(main)/admin/(narrow)/email-settings/page.tsx` (이동)
- `src/app/(main)/admin/(narrow)/system/page.tsx` (이동)
- `src/app/(main)/admin/(narrow)/settings/page.tsx` (이동)
- `src/app/(main)/admin/(narrow)/mailmerge/page.tsx` (이동)

---

## [0.26.0~0.26.4] - 2026-02-28

### 개선 — 로그인 페이지 Liquid Glass 리디자인 + 쿨톤 색상 확정 / 내정보 페이지 구조 개선

#### 변경
- v0.26.0: 로그인 페이지 Liquid Glass 리디자인
- v0.26.1: 내정보 페이지 구조 개선 (CardHeader 추가, 읽기 전용 영역 분리) + 관리자 대시보드 텍스트 간소화
- v0.26.2: 한국유니온제약 브랜드 컬러(오렌지+남색) 적용
- v0.26.3: 다크 네이비 → 웜 화이트 그래디언트 라이트 테마 전환
- v0.26.4: 오렌지+화이트 폐기, 시안/바이올렛/틸 쿨톤 복원

#### 수정 파일
- `src/app/globals.css`
- `src/app/(main)/profile/page.tsx`
- `src/app/(main)/admin/page.tsx`

---

## [0.25.4] - 2026-02-28

### 수정 — 회원-매핑 동기화 + 새 매핑 추가 UX 개선

#### 변경
- 회원 삭제 시 `cso_matching` 테이블에서 해당 사업자번호 매핑 자동 삭제
- 새 매핑 추가 다이얼로그를 드롭다운 방식으로 변경 — 가입 완료 + CSO 미매핑 회원만 목록에 표시, 사업자번호 수동 입력/검증 단계 제거

#### 수정 파일
- `src/app/api/users/[businessNumber]/route.ts`
- `src/components/admin/SettlementIntegrityManager.tsx`

---

## [0.25.3] - 2026-02-28

### 수정 — 거래처 매핑 통계 스코프 연동

처리완료·미가입·CSO미매핑·미가입+미매핑 통계가 항상 정산대상 기준으로만 계산되던 문제 수정.

#### 변경
- scope 상태 분리: "전체" 클릭 시 전체 데이터 기준, "정산대상" 클릭 시 정산 데이터 기준으로 통계와 필터 모두 전환
- Admin 대시보드 unmapped 카운트를 서버 집계값(`stats.noCsoMappingCount`)으로 전환

#### 수정 파일
- `src/app/(main)/admin/page.tsx`
- `src/components/admin/SettlementIntegrityManager.tsx`

---

## [0.25.2] - 2026-02-28

### 수정 — 회원 승인 시 CSO 매핑 자동 등록 누락

회원가입 시 `cso_matching` upsert가 실패해도 가입이 진행되어, 승인 후에도 매핑이 없는 상태가 발생할 수 있었음.

#### 변경
- 단일/일괄 승인 API에 매핑 upsert 로직 추가 — 승인 시점에 회사명→사업자번호 매핑 보장

#### 수정 파일
- `src/app/api/users/approve/route.ts`
- `src/app/api/users/approve-batch/route.ts`

---

## [0.25.1] - 2026-02-28

### 수정 — Auth 폼 6개 디자인 표준 일괄 검수 및 수정

프로필 페이지 검수(v0.24.2) 이후 (auth) 그룹 폼 페이지 6개를 동일 기준으로 감사. 하드코딩 색상 대량 위반, arbitrary values, autoComplete/type 누락 전체 수정.

#### 추가
- `success`/`warning` CSS 변수 + Tailwind 색상 매핑 (light/dark)
- `docs/DESIGN_SYSTEM.md` — 색상 토큰 및 사용 규칙 문서화
- 전 Input 필드에 `autoComplete` 속성 추가
- 전화번호 Input `type="text"` → `type="tel"` 전환

#### 변경
- Auth 페이지 배경: `bg-gradient-to-br from-blue-50 to-indigo-100` → `bg-muted` 통일
- 하드코딩 색상 전량 시맨틱 토큰 교체 (green-*, red-*, blue-*, yellow-*, orange-*, amber-*, gray-*)
- `text-[10px]` → `text-xs`, `shadow-[0_0_15px_rgba(...)]` → `shadow-lg shadow-success/40` — arbitrary value 제거
- `register/page.tsx` BIZ_STATUS_CONFIG 색상 시맨틱화
- `reset-password/page.tsx` 비밀번호 강도 바/텍스트 색상 시맨틱화
- Admin 대시보드 unmapped 카운트: 클라이언트 필터 → `stats.noCsoMappingCount` 서버 집계값 사용

#### 수정 파일 (9개)
- `src/app/globals.css` — CSS 변수 추가
- `tailwind.config.ts` — 색상 매핑 추가
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/complete-profile/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/(auth)/change-password/page.tsx`
- `src/app/(main)/admin/page.tsx`

---

## [0.25.0] - 2026-02-28

### 추가 — 빠른 작업 카드에 "해야 할 일" 배지 표시

관리자가 대시보드 진입 시 액션이 필요한 항목을 즉시 파악할 수 있도록 빠른 작업 카드 4개에 조건부 Badge를 표시.

#### 추가
- **정산서 업로드**: 당월 정산 데이터 미업로드 시 `미업로드` 배지 (destructive)
- **회원 승인**: 대기 회원 존재 시 `N건 대기` 배지 (destructive)
- **거래처 매핑**: 미매핑 건수 존재 시 `N건 미매핑` 배지 (destructive)
- **메일머지**: 당월 CSO 업체 존재 & 이메일 미발송 시 `미발송` 배지 (secondary)
- 초기 로드 시 `/api/users?pending=true`, `/api/admin/cso-matching/integrity` 병렬 fetch 추가

#### 수정 파일
- `src/app/(main)/admin/page.tsx`

---

## [0.24.3] - 2026-02-28

### 수정 — 대시보드 월 선택 날짜 형식 불일치

#### 변경
- 정산월 형식 `YYYYMM` → `YYYY-MM` 통일 — CSO 업체 API 호출과 KPI 연동 수정

#### 수정 파일
- `src/app/(main)/admin/page.tsx`
- `src/app/api/settlements/cso-companies/route.ts`

---

## [0.24.2] - 2026-02-28

### 수정 — 프로필 페이지 디자인 표준 준수 검수

프로필 페이지 디자인 감사 결과 잔여 위반 수정.

#### 변경
- `min-h-[400px]` → `min-h-96` — arbitrary value 제거, Tailwind 표준 토큰으로 교체

#### 수정 파일
- `src/app/(main)/profile/page.tsx`

---

## [0.24.1] - 2026-02-28

### 리팩토링 — 프로필 페이지 접근성·구조 개선

디자인 감사 기반 9개 항목 점검, Separator 제거·CardHeader 중복 제거·autoComplete/type 추가·Label 연결·CardFooter 이동 등.

#### 수정 파일
- `src/app/(main)/profile/page.tsx`

---

## [0.24.0] - 2026-02-28

### 변경 — 대시보드 접속업체 로직 + 월 선택 + 이메일 카드 + 도구 UI 복원

v0.23.0 대시보드 피드백 반영.

#### 추가
- **월 선택**: 헤더 우측 shadcn `Select`로 조회 기준 월 변경. 정산 데이터가 있는 월 + 당월 옵션. CSO업체·수수료·이메일 KPI가 선택 월에 연동
- **이메일 KPI 카드**: 5번째 KPI로 추가. 선택 월 기준 전송 건수 표시, 실패 시 `text-destructive`로 실패 건수 강조
- **신규 API**: `GET /api/settlements/cso-companies?month=YYYYMM` — 정산월별 CSO 업체 business_number 목록 반환

#### 변경
- **접속업체 로직**: 전체 비관리자 → "당월 정산 CSO 업체 중 접속한 업체"로 수정. 과거 월 선택 시 "—" 표시
- **도구 카드 복원**: v0.22.0 스타일(아이콘+제목+설명) 7개 카드를 업무 순서대로 정렬 (업로드→회원승인→거래처매핑→데이터관리→컬럼설정→메일머지→이메일이력)
- **KPI 그리드**: 4열 → 5열 (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`)

#### 제거
- **파이프라인 섹션**: `PipelineStatus`, `PipelineStep` 타입, `getPipelineIcon()`, `getPipelineBorder()` 헬퍼, 파이프라인 JSX 전부 제거
- 미사용 import: `CheckCircle2`, `AlertTriangle`, `Clock`, `ChevronRight`

#### 수정 파일
- `src/app/api/settlements/cso-companies/route.ts` (신규)
- `src/app/(main)/admin/page.tsx`

---

## [0.23.2] - 2026-02-28

### 리팩토링 — 프로필 페이지 레이아웃 압축

#### 변경
- 5개 카드 → 2개 카드로 통합 (프로필 정보 + 비밀번호 변경)

#### 수정 파일
- `src/app/(main)/profile/page.tsx`

---

## [0.23.1] - 2026-02-28

### 리팩토링 — 프로필 페이지 기본 정보 읽기 전용 카드 제거

#### 변경
- 기본 정보 읽기 전용 카드 제거, 편집 가능 카드에 통합

#### 수정 파일
- `src/app/(main)/profile/page.tsx`

---

## [0.23.0] - 2026-02-28

### 추가 — 관리자 대시보드 재설계 (KPI + 파이프라인 + 접속 추적)

- **last_login_at 접속 추적**: `users` 테이블에 `last_login_at` 컬럼 추가, 로그인 성공 시 자동 기록
- **KPI 카드 (당월 중심 4개)**: 당월 CSO 업체 / 당월 접속 업체(X/Y) / 당월 총수수료 / 총 정산월
- **업무 파이프라인 (4단계)**: 업로드→승인→매핑→조회 단계별 상태를 완료(초록)/경고(앰버)로 시각화, 클릭 시 해당 페이지 이동
- **기타 작업 축소**: 핵심 프로세스에 포함되지 않는 보조 도구 4개만 남김 (데이터관리, 컬럼설정, 메일머지, 이메일이력)
- **API 호출 최적화**: `recentEmailRes` 제거, 5개 병렬 호출로 축소

#### 수정 파일
- `supabase/migrations/20260228_add_last_login_at.sql` (신규)
- `src/lib/supabase.ts` — DbUser에 `last_login_at` 필드 추가
- `src/domain/user/types.ts` — User에 `last_login_at` 필드 추가
- `src/domain/user/UserRepository.ts` — `updateLastLogin()` 메서드 추가
- `src/infrastructure/supabase/SupabaseUserRepository.ts` — `updateLastLogin()` 구현, `mapDbUserToUser` 수정
- `src/application/auth/LoginUseCase.ts` — 로그인 성공 시 `updateLastLogin()` 호출
- `src/app/(main)/admin/page.tsx` — 대시보드 전면 재설계

---

## [0.22.0] - 2026-02-28

### 추가 — 대시보드 Shopify식 3단 구조 재구성 + 시스템 정보 페이지 분리

#### 변경
- 관리자 대시보드를 KPI / Quick Actions / 시스템 정보 3단 구조로 재구성
- 시스템 정보를 독립 페이지(`/admin/system`)로 분리
- `GET /api/system/status` API 신규 생성
- 네비게이션에 시스템 정보 메뉴 추가

#### 수정 파일
- `src/app/(main)/admin/page.tsx`
- `src/app/(main)/admin/settings/page.tsx`
- `src/app/(main)/admin/system/page.tsx` (신규)
- `src/app/api/system/status/route.ts` (신규)
- `src/components/shared/header.tsx`
- `src/types/index.ts`

---

## [0.21.6] - 2026-02-28

### 개선 — 관리자 대시보드 시스템 정보 한줄 레이아웃 통합

#### 변경
- 시스템 정보 카드를 한줄 요약 레이아웃으로 통합

#### 수정 파일
- `src/app/(main)/admin/page.tsx`

---

## [0.21.5] - 2026-02-28

### 수정 — 회원가입 CSO 매핑 자동 생성 에러 응답 검사 추가

#### 변경
- 회원가입 시 CSO 매핑 자동 생성의 upsert 에러 응답 검사 로직 추가

#### 수정 파일
- `src/app/api/auth/register/route.ts`

---

## [0.21.3] - 2026-02-28

### 수정 — 회원가입 주소 검색 팝업 CSP 차단 해제

- CSP `frame-src 'none'`이 다음 주소 검색 iframe을 차단하던 문제 수정
- `frame-src`에 `https://t1.daumcdn.net`, `https://postcode.map.daum.net` 허용

---

## [0.21.2] - 2026-02-28

### 개선 — 대시보드 시스템 footer 연결 상태 개별 표시

- 각 서비스 연결 상태를 색상 dot으로 개별 표시 (초록=연결, 빨강=미연결)
- 연결된 서비스를 좌측, 미연결 서비스를 우측에 정렬
- API 서비스에 "API" 표기 추가 (국세청 API, 심평원 병원 API, 심평원 약국 API)
- footer를 화면 최하단에 고정 (`mt-auto` + flex 레이아웃)
- `(main)/layout.tsx`에 `flex flex-col` + `flex-1` 추가

---

## [0.21.1] - 2026-02-28

### 리팩토링 — 회원 승인 페이지를 회원 관리에 통합

#### 변경
- 독립 회원 승인 페이지(`/admin/approvals`) 제거, 회원 관리 페이지에 승인 기능 통합
- 네비게이션 메뉴에서 "회원 승인" 항목 제거
- 승인 알림 이메일 발송 로직 정리

#### 수정 파일
- `src/app/(main)/admin/approvals/page.tsx`
- `src/app/(main)/admin/members/page.tsx`
- `src/app/(main)/admin/page.tsx`
- `src/components/shared/header.tsx`
- `src/lib/email.ts`

---

## [0.21.0] - 2026-02-28

### 기능 — 시스템 정보를 대시보드에서 설정 페이지로 이전

현대 SaaS 패턴(Vercel, Supabase, Stripe) 기준으로 인프라 정보를 메인 대시보드에서 분리.

#### 대시보드 (`admin/page.tsx`)
- 시스템 정보 Card 7개 그리드 **제거**
- 하단에 한 줄 footer 추가: `버전 · 환경 · 상태 요약`
- 정상 시 "모든 서비스 정상" (녹색), 이상 시 해당 서비스명 표시 (빨간색)
- "시스템 정보 →" 링크로 설정 페이지 앵커 이동

#### 설정 페이지 (`admin/settings/page.tsx`)
- 최하단에 "시스템 정보" 읽기전용 Card 섹션 추가
- 7개 항목을 라벨 + Badge 속성-값 리스트로 표시
- 이메일 서비스는 듀얼 프로바이더(SMTP/Resend) 상태 동시 표시
- `/api/system/status`를 회사 정보와 병렬 호출

---

## [0.20.5, 0.20.10~0.20.11] - 2026-02-27~28

### 개선 — 네비게이션 그룹 메뉴 hover 전환

#### 변경
- v0.20.5: 그룹 제목 클릭 시 첫 번째 메뉴로 이동 (스플릿 버튼)
- v0.20.10: 데스크톱 그룹 드롭다운을 클릭 → hover 트리거로 전환
- v0.20.11: Radix Portal 제거, 순수 hover 구현 (타이머 기반 안정적 UX)

#### 수정 파일
- `src/components/shared/header.tsx`

---

## [0.20.1~0.20.4, 0.20.8~0.20.9] - 2026-02-27

### 개선 — 이메일 이력 UX 강화

Progressive Rendering, 날짜 프리셋, 오류 내용 열, 컬럼 재배치.

#### 변경
- v0.20.1: Progressive Rendering (스켈레톤) + 날짜 프리셋 필터 (7/30/90일/전체)
- v0.20.2: 실패 행 빨간 배경 + 에러 메시지 인라인 표시
- v0.20.3: "오류 내용" 독립 열 추가 (12개 에러 패턴 매핑)
- v0.20.4: 열 너비 최적화 + 오류 설명 구체화 (14패턴)
- v0.20.8: 컬럼 너비 auto + 오류 내용 Tooltip 전환
- v0.20.9: 상태 컬럼 맨 앞 이동

#### 수정 파일
- `src/app/(main)/admin/emails/page.tsx`
- `src/domain/email/types.ts`
- `src/domain/email/EmailLogRepository.ts`
- `src/infrastructure/supabase/SupabaseEmailLogRepository.ts`
- `src/app/api/email/logs/route.ts`

---

## [0.20.6~0.20.7] - 2026-02-27

### 개선 — 대시보드 시스템정보 디자인 재정비

#### 변경
- v0.20.6: Card 래퍼 제거, 독립 카드 가로 나열 (`flex flex-wrap`)
- v0.20.7: shadcn Card 패턴 통일, 7열 반응형 그리드, Badge variant 표준 사용

#### 수정 파일
- `src/app/(main)/admin/page.tsx`

---

## [0.20.0] - 2026-02-27

### 기능 — CSO 매핑 자동화 + 네비게이션 그룹 드롭다운

#### CSO 매핑 자동 생성
관리자가 수동으로 매핑을 추가할 필요 없이, 두 시점에서 자동으로 `cso_matching` 테이블에 매핑이 생성됩니다.

| 시점 | 동작 | 데이터 |
|------|------|--------|
| **회원가입** | company_name → business_number 매핑 자동 생성 | `ignoreDuplicates: true` — 이미 있으면 무시 |
| **정산서 업로드** | CSO관리업체 → business_number 매핑 자동 갱신 | 엑셀의 모든 고유 CSO관리업체-사업자번호 쌍을 upsert |

두 자동화 모두 실패해도 원래 기능(회원가입/업로드)에 영향 없음 (try-catch 격리).

#### 네비게이션 그룹 드롭다운 (Plan A)
10개 플랫 메뉴 → 5개 그룹으로 축소.

```
[대시보드] [정산 관리 ▾] [회원 관리 ▾] [이메일 ▾] [마스터 조회]
               │               │             │
               ├ 업로드         ├ 회원 관리    ├ 메일머지
               ├ 컬럼 설정      ├ 회원 승인    └ 이메일 이력
               └ 데이터 관리    └ 거래처 매핑
```

- 데스크톱: DropdownMenu 그룹 + 현재 경로 하이라이트
- 모바일: 그룹 라벨 + 들여쓰기 리스트

#### 변경 파일
| 파일 | 변경 |
|------|------|
| `src/components/shared/header.tsx` | 전면 재작성 — NavEntry 타입, 그룹 드롭다운, 모바일 그룹 |
| `src/app/api/auth/register/route.ts` | 회원가입 시 cso_matching upsert 추가 |
| `src/app/api/upload/route.ts` | 정산서 업로드 시 CSO관리업체 자동 매핑 추가 |

## [0.19.2] - 2026-02-27

### UX — 거래처 매핑 용어 체계 정리

스탯 카드, 테이블 헤더, 안내문, 주석의 라벨을 통일. 짧은 라벨은 축약, 설명 텍스트는 원본 용어 `CSO관리업체명` 유지.

#### 변경 내용
| 위치 | Before | After |
|------|--------|-------|
| 스탯 카드 | 정산서DB | 정산 대상 |
| 스탯 카드 | 매핑완료 | 처리 완료 |
| 스탯 카드 | 회원가입 X | 미가입 |
| 스탯 카드 | CSO관리업체명 X | CSO 미매핑 |
| 스탯 카드 | 미처리 | 미가입+미매핑 |
| 테이블 헤더 | 회원가입상태 | 가입 상태 |
| 테이블 헤더 | CSO관리업체명 매핑 | CSO 매핑 |
| 안내문 | CSO관리업체명 매핑 상태를 | CSO관리업체명의 매핑 상태를 |
| 엑셀 다운로드 | 회원가입상태 / CSO관리업체명 | 가입 상태 / CSO 매핑 |
| tooltip | 매핑완료 | 처리 완료 |

## [0.19.1] - 2026-02-27

### UX — Progressive Rendering 전체 적용

전 페이지의 `if (loading) return <Loading />` 풀 블로킹 패턴을 제거. 페이지 셸이 즉시 렌더링되고 데이터만 비동기로 채워지는 Progressive Rendering으로 전환.

#### 변경 내용
| 페이지 | 변경 |
|--------|------|
| **admin 대시보드** | 4개 순차 API → `Promise.all` 병렬화 + 스켈레톤 셸 |
| **dashboard** | 스켈레톤 셸 (필터/합계카드/테이블 형태) |
| **admin/settings** | 폼 기본값으로 즉시 렌더 + 타이틀 스피너 |
| **admin/members** | 헤더/필터/테이블 즉시 렌더 + 테이블 로딩 행 |
| **admin/approvals** | 헤더/알림 즉시 렌더 + 카드 영역 로딩 상태 |
| **admin/data** | 헤더/통계/테이블 즉시 렌더 + 테이블 로딩 행 |
| **admin/columns** | 헤더/일괄작업 즉시 렌더 + 컬럼 리스트 로딩 |
| **admin/master** | 헤더/필터 즉시 렌더 + 타이틀 스피너 |

#### 기술적 개선
- `Promise.all` 병렬화로 admin 대시보드 API 호출 시간 ~75% 단축 (순차 4회 → 병렬 1회)
- 기존 `Skeleton` 컴포넌트 활용 (dashboard, admin)
- `Loader2` 인라인 스피너 (6개 서브 페이지)
- 수정 파일: 8개 | 위험도: LOW (순수 UI 변경, 비즈니스 로직 불변)

---

## [0.19.0] - 2026-02-27

### Refactor — 하드코딩 전면 정리 (매직 넘버/중복 상수 통합)

`src/constants/defaults.ts` 신규 생성 — 14개 공유 상수 중앙화, 20개 파일에서 하드코딩 제거.

#### 통합된 상수 (Phase 1)
| 상수 | 값 | 이전 분산 수 |
|------|------|------------|
| `DEFAULT_PAGE_SIZE` | 50 | 5곳 |
| `DEFAULT_EMAIL_SEND_DELAY_MS` | 6000 | 7곳 |
| `DEFAULT_SMTP_PORT` | 465 | 3곳 |
| `TOKEN_EXPIRY_MINUTES` | 30 | 3곳 |
| `SESSION_EXPIRY_HOURS` | 24 | 2곳 |
| `BCRYPT_SALT_ROUNDS` | 12 | 1곳 |
| `SUPABASE_PAGE_SIZE` | 1000 | 2곳 |
| `SUPABASE_BATCH_SIZE` | 500 | 1곳 |
| `EMAIL_LOG_DEFAULT_LIMIT` | 100 | 2곳 |
| `EMAIL_CACHE_TTL_MS` | 30000 | 1곳 |
| `BATCH_EMAIL_DELAY_MS` | 200 | 1곳 |
| `MAX_FAILED_LOGIN_ATTEMPTS` | 15 | 1곳 |

#### 중복 상수 제거 (Phase 2)
| 상수 | 이전 | 이후 |
|------|------|------|
| `ALWAYS_NEEDED_COLUMNS` | `dashboard/init/route.ts` + `settlements/route.ts` | `constants/defaults.ts` 1곳 |
| `DEFAULT_NOTICE_CONTENT` | `SupabaseCompanyRepository.ts` + `master/page.tsx` | `constants/defaults.ts` 1곳 |
| `DEFAULT_COMPANY_INFO` | `SupabaseCompanyRepository.ts` + `email.ts` + `settings/page.tsx` | `constants/defaults.ts` 1곳 |
| `COOKIE_NAME` | `lib/auth.ts` + `middleware.ts` (문자열) | `constants/auth.ts` 1곳 |

#### 기타
- `admin/page.tsx` 시스템 버전 초기값 `v0.14.0` → 빈 문자열 (API 응답 전까지 거짓 버전 표시 방지)

---

## [0.18.12] - 2026-02-27

### Fix — 메일머지 정산월 드롭다운 실제 데이터 기반으로 변경

- **버그**: "특정 정산월 데이터가 있는 업체" 선택 시, 드롭다운에 현재 날짜 기준 최근 12개월이 표시되어 데이터가 없는 월도 선택 가능했음
- **수정**: `generateYearMonthOptions()` (하드코딩 12개월) 제거 → `getCachedAvailableMonths('ALL')` RPC 기반 실제 정산 데이터 존재 월만 표시
- `mailmerge/route.ts` GET에 `type=available_months` 분기 추가
- `useMailMerge.ts`에서 mount 시 API fetch로 정산월 목록 로드

---

## [0.18.11] - 2026-02-27

### Fix — Vercel Speed Insights 복원 + CSP connect-src 허용

- `@vercel/speed-insights` 복원 (Vercel 개발 서버에서 사용 중)
- CSP `connect-src`에 `https://vitals.vercel-insights.com` 추가 — 프로덕션에서도 차단 없이 동작

## [0.18.10] - 2026-02-27 (reverted)

### ~~Chore — Vercel Speed Insights 제거~~ → v0.18.11에서 복원

- ~~`@vercel/speed-insights` 패키지 및 `<SpeedInsights />` 컴포넌트 제거~~
- ~~Netlify 배포 환경에서 불필요 (Vercel 전용), CSP `connect-src`에서도 차단되고 있었음~~

---

## [0.18.9] - 2026-02-27

### Fix — 엑셀 업로드 파일 크기 제한 4MB 통일

- **API route** (`upload/route.ts`): 20MB → 4MB (Next.js body parser 기본값과 일치)
- **클라이언트 dropzone** (`upload/page.tsx`): 20MB → 4MB
- **클라이언트 검증** (`lib/excel.ts`): 50MB → 4MB
- **DropZone UI 텍스트**: "최대 20MB" → "최대 4MB"
- **무결성 관리자** (`SettlementIntegrityManager.tsx`): 10MB → 4MB
- **테스트**: 50MB 기준 → 4MB 기준으로 수정

이전에는 클라이언트(20MB/50MB), 서버(20MB), Next.js(4MB) 제한이 불일치하여 4MB 초과 파일 업로드 시 서버에서 무응답 에러 발생 가능. 모두 4MB로 통일.

---

## [0.18.3~0.18.5, 0.18.7~0.18.8] - 2026-02-27

### Performance — 서버사이드 데이터 캐시 + 통합 init API

#### 변경
- v0.18.3: 통합 init API (`GET /api/dashboard/init`) — 대시보드 초기 API 4회 → 1회, React.memo 적용
- v0.18.4: `unstable_cache` + `revalidateTag` 캐시 레이어 도입 (컬럼/회사/CSO매칭/정산월)
- v0.18.5: 마스터 조회 초기 API 2회 → 1회, `getCachedCSOList()` 캐시 추가
- v0.18.7: 데이터 관리 `get_settlement_stats_by_month()` RPC + 캐시
- v0.18.8: 전체 메뉴 캐시 확대 (회원/거래처매핑/컬럼), 월별 합계 RPC 전환, 캐시 무효화 보강

#### 수정 파일
- `src/lib/data-cache.ts` (신규)
- `src/app/api/dashboard/init/route.ts` (신규)
- 다수 API 라우트 캐시 적용/무효화 추가

---

## [0.18.6] - 2026-02-27

### Changed — 관리자 대시보드 & 설정 페이지 개선

#### 대시보드 시스템 정보 디자인 개선
- **아이콘 불일치 수정**: 섹션 제목 `FileSpreadsheet` → `Server`
- **항목별 아이콘 추가**: Tag(버전), Database(DB), FileText(국세청), Building2(병원), Pill(약국), Globe(환경), Mail(이메일)
- **레이아웃 변경**: 세로 리스트 → 2열 그리드 + 컬러 아이콘 카드 (Quick Actions 패턴 통일)

#### 설정 페이지 필드별 자동 저장
- **필드별 자동 저장**: 텍스트/숫자 필드 blur 시 변경 감지 → PATCH 요청으로 즉시 저장
- **체크박스 즉시 저장**: SSL/TLS, 이메일 알림 등 토글 변경 시 바로 저장
- **PATCH 메서드 추가** (`/api/settings/company`): PUT과 동일 로직, 부분 수정 시맨틱 지원
- **저장 상태 인디케이터**: saving / saved / error 상태 표시

---

## [0.18.1~0.18.2] - 2026-02-27

### Performance — 정산 API DB 페이지네이션 + RPC 전환 + 인덱스

#### 변경
- v0.18.1: DB 레벨 페이지네이션 (`Supabase .range()` + `count: 'exact'`), 합계 별도 경량 쿼리, 클라이언트 초기화 병렬화, 마스터조회 지연 로딩
- v0.18.2: 합계 계산 RPC (`get_settlement_totals()`), 정산월 목록 RPC (`get_distinct_settlement_months()`), CSO관리업체 인덱스 추가

#### 수정 파일
- Repository 인터페이스 확장 (`findAllPaginated`, `getTotals` 등 4개 메서드)
- Supabase `.rpc()` 지원 추가
- DB 인덱스: `CSO관리업체` 단일 + `(정산월, CSO관리업체)` 복합

---

## [0.18.0] - 2026-02-26

전체 코드 리뷰 & 리팩토링. 보안 강화, 타입 안전성, SRP 분리, UX 개선, SEO 기본 설정.

### Security (Phase 1)

- **XSS 방어**: `escapeHtml()` 유틸 추가, 이메일 Notice 본문 이스케이프 적용 (`lib/email.ts`)
- **빈 catch 블록 해소**: 44곳 → 의도적 무시 4곳(주석 보강) + 31곳 `console.error` 추가 (23개 파일)

### Changed (Phase 2 — Type Safety)

- `getSettlementValue()` 유틸 추가 — Settlement 동적 키 접근의 타입 안전한 대안 (`domain/settlement/types.ts`, `types/index.ts`)
- UI 페이지에서 `row[key]` → `getSettlementValue(row, key)` 교체 (dashboard, master)

### Changed (Phase 3 — Performance/SRP)

- **대시보드 분리** (752줄 → ~150줄): `useSettlementData` 훅 + 6개 하위 컴포넌트
- **업로드 분리** (639줄 → ~150줄): `useFileUpload` 훅 + 4개 하위 컴포넌트
- **메일머지 분리** (665줄 → ~143줄): `useMailMerge` 훅 + 4개 하위 컴포넌트

### Added (Phase 4 — UX/UI)

- **Skeleton UI**: `SettlementSkeleton` (대시보드), `AdminSkeleton` (관리자) + shadcn/ui `Skeleton` 베이스
- **Error Boundary**: 루트(`error.tsx`), 메인(`(main)/error.tsx`), 인증(`(auth)/error.tsx`)
- **loading.tsx**: App Router Suspense 경계 — 메인, 대시보드, 관리자

### Added (Phase 5 — SEO)

- `robots.ts`: B2B 인증 포털 전체 크롤링 차단
- `sitemap.ts`: 로그인 페이지만 노출
- `layout.tsx`: `title.template`, `openGraph`, `robots: {index: false}` 메타데이터

### Changed (Phase 6 — Performance)

- 로그인 페이지 `<img>` 3곳 → `next/image` `<Image>` 전환
- `next.config.mjs`: `images.remotePatterns` 추가 (kogl.or.kr, creativecommons.org)

### Docs (Phase 7)

- `CLAUDE.md`: Tech Stack 상세화, 주요 명령어, DDD 구조, 컴포넌트 구조, 알려진 예외 문서화
- `docs/ARCHITECTURE.md`: hooks/, components/ 구조, Error Boundary/loading.tsx 설명 추가
- `README.md`: v0.18.0 동기화 + 로드맵 업데이트
- `CHANGELOG.md`: v0.18.0 전체 기록
- `package.json`: `"version": "0.18.0"`

---

## [0.17.2] - 2026-02-26

### Fixed

- **메일머지 변수 치환 전면 보강**
  - `{{정산월}}` 포맷 변경: `2026-01` → `2026년 01월`
  - `{{정산월+1}}` 신규 변수: 정산 다음월 (예: `2월`)
  - `{{대표자명}}` 신규 변수: 회사 대표자명
  - Notice 본문에 `replaceVariables` 적용 (이전에는 미치환 상태로 발송)
  - 정규식 메타문자 이스케이프 (`escapeRegex`) — `{{정산월+1}}`의 `+` 처리
- **정산 summary CSO 매칭 기반 조회로 전환**
  - `getSummary(businessNumber)` → `getSummaryByCSOMatching(matchedCSONames)` (POST/PATCH/PUT)
  - 정산 테이블은 사업자번호가 아닌 CSO 업체명으로 연결되므로, 매칭 기반 조회가 정확
- **Dashboard 합계 요약 개선** — 총 수수료만 2줄 왼쪽 정렬 레이아웃으로 변경
- **기본 본문 템플릿** — 총 금액/데이터 건수 제거, 총 수수료(세금계산서 발행 금액)만 강조
- **정산 테이블 셀 줄바꿈 방지** — `th`/`td`에 `whitespace-nowrap` 적용

---

## [0.17.1] - 2026-02-26

### 수정 — 메일머지 변수 치환 보강 및 본문 템플릿 개선

#### 변경
- `{{정산월}}` 포맷, `{{정산월+1}}`, `{{대표자명}}` 변수 치환 로직 보강
- 기본 본문 템플릿 개선 — 총 수수료(세금계산서 발행 금액)만 강조
- CSS globals 스타일 조정

#### 수정 파일
- `src/app/(main)/admin/mailmerge/page.tsx`
- `src/app/api/email/mailmerge/route.ts`
- `src/app/globals.css`

---

## [0.17.0] - 2026-02-26

### Added

- **이메일 알림 유형별 ON/OFF 토글** — 관리자 설정에서 5가지 이메일 유형별 발송 여부 제어
  - 회원가입 신청 알림, 가입 승인/거부 알림, 정산서 업로드 알림, 비밀번호 재설정
  - 메일머지(수동 발송)는 항상 발송, 토글 대상 제외
  - `company_settings` 테이블에 `email_notifications` JSONB 컬럼 추가
  - `sendEmail()` 진입 시 비활성 유형은 발송 skip
- **사용자 매뉴얼** (`docs/USER_MANUAL.md`) — CSO 업체 담당자용 사이트 이용 안내서
- **운영자 매뉴얼** (`docs/ADMIN_MANUAL.md`) — 관리자(영업관리팀)용 사이트 운영 안내서

### Changed

- **Notice 편집 다이얼로그 확대** — 너비 `lg` → `2xl`, 텍스트 영역 높이 확대 + 리사이즈 가능
- `tsconfig.json` — `scripts/` 디렉토리를 빌드 제외에 추가 (스크립트 독립 실행)

---

## [0.16.0] - 2026-02-26

### Changed

- **DDD 레이어 전환 완료** — `lib/db.ts` 호환 레이어(346줄, 48개 함수) 완전 제거
  - 28개 API 라우트: `@/lib/db` → Repository Factory 또는 Application Use Case 직접 호출로 전환
  - `lib/email.ts`: `@/lib/db` 의존 제거, Repository Factory 직접 호출
  - 10개 테스트 파일: mock 대상을 `@/lib/db` → `@/infrastructure/supabase` 또는 `@/application/auth`로 전환

### Added

- Auth Use Case 3개 신규 생성 (로그인 비즈니스 로직을 라우트에서 분리)
  - `LoginUseCase` — 사용자 인증, 계정 잠금, 실패 카운트, 리다이렉트 결정
  - `ForgotPasswordUseCase` — 비밀번호 재설정 요청 (사용자 조회 + 이메일 매칭 + 토큰 생성)
  - `ResetPasswordVerifyUseCase` — 토큰 검증 + 비밀번호 변경 완료
- Auth Use Case 테스트 3개 (21개 케이스)
- 전체 테스트: 27개 파일, 171개 케이스

### Removed

- `src/lib/db.ts` — 모든 함수가 Repository 1줄 위임하는 호환 레이어 삭제

---

## [0.15.1] - 2026-02-25

### Added

- Tier 1~2 테스트 커버리지 확장 — 10개 테스트 파일, 40개 케이스 추가 (총 150개)
  - **Application Use Case**: GetMonthlySummaryUseCase (4개)
  - **API Route**: auth/logout (2), auth/session (3), settlements/export (4), settlements/stats (3), settlements/year-months (3), users (4), users/approve (5), users/reject (5), columns (7)
  - 신규 커버: auth/logout 100%, auth/session 100%, columns 80%, settlements/export 91%, users/approve 86%, users/reject 89%

---

## [0.15.0] - 2026-02-25

### Added

- 테스트 인프라 풀세트 구축 — Vitest + Testing Library + Playwright
  - 14개 테스트 파일, 108개 테스트 케이스 전체 통과
  - **Unit (45개)**: `lib/auth` (해싱, JWT, 포맷, 검증), `lib/utils` (cn), `lib/excel` (validateExcelFile, exportToExcel, getYearMonthsFromData)
  - **Application Use Case (30개)**: RegisterUser, ApproveUser, GetSettlements (관리자/일반/매칭없음 분기), UploadSettlements, ExportSettlements, UpsertMatching
  - **API 통합 (21개)**: login (400/401/403/200 + 리다이렉트 3분기), register (밸리데이션 + 중복 체크), settlements (인증/권한/검색/페이지네이션)
  - **컴포넌트 (12개)**: AuthContext (세션 관리, localStorage 동기화), Header (로딩/관리자/일반 메뉴)
  - **E2E (7개)**: 로그인/로그아웃 플로우, 정산서 접근 (Playwright)
- 테스트 헬퍼: 7개 Repository mock 팩토리, 테스트 픽스처, NextRequest 생성 헬퍼
- npm scripts 8개 추가 (`test`, `test:watch`, `test:unit`, `test:integration`, `test:component`, `test:coverage`, `test:ui`, `test:e2e`)
- 설정 파일: `vitest.config.ts`, `playwright.config.ts`, `src/__tests__/setup.ts`

## [0.14.1] - 2026-02-25

### Changed

- 정산서 Notice 편집 UI를 사이트 설정(`/admin/settings`)에서 마스터조회(`/admin/master`)로 이동
  - Notice amber 카드에 인라인 편집 버튼 + Dialog 추가 (WYSIWYG 편집)
  - 사이트 설정 페이지에서 Notice 카드 제거 — 브랜딩 + 이메일 인프라만 유지
  - 변수 도움말(`{{정산월}}`, `{{정산월+1}}`, `{{대표자명}}`) 및 기본값 초기화 기능 포함
  - 일반 사용자 대시보드(`/dashboard`) Notice 읽기 전용 표시는 변경 없음

## [0.14.0] - 2026-02-25

### Added

- 이메일 듀얼 프로바이더 (Resend API + SMTP 하이웍스)
- 메일머지 SSE 실시간 진행률 표시
- 대시보드 시스템 정보 강화 (SMTP/NTS 상태, 버전 동기화)

### Fixed

- 라인 엔딩 정규화 (CRLF → LF)

## [0.13.0] - 2026-02-25

### Added

- 회원가입 사업자번호 국세청 실시간 인증 통합

## [0.12.0] - 2026-02-24

### Changed

- DDD 구조 개편 Phase 1 — `domain/` `infrastructure/` `application/` 레이어 분리
- `docs(h)/` → `docs/` 폴더 통합

### Added

- 팀 온보딩용 문서 5종 (ARCHITECTURE, API_REFERENCE, DATABASE, DEPLOYMENT, TROUBLESHOOTING)

## [0.3.0] - 2026-02-25

### Added

- `profile_complete` 플래그 분리 — 비밀번호 변경과 프로필 완성 독립 관리

## [0.2.0] - 2026-02-25

### Added

- DB 기반 사용자 계정 일괄 생성 + 첫 로그인 이메일 입력 강제
- 첫 로그인 시 전체 회원정보 입력 강제 + 초기 비밀번호를 사업자번호 전체로 변경

### Fixed

- 프로필 미완성 판단을 DB 직접 조회로 변경

---

## Pre-release (2026-01-28 ~ 2026-02-19)

버전 태그 도입 전 개발 이력. 초기 시스템 구축 및 핵심 기능 구현.

### 인프라 & 배포 (2026-01-28 ~ 2026-02-19)

- Supabase 데이터베이스 연결 및 클라이언트 초기화
- Netlify 배포 설정 + Functions 리전 도쿄 설정
- Vercel Speed Insights 추가
- Auth RLS 초기화 플랜 (4 테이블)
- `cso_matching` Service role RLS 정책 추가
- 회사 정보 API on-demand revalidation 적용
- `cookies()` 사용 API 라우트에 `force-dynamic` 일괄 추가
- CLAUDE.md 추가 (공통 규칙 @import)

### 정산서 조회 (2026-01-28 ~ 2026-02-13)

- CSO 정산서 웹 조회 시스템 초기 구현
- 관리자용 정산서 마스터 조회 페이지
- 정산서 조회 피벗 형태 (거래처명별 소계 + CSO관리업체 총합계)
- 정산서 Notice 영역 및 수수료 합계 문구 추가
- Notice 변수 치환 (`{{정산월}}`, `{{정산월+1}}`, `{{대표자명}}`)
- 정산 API SELECT 최적화 — 필요한 컬럼만 조회
- 월별 수수료 합계 UI 개선 및 검색 최적화
- Supabase 1000건 조회 제한 해결 (페이지네이션)
- 정산서 조회 무한 로딩 해결 — 모든 에러 케이스 처리
- 데이터 없음 안내 메시지 개선

### 무결성 검증 (2026-02-04 ~ 2026-02-11)

- 정산서 무결성 검증(CSO 매칭) 기능 추가
- 관리자 직접 매칭 등록/수정/삭제 UI
- 통계 카드 클릭 필터링 + 검색 개선 + 거래처 관리 UI
- 키보드 중심 인라인 편집 + 낙관적 업데이트 + 에러 우선 정렬
- 필터 카드 집계 기준 수정 및 전체 UI 개선

### 회원 관리 (2026-01-29 ~ 2026-01-31)

- 프로필 페이지 새 필드 추가 및 다음 주소 검색 적용
- 회원관리 엑셀 다운로드 및 전화번호 포맷 개선
- 주소 저장 구조 변경 (우편번호, 주소1, 주소2 분리)
- 회원 승인 페이지에 일괄 승인 기능 추가
- 비밀번호 재설정/변경 강제 기능 구현
- Resend API 기반 이메일 비밀번호 재설정

### 이메일 & 알림 (2026-01-28 ~ 2026-01-30)

- 업로드 후 이메일 발송 선택 다이얼로그
- 모든 이메일 템플릿에 회사 정보 푸터 적용
- 메일머지 변수 재연동 및 사용 가능 변수 확장
- 엑셀 업로드 컬럼 매핑 기능 추가
- 월별 수수료 합계 조회 기능 구현

### 사이트 설정 & UI (2026-01-28 ~ 2026-02-09)

- 로그인 화면 푸터 회사정보 설정 기능
- 저작권/라이선스 표시 추가 및 간소화
- AuthContext 기반 전역 인증 상태 관리
- 데이터 관리 페이지 — 정산월별 상세 정보 표시
- Supabase 병원정보 자동 동기화 시스템 구축
- 병원 마스터 데이터 관리 스크립트 추가
- CSO매칭 기반 정산서 조회 API 권한 제어

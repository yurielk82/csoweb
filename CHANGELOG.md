# Changelog

이 프로젝트의 모든 주요 변경사항을 기록합니다.
[Semantic Versioning](https://semver.org/) 및 [Keep a Changelog](https://keepachangelog.com/) 형식을 따릅니다.

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

## [0.18.5] - 2026-02-27

### Performance — 마스터 조회 초기 로드 최적화

#### API 호출 통합
- 마스터 조회 초기화: **2개 API (init + users) → 1개 API** (`include_cso_list=true`)
- 별도 `/api/users` cold start 제거 — 가장 큰 체감 개선

#### CSO 목록 캐시
- **신규 `getCachedCSOList()`**: 승인된 일반 회원 목록을 `unstable_cache`로 캐시 (태그: `user-data`)
- 무효화 시점: 회원 승인(`approve`), 거부(`reject`), 일괄 승인(`approve-batch`)

#### 변경 전후 비교

| 항목 | v0.18.4 | v0.18.5 |
|------|---------|---------|
| 마스터 조회 초기 API | 2회 (init + users) | **1회** (init) |
| Lambda cold start | 2회 | **1회** |
| CSO 목록 조회 | 매번 DB (전체 유저 로드) | **캐시** (승인 시만 무효화) |

---

## [0.18.4] - 2026-02-27

### Performance — 서버사이드 데이터 캐시 (`unstable_cache` + `revalidateTag`)

#### 캐시 레이어 도입
- **신규 `src/lib/data-cache.ts`**: `unstable_cache`로 데이터를 Vercel Data Cache에 저장, `revalidateTag`로 변경 시점에만 무효화
- 캐시 대상: 컬럼 설정(`column-settings`), 회사 정보(`footer-data`), CSO 매칭(`cso-matching`), 정산월 목록/합계(`settlement-data`)
- 변경 빈도: 정산/CSO 매칭(월 1회), 컬럼/회사(거의 없음) → 매 요청 DB 조회 불필요

#### 캐시 무효화 포인트
- `POST /api/upload`, `DELETE /api/settlements/month/[month]` → `invalidateSettlementCache()`
- `PUT /api/columns`, `DELETE /api/columns` → `invalidateColumnCache()`
- `POST /api/admin/cso-matching/upsert`, `DELETE /api/admin/cso-matching/upsert` → `invalidateCSOMatchingCache()`

#### 변경 전후 비교

| 항목 | v0.18.3 | v0.18.4 |
|------|---------|---------|
| 컬럼 설정 조회 | 매 요청 DB | **캐시** (변경 시만 무효화) |
| CSO 매칭 조회 | 매 요청 DB | **캐시** (변경 시만 무효화) |
| 정산월 목록/합계 | 매 요청 DB (RPC) | **캐시** (업로드/삭제 시만 무효화) |
| 회사 정보 | `cache: 'no-store'` 매번 DB | **캐시** (설정 변경 시만 무효화) |

---

## [0.18.3] - 2026-02-27

### Performance — 사이트 전체 성능 리뷰 반영

#### 통합 init API (가장 큰 개선)
- **신규 `GET /api/dashboard/init`**: columns + yearMonths + notice + settlements를 1회 API 호출로 반환
- 대시보드 초기 로드: **4개 API (getSession × 4, cold start × 4) → 1개 API (getSession × 1, cold start × 1)**
- 마스터 조회 초기 로드: **4개 API → 2개 API** (init + users)

#### 기타 최적화
- `/api/columns` route에서 `initialize()` 제거 — 매 요청마다 불필요한 DB 조회 1회 제거
- `SettlementTable`, `SummaryCards`에 `React.memo` 적용 — 부모 리렌더 시 불필요한 grouping 재계산 방지
- `useSettlementData` 훅 리팩토링 — init에서 첫 페이지 데이터까지 받아 이중 fetch 방지

#### 변경 전후 비교

| 항목 | v0.18.2 | v0.18.3 |
|------|---------|---------|
| 대시보드 초기 API 호출 | 4회 (columns + year-months + company + settlements) | **1회** (dashboard/init) |
| getSession() 호출 | 5회 (layout + API × 4) | **2회** (layout + init) |
| Vercel cold start 노출 | 4회 (각 API 별도 Lambda) | **1회** |
| SettlementTable 리렌더 | 매번 grouping 재계산 | React.memo로 변경 시에만 |

---

## [0.18.2] - 2026-02-27

### Performance

- **합계 계산 RPC 전환**: `fetchAllPaginated` → PostgreSQL `get_settlement_totals()` 함수 (SUM을 DB에서 직접 처리, 전체 행 로드 완전 제거)
- **정산월 목록 RPC 전환**: `fetchAllPaginated` → PostgreSQL `get_distinct_settlement_months()` 함수 (DISTINCT를 DB에서 직접 처리)
- **DB 인덱스 추가**: `CSO관리업체` 단일 인덱스 + `(정산월, CSO관리업체)` 복합 인덱스 — IN/EQ 필터 성능 개선
- **Supabase `.rpc()` 지원 추가**: supabase 래퍼에 `.rpc()` 메서드 노출

### 변경 전후 비교 (7,122행 기준)

| 작업 | v0.18.1 | v0.18.2 |
|------|---------|---------|
| 합계 계산 | 8회 API 왕복 (1000행씩 전체 로드) | **1회 RPC** (DB SUM) |
| 정산월 목록 | 8회 API 왕복 (전체 로드 후 JS Set) | **1회 RPC** (DB DISTINCT) |
| CSO 필터 | 인덱스 없음 (Full Scan) | **B-tree 인덱스** |

---

## [0.18.1] - 2026-02-27

### Performance

- **정산서 API — DB 레벨 페이지네이션**: 전건 로드 후 JS slice → Supabase `.range()` + `count: 'exact'` + `ilike` 검색으로 전환. 5만건 기준 응답 시간 수초 → ~100ms
- **합계(totals) 별도 경량 쿼리**: 정산 데이터 페이지네이션과 합계 계산을 `Promise.all`로 병렬 실행. 합계는 4개 숫자 컬럼만 조회
- **클라이언트 초기화 병렬화**: `useSettlementData` 훅의 columns/year-months/notice 3개 API를 `Promise.all`로 병렬 호출
- **마스터조회 지연 로딩**: 페이지 진입 시 정산 데이터 자동 로드 제거 → 거래처 선택 또는 "전체 거래처 조회" 클릭 후 50건만 DB에서 로드

### Changed

- **Repository 인터페이스 확장**: `findAllPaginated`, `findByCSOMatchingPaginated`, `getTotals`, `getTotalsByCSOMatching` 4개 메서드 추가
- **마스터조회 검색 UX**: 입력 즉시 JS 필터 → Enter/검색 버튼으로 서버 `ilike` 검색 전환
- **마스터조회 초기 화면**: 빈 테이블 대신 "거래처를 선택하여 조회를 시작하세요" 안내 카드 표시

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

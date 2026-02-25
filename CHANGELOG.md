# Changelog

이 프로젝트의 모든 주요 변경사항을 기록합니다.
[Semantic Versioning](https://semver.org/) 및 [Keep a Changelog](https://keepachangelog.com/) 형식을 따릅니다.

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

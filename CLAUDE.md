# csoweb

CSO 정산 포털 — B2B 제약 정산 수수료 조회 시스템

## 도메인 컨텍스트

### 비즈니스 배경
- **해결하는 문제**: 제약사 정산 데이터(SIT솔루션 엑셀)를 수작업으로 각 CSO 업체에 개별 전달하는 비효율. 업체명↔사업자번호 매칭 누락으로 정산 오류 발생.
- **CSO**: 위탁영업(Commissioned Sales Organization) — 제약사 대신 의약품을 영업하는 수탁업체

### 사용자와 업무 흐름
- **관리자(영업관리팀)**: SIT 엑셀 다운로드 → 포털 업로드 → CSO 매칭 확인 → 회원 승인 → 메일머지 발송
- **일반회원(CSO 업체)**: 로그인(사업자번호) → 정산서 조회(자사만) → 엑셀 다운로드

### 핵심 데이터
- **Settlement(정산)**: 엑셀 1행 = 1건의 처방/거래. 47개 한글 컬럼(처방월, 거래처명, 제품명, 수량, 수수료 등)
- **CSO Matching**: 엑셀 업체명(텍스트) ↔ 회원 사업자번호 매핑. 이것 없으면 회원이 자기 정산을 볼 수 없음
- **매칭 상태**: normal(정상) | unregistered(미등록) | pending_join(가입대기) | missing_match(매칭없음)

### 비즈니스 규칙
- CSO 회원은 cso_matching을 통해 자기 업체명에 해당하는 정산만 조회 가능
- 관리자는 전체 데이터 접근
- 이메일 5종: 가입신청→관리자, 승인/거부/정산업로드→회원, 비밀번호재설정→회원
- 이메일 발송 간격: 기본 6초, 배치 200ms

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript (strict)
- **DB/Auth**: Supabase (PostgreSQL) + 자체 JWT (jose)
- **UI**: Tailwind CSS + Radix UI (shadcn/ui) + Lucide Icons
- **Email**: Resend API + SMTP 하이웍스 (듀얼 프로바이더)
- **Excel**: exceljs (export) + xlsx (parse)
- **Test**: Vitest (28파일/184케이스) + Playwright (E2E)
- **Deploy**: Vercel (GitHub → main push 자동 배포) + Netlify (레거시)

## 주요 명령어

```bash
npm run dev          # 개발 서버 (localhost:3000)
npm run build        # 프로덕션 빌드
npm test             # vitest run (전체 테스트)
npm run test:watch   # vitest 워치 모드
npm run test:e2e     # Playwright E2E
```

## DDD 구조

```
src/
├── constants/        # 공유 상수 (defaults.ts: 매직 넘버/기본값, auth.ts: 쿠키명)
├── domain/           # 순수 타입 + 비즈니스 규칙 (프레임워크 무의존)
├── application/      # 유스케이스 (domain 조합)
├── infrastructure/   # Supabase Repository 구현체
├── hooks/            # 커스텀 훅 (useSettlementData, useFileUpload, useMailMerge)
├── components/       # UI 컴포넌트 (settlement/, admin/, shared/, ui/)
├── contexts/         # React Context (AuthContext)
├── lib/              # 유틸리티 (auth, email, excel, supabase)
└── app/              # Next.js App Router (API + 페이지)
    ├── (auth)/       # 로그인/회원가입 (error.tsx)
    ├── (main)/       # 메인 레이아웃 max-w-screen-xl (error.tsx, loading.tsx)
    │   ├── home/              # 사용자 홈 대시보드 — wide
    │   ├── dashboard/         # 정산 조회 — wide (loading.tsx)
    │   ├── monthly-summary/   # 월별 합계 — wide
    │   ├── (narrow)/          # max-w-3xl 라우트 그룹 (URL 미포함)
    │   │   └── profile/       # 내 정보
    │   └── admin/             # 관리자 페이지 — wide (loading.tsx)
    │       ├── columns/       # 컬럼 표시 설정
    │       ├── data/          # 데이터 관리
    │       ├── emails/        # 이메일 이력
    │       ├── integrity/     # CSO 매칭 무결성 검사
    │       ├── members/       # 회원 관리
    │       ├── master/        # 마스터 조회
    │       └── (narrow)/      # max-w-3xl 라우트 그룹 (URL 미포함)
    │           ├── upload/        # 정산서 업로드
    │           ├── email-settings/ # 이메일 설정
    │           ├── settings/      # 사이트 설정
    │           ├── system/        # 시스템 정보
    │           └── mailmerge/     # 메일머지
    └── api/          # REST API 라우트
```

## 컴포넌트 구조 (Phase 3 SRP 분리 결과)

### 대시보드 (dashboard/page.tsx ~150줄)
- `useSettlementData` — 상태 + 데이터 페칭 + 핸들러
- `SettlementFilters` — 조회 조건 (정산월, 검색, 컬럼 선택)
- `NoticeCard` — 공지사항 + 변수 치환
- `SummaryCards` — 수량/금액/수수료 합계 카드
- `SettlementTable` — 피벗 테이블 (CSO/거래처 그룹핑)
- `SettlementPagination` — 페이지네이션
- `SettlementSkeleton` — 스켈레톤 로딩 UI

### 업로드 (admin/(narrow)/upload/page.tsx ~150줄)
- `useFileUpload` — 상태 + 업로드/프리뷰 로직
- `DropZone` / `MappingDialog` / `UploadResultCard` / `EmailDialog`

### 메일머지 (admin/(narrow)/mailmerge/page.tsx ~143줄)
- `useMailMerge` — 상태 + SSE 연결 + 발송 로직
- `MailMergeForm` / `PreviewDialog` / `ProgressPanel` / `SendResult`

## 도메인: business_number 의미 구분

- `settlements.business_number` = **거래처**(약국) 사업자번호 (CSO BN이 아님!)
- `cso_matching.business_number` = **CSO 회원**의 사업자번호
- CSO BN 조회 경로: `settlements.CSO관리업체` → `cso_matching.cso_company_name`(JOIN) → `cso_matching.business_number`

## 알려진 예외

- `Settlement` 타입의 `[key: string]` 인덱스 시그니처: 47개 동적 한글 컬럼 접근에 필요. `getSettlementValue()` 유틸로 타입 안전한 접근 권장
- `src/lib/excel.ts:26`, `src/app/api/upload/preview/route.ts:97`: ExcelJS 타입 한계로 `any` 유지
- `src/lib/supabase/server.ts:20,45`: Supabase SSR 공식 패턴 — 쿠키 설정 실패 시 의도적 무시
- `src/lib/auth.ts:42`: JWT 검증 실패는 미인증 정상 분기

@../claude-dotfiles/CLAUDE.md

# csoweb

CSO 정산 포털 — B2B 제약 정산 수수료 조회 시스템

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript (strict)
- **DB/Auth**: Supabase (PostgreSQL) + 자체 JWT (jose)
- **UI**: Tailwind CSS + Radix UI (shadcn/ui) + Lucide Icons
- **Email**: Resend API + SMTP 하이웍스 (듀얼 프로바이더)
- **Excel**: exceljs (export) + xlsx (parse)
- **Test**: Vitest (27파일/171케이스) + Playwright (E2E)
- **Deploy**: Netlify (GitHub → main push 자동 배포)

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
    │   ├── dashboard/         # 정산 조회 — wide (loading.tsx)
    │   ├── monthly-summary/   # 월별 합계 — wide
    │   ├── (narrow)/          # max-w-3xl 라우트 그룹 (URL 미포함)
    │   │   └── profile/       # 내 정보
    │   └── admin/             # 관리자 페이지 — wide (loading.tsx)
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

## 알려진 예외

- `Settlement` 타입의 `[key: string]` 인덱스 시그니처: 47개 동적 한글 컬럼 접근에 필요. `getSettlementValue()` 유틸로 타입 안전한 접근 권장
- `src/lib/excel.ts:26`, `src/app/api/upload/preview/route.ts:97`: ExcelJS 타입 한계로 `any` 유지
- `src/lib/supabase/server.ts:20,45`: Supabase SSR 공식 패턴 — 쿠키 설정 실패 시 의도적 무시
- `src/lib/auth.ts:42`: JWT 검증 실패는 미인증 정상 분기

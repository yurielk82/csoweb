# 아키텍처

이 문서는 csoweb의 비즈니스 도메인과 코드 구조를 설명합니다. "왜 이렇게 만들었는가"에 초점을 맞춥니다.

## 비즈니스 도메인

### 전체 흐름

```
관리자가 SIT솔루션 Compare&Chart 엑셀 업로드
  → 파싱 후 DB 저장
  → CSO 매칭으로 업체별 데이터 분류
  → 일반 회원은 자사 정산만 조회/다운로드
```

### 핵심 개념 3가지

**1. 사업자등록번호 = 사용자 식별자**

B2B 서비스이므로 개인 이메일이 아닌 **법인 사업자등록번호**가 사용자를 구분하는 핵심 키입니다. 하나의 사업자번호에 하나의 계정이 매핑되며, 정산 데이터 조회 범위도 이 번호로 결정됩니다.

**2. CSO 매칭 — 이 시스템의 가장 독자적인 메커니즘**

제약사 정산 엑셀에는 CSO 업체의 **텍스트 이름**만 들어있고, 사업자번호는 없습니다. 따라서 "엑셀 속 업체명 ↔ 회원의 사업자번호"를 연결하는 매핑 테이블이 필요합니다. 이것이 CSO 매칭입니다.

```
엑셀: "한국CSO"  →  cso_matching 테이블  →  사업자번호 "1234567890"  →  회원 조회
```

매칭이 없으면 해당 정산 데이터는 어떤 회원에게도 보이지 않습니다. 관리자가 매칭을 관리하며, 무결성 검사(integrity check) 기능으로 누락된 매칭을 찾을 수 있습니다.

> 참조: `src/domain/cso-matching/types.ts`

**3. 한글 컬럼명**

정산 데이터의 컬럼명이 `처방월`, `거래처명`, `금액` 등 한글입니다. 제약업계 엑셀 양식을 그대로 반영한 것으로, DB 컬럼도 한글입니다. 처음 보면 낯설 수 있지만, 업계 실무자가 엑셀과 1:1로 대조할 수 있도록 의도된 설계입니다.

> 참조: `src/domain/settlement/types.ts` (47개 컬럼 정의)

---

## 코드 레이어 구조

DDD(Domain-Driven Design) 원칙을 따라 4개 레이어로 분리되어 있습니다.

### 디렉토리 맵

```
src/
├── domain/              ← 순수 타입 + 비즈니스 규칙 (프레임워크 의존 없음)
│   ├── user/            UserRepository 인터페이스, User 타입
│   ├── settlement/      SettlementRepository 인터페이스, Settlement 타입
│   ├── cso-matching/    CSOMatchingRepository 인터페이스
│   ├── column-setting/  ColumnSettingRepository 인터페이스
│   ├── email/           EmailLog 타입, EmailService 인터페이스
│   ├── company/         CompanyInfo 타입, EmailProvider 타입
│   └── password-reset-token/
│
├── application/         ← 유스케이스 (도메인 조합, 흐름 제어)
│   ├── user/            RegisterUserUseCase, ApproveUserUseCase
│   ├── settlement/      UploadSettlements, GetSettlements, Export, MonthlySummary
│   └── cso-matching/    UpsertMatchingUseCase
│
├── infrastructure/      ← 외부 서비스 구현체
│   ├── supabase/        Repository 구현체 (Supabase 클라이언트 사용)
│   ├── email/           (제거됨 — lib/email.ts에서 듀얼 프로바이더 직접 처리)
│   └── excel/           ExcelParser (엑셀 → 도메인 객체 변환)
│
├── hooks/               ← 커스텀 훅 (Phase 3 SRP 분리)
│   ├── useSettlementData.ts   대시보드 상태 + 데이터 페칭 + 핸들러
│   ├── useFileUpload.ts       업로드 상태 + 업로드/프리뷰 로직
│   └── useMailMerge.ts        메일머지 상태 + SSE 연결 + 발송
│
├── components/          ← UI 컴포넌트
│   ├── ui/              shadcn/ui 베이스 (Button, Card, Skeleton 등)
│   ├── shared/          공통 (Loading, Header, MainLayout)
│   ├── settlement/      정산 관련 (Filters, Table, SummaryCards, Pagination, NoticeCard, Skeleton)
│   └── admin/           관리자 관련 (upload/, mailmerge/, AdminSkeleton)
│
└── app/                 ← Next.js App Router (프레젠테이션)
    ├── error.tsx        루트 Error Boundary
    ├── robots.ts        크롤링 차단
    ├── sitemap.ts       사이트맵 (로그인만)
    ├── (auth)/          로그인, 회원가입 등 인증 페이지 + error.tsx
    ├── (main)/          메인 레이아웃 + error.tsx + loading.tsx
    │   ├── dashboard/   정산 조회 + loading.tsx (SettlementSkeleton)
    │   └── admin/       관리자 페이지 + loading.tsx (AdminSkeleton)
    └── api/             API 라우트 핸들러
```

### 의존성 방향

```
app/ (프레젠테이션)
  ↓ 호출
application/ (유스케이스)
  ↓ 호출
domain/ (인터페이스 정의) ← infrastructure/ (구현체)
```

핵심 규칙: **domain은 infrastructure를 직접 참조하지 않습니다.** Repository 인터페이스는 `domain/`에 정의하고, 구현체는 `infrastructure/supabase/`에 둡니다. 이렇게 하면 Supabase를 다른 DB로 교체해도 도메인 코드는 변경하지 않아도 됩니다.

### "어디를 고쳐야 하는가" 의사결정 표

| 변경 사항 | 건드릴 레이어 |
|-----------|--------------|
| 새 비즈니스 규칙 추가 | `domain/` (타입/검증) → `application/` (유스케이스) |
| 새 API 엔드포인트 | `app/api/` → 필요시 `application/` |
| DB 쿼리 수정/최적화 | `infrastructure/supabase/` |
| UI 변경 | `app/` 또는 `components/` |
| 새 외부 서비스 연동 | `infrastructure/` (새 서비스) → `domain/` (인터페이스) |
| 엑셀 파싱 로직 변경 | `infrastructure/excel/` |
| 이메일 템플릿 변경 | `lib/email.ts` (듀얼 프로바이더: Resend + SMTP) |
| 메일머지 변수/치환 로직 변경 | `app/api/email/mailmerge/route.ts` (POST/PATCH/PUT 핸들러) |

---

## 서버사이드 캐시 레이어

`src/lib/data-cache.ts`에서 Next.js `unstable_cache` + `revalidateTag`를 사용하여 자주 조회되지만 거의 변경되지 않는 데이터를 캐시합니다.

### 캐시 함수 → 태그 → 무효화 시점

| 캐시 함수 | 태그 | 무효화 트리거 |
|-----------|------|--------------|
| `getCachedColumns()` | `column-settings` | PUT/DELETE `/api/columns` |
| `getCachedCompanyInfo()` | `footer-data` | PUT/PATCH `/api/settings/company` |
| `getCachedMatchedNames()` | `cso-matching` | POST/DELETE `/api/admin/cso-matching/upsert` |
| `getCachedAvailableMonths()` | `settlement-data` | POST `/api/upload`, DELETE `/api/settlements/month/[month]` |
| `getCachedTotals()` | `settlement-data` | (위와 동일) |
| `getCachedCSOList()` | `user-data` | POST `/api/users/approve`, `/reject`, `/approve-batch` |

### 통합 init API (`GET /api/dashboard/init`)

대시보드와 마스터 조회의 초기 로드를 1회 API 호출로 처리합니다.

| 파라미터 | 기본값 | 설명 |
|---------|--------|------|
| `include_settlements` | `true` | `false`면 정산 데이터 생략 (마스터 조회 초기화용) |
| `include_cso_list` | `false` | `true`면 승인된 CSO 목록 포함 (마스터 조회 거래처 드롭다운) |
| `page`, `page_size` | `1`, `50` | 정산 데이터 페이지네이션 |
| `settlement_month` | 최신 월 | 정산월 필터 |
| `business_number` | - | 특정 CSO 필터 (관리자용) |

---

## 인증 흐름

인증은 Supabase Auth를 쓰지 않고 **자체 JWT**를 사용합니다.

### 미들웨어 (요청 가로채기)

`src/middleware.ts`에서 모든 요청의 쿠키를 확인합니다. 쿠키가 없으면 로그인 페이지로 리다이렉트합니다. 단, 공개 라우트(`/login`, `/register`, `/forgot-password` 등)는 예외입니다.

**중요**: 미들웨어는 쿠키 **존재 여부**만 확인합니다. JWT 서명 검증은 서버사이드(API 라우트)에서 수행합니다.

### 서버 (JWT 검증)

`src/lib/auth.ts`의 `getSession()`이 핵심입니다:
- 쿠키에서 JWT 토큰 추출
- `jose` 라이브러리로 HS256 서명 검증
- 만료 확인 (24시간)
- 유효하면 `UserSession` 객체 반환

### 클라이언트 (상태 관리)

`src/contexts/AuthContext.tsx`가 로그인 상태를 관리합니다:
- `localStorage`에 사용자 정보 저장 (`cso_auth_user` 키)
- React Context로 전역 제공
- SSR 안전성: 마운트 전까지 `null` (hydration 오류 방지)

### 권한 3요소

모든 권한 판단은 이 세 필드로 이루어집니다:

| 필드 | 의미 |
|------|------|
| `is_admin` | 관리자 여부 (정산 업로드, 회원 관리 등) |
| `is_approved` | 관리자 승인 완료 여부 (미승인이면 로그인 불가) |
| `must_change_password` | 첫 로그인 시 비밀번호 변경 강제 |

---

## 사용자 수명주기

```
회원가입 요청
  → is_approved = false (승인 대기)
  → 관리자가 승인 (is_approved = true)
  → 첫 로그인 시 비밀번호 변경 강제 (must_change_password = true)
  → 비밀번호 변경 완료 (must_change_password = false)
  → 정상 사용
```

관리자가 비밀번호를 초기화하면 `must_change_password`가 다시 `true`가 되어, 해당 회원은 다음 로그인 시 비밀번호를 변경해야 합니다.

---

## 데이터 접근 패턴

모든 라우트는 `infrastructure/supabase/`의 Repository Factory 또는 `application/` Use Case를 직접 사용합니다.

```typescript
// Repository Factory 직접 사용 (단순 CRUD)
import { getUserRepository } from '@/infrastructure/supabase'
const userRepo = getUserRepository()
const user = await userRepo.findByBusinessNumber('1234567890')

// Application Use Case 사용 (비즈니스 로직)
import { authenticateUser } from '@/application/auth'
const result = await authenticateUser(businessNumber, password)
```

---

## Error Boundary & Loading

Next.js App Router의 `error.tsx`와 `loading.tsx` 파일 규약을 사용합니다.

### Error Boundary (error.tsx)

| 파일 | 범위 |
|------|------|
| `src/app/error.tsx` | 루트 — 전체 앱 에러 |
| `src/app/(main)/error.tsx` | 메인 레이아웃 — 대시보드/관리자 에러 |
| `src/app/(auth)/error.tsx` | 인증 페이지 에러 (로그인 링크 포함) |

모든 Error Boundary는 `'use client'` 컴포넌트이며, `error`와 `reset` props를 받아 에러 메시지 표시 + 재시도 버튼을 제공합니다.

### Loading (loading.tsx)

| 파일 | 스켈레톤 |
|------|----------|
| `src/app/(main)/loading.tsx` | 일반 Loading 스피너 |
| `src/app/(main)/dashboard/loading.tsx` | `SettlementSkeleton` (카드 3개 + 테이블 10행) |
| `src/app/(main)/admin/loading.tsx` | `AdminSkeleton` (헤더 + 카드 + 테이블) |

App Router는 `loading.tsx`를 자동으로 React Suspense 경계로 감싸, 페이지 로딩 시 스켈레톤을 즉시 표시합니다.

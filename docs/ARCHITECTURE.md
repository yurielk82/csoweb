# 아키텍처

이 문서는 csoweb의 비즈니스 도메인과 코드 구조를 설명합니다. "왜 이렇게 만들었는가"에 초점을 맞춥니다.

## 비즈니스 도메인

### 전체 흐름

```
관리자가 제약사 정산 엑셀 업로드
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
│   ├── email/           EmailLog 타입
│   ├── company/         CompanyInfo 타입
│   └── password-reset-token/
│
├── application/         ← 유스케이스 (도메인 조합, 흐름 제어)
│   ├── user/            RegisterUserUseCase, ApproveUserUseCase
│   ├── settlement/      UploadSettlements, GetSettlements, Export, MonthlySummary
│   └── cso-matching/    UpsertMatchingUseCase
│
├── infrastructure/      ← 외부 서비스 구현체
│   ├── supabase/        Repository 구현체 (Supabase 클라이언트 사용)
│   ├── email/           ResendEmailService
│   └── excel/           ExcelParser (엑셀 → 도메인 객체 변환)
│
└── app/                 ← Next.js App Router (프레젠테이션)
    ├── (auth)/          로그인, 회원가입 등 인증 페이지
    ├── (main)/          메인 레이아웃 (대시보드, 정산 등)
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
| 이메일 템플릿 변경 | `infrastructure/email/` |

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

## Compatibility Layer 주의사항

`src/lib/db.ts`는 DDD 전환 과정에서 만든 **호환 레이어**입니다. 기존 코드가 `import { getUser } from '@/lib/db'` 형태로 쓰던 것을 깨뜨리지 않기 위해 남겨둔 래퍼입니다.

내부적으로는 `infrastructure/supabase/`의 Repository를 호출합니다.

**새 코드를 작성할 때는 `lib/db.ts`를 거치지 말고 `infrastructure/` 레이어를 직접 사용하세요.**

```typescript
// 권장하지 않음 (레거시)
import { getUserByBusinessNumber } from '@/lib/db'

// 권장 (직접 사용)
import { getUserRepository } from '@/infrastructure/supabase'
const userRepo = getUserRepository()
const user = await userRepo.findByBusinessNumber('1234567890')
```

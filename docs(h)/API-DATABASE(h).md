# API & 데이터베이스 레퍼런스

개발 중 수시로 찾아보는 참조 문서입니다.

## API 공통 규칙

**응답 형식**: 모든 API는 동일한 형태로 응답합니다.

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "에러 메시지" }
```

**인증**: 대부분의 API는 `cso_session` 쿠키에 JWT가 있어야 합니다. 서버에서 `getSession()`으로 JWT를 검증하고, 실패 시 401을 반환합니다.

**인증 레벨 범례**:
- `공개` — 인증 불필요
- `회원` — 로그인 필요 (승인된 회원)
- `관리자` — `is_admin = true` 필요

---

## API 엔드포인트

### 인증

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/auth/login` | 로그인 (JWT 쿠키 발급) | 공개 |
| POST | `/api/auth/register` | 회원가입 (승인 대기 상태로 생성) | 공개 |
| POST | `/api/auth/logout` | 로그아웃 (쿠키 삭제) | 회원 |
| GET | `/api/auth/session` | 현재 세션 정보 조회 | 회원 |
| POST | `/api/auth/forgot-password` | 비밀번호 재설정 메일 발송 | 공개 |
| POST | `/api/auth/reset-password` | 토큰으로 비밀번호 재설정 | 공개 |
| GET/POST | `/api/auth/reset-password-verify` | 재설정 토큰 유효성 검증 | 공개 |
| POST | `/api/auth/change-password` | 로그인 상태에서 비밀번호 변경 | 회원 |

### 정산

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/settlements` | 정산 데이터 조회 (필터/페이징) | 회원 |
| GET | `/api/settlements/export` | 정산 데이터 엑셀 다운로드 | 회원 |
| DELETE | `/api/settlements/month/[month]` | 특정 월 정산 데이터 삭제 | 관리자 |
| GET | `/api/settlements/stats` | 정산 통계 (건수, 합계 등) | 회원 |
| GET | `/api/settlements/monthly-summary` | 월별 합계 요약 | 회원 |
| GET | `/api/settlements/year-months` | 조회 가능한 정산월 목록 | 회원 |

### 업로드

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/upload/preview` | 엑셀 파싱 미리보기 (저장 안 함) | 관리자 |
| POST | `/api/upload` | 엑셀 파싱 후 DB 저장 확정 | 관리자 |

### 사용자 관리

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/users` | 전체 사용자 목록 | 관리자 |
| GET | `/api/users/[businessNumber]` | 특정 사용자 조회 | 관리자 |
| PUT | `/api/users/[businessNumber]` | 사용자 정보 수정 | 관리자 |
| DELETE | `/api/users/[businessNumber]` | 사용자 삭제 | 관리자 |
| POST | `/api/users/approve` | 단일 사용자 승인 | 관리자 |
| POST | `/api/users/approve-batch` | 다수 사용자 일괄 승인 | 관리자 |
| POST | `/api/users/reject` | 사용자 가입 거부 | 관리자 |
| POST | `/api/users/reset-password` | 사용자 비밀번호 초기화 | 관리자 |
| GET/PUT | `/api/users/profile` | 내 프로필 조회/수정 | 회원 |

### 이메일

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/email/logs` | 이메일 발송 이력 조회 | 관리자 |
| POST | `/api/email/mailmerge` | 정산 안내 메일 일괄 발송 | 관리자 |

### 관리자 (CSO 매칭)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/admin/cso-matching/upsert` | CSO 매칭 일괄 등록/수정 | 관리자 |
| POST | `/api/admin/cso-matching/integrity` | 매칭 무결성 검사 | 관리자 |

### 기타

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET/PUT | `/api/columns` | 정산 테이블 컬럼 표시 설정 | 관리자 |
| GET/PUT | `/api/settings/company` | 회사 기본 정보 설정 | 관리자 |
| GET | `/api/system/status` | 시스템 상태 확인 | 회원 |

---

## 데이터베이스 스키마

### 테이블 관계

```
users (사용자)
  │
  ├── 1:N ── settlements (정산 데이터)     ← business_number로 연결
  │
  └── 1:N ── cso_matching (CSO 매칭)       ← business_number로 연결
                │
                └── settlements.거래처명과 cso_matching.cso_company_name으로
                    업체명 ↔ 사업자번호 매핑

column_settings (컬럼 표시 설정)           ← 독립 (전역 설정)
company_info (회사 정보)                   ← 독립 (전역 설정)
email_logs (이메일 발송 이력)              ← 독립 (감사 로그)
password_reset_tokens (비밀번호 재설정)    ← users.email과 연결
```

### 핵심 테이블: users

사용자 계정 및 권한 정보.

| 주요 컬럼 | 설명 |
|-----------|------|
| `id` | UUID (PK) |
| `business_number` | 사업자등록번호 10자리 (UK, 사실상의 식별자) |
| `company_name` | 업체명 |
| `email` | 대표 이메일 |
| `password_hash` | bcrypt 해시 (salt 12) |
| `is_admin` | 관리자 여부 |
| `is_approved` | 승인 여부 |
| `must_change_password` | 비밀번호 변경 강제 여부 |

> 타입 정의: `src/domain/user/types.ts`

### 핵심 테이블: settlements

정산 데이터. 제약사 엑셀에서 업로드된 원본 데이터.

| 주요 컬럼 | 설명 |
|-----------|------|
| `id` | 자동 증가 정수 (PK) |
| `business_number` | CSO 매칭을 통해 결정된 사업자번호 |
| `처방월`, `정산월` | 정산 기간 |
| `거래처명` | 엑셀 원본 업체명 (CSO 매칭의 키) |
| `금액`, `수량`, `단가` | 정산 금액 정보 |
| `제약_수수료`, `담당_수수료` | 수수료 |
| `upload_year_month` | 업로드 시점의 연월 |

컬럼이 47개로, 대부분 한글입니다. 전체 목록은 타입 정의 파일을 참조하세요.

> 타입 정의: `src/domain/settlement/types.ts`

### 핵심 테이블: cso_matching

엑셀 속 업체명과 회원 사업자번호를 연결하는 매핑 테이블.

| 컬럼 | 설명 |
|------|------|
| `cso_company_name` | 엑셀에 적힌 업체명 (PK의 일부) |
| `business_number` | 매핑된 사업자등록번호 |
| `created_at` | 생성일 |
| `updated_at` | 수정일 |

> 타입 정의: `src/domain/cso-matching/types.ts`

### 보조 테이블

| 테이블 | 설명 | 타입 정의 |
|--------|------|-----------|
| `column_settings` | 정산 테이블 컬럼의 표시 순서/가시성 설정 | `src/domain/column-setting/types.ts` |
| `company_info` | 포털 운영 회사 기본 정보 | `src/domain/company/types.ts` |
| `email_logs` | 이메일 발송 이력 (상태, 에러 메시지 등) | `src/domain/email/types.ts` |
| `password_reset_tokens` | 비밀번호 재설정 토큰 (만료 시간 포함) | `src/domain/password-reset-token/types.ts` |

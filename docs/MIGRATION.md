# 이관 매뉴얼

프로젝트 담당자 변경 또는 인프라를 새 환경으로 이관할 때 사용하는 절차서입니다.

> **관련 문서**
> - 로컬 환경 세팅 → [ONBOARDING.md](ONBOARDING.md)
> - 일상 운영/트러블슈팅 → [OPERATIONS.md](OPERATIONS.md)
> - API/DB 스키마 → [API-DATABASE.md](API-DATABASE.md)

---

## 목차

1. [사전 준비](#part-1-사전-준비)
2. [GitHub 이관](#part-2-github-이관)
3. [Supabase 이관](#part-3-supabase-이관)
4. [Netlify 이관](#part-4-netlify-이관)
5. [외부 서비스 설정](#part-5-외부-서비스-설정)
6. [이관 후 검증 체크리스트](#part-6-이관-후-검증-체크리스트)
7. [환경변수 전체 레퍼런스](#part-7-환경변수-전체-레퍼런스)
8. [코드 레벨 변경사항](#part-8-코드-레벨-변경사항)
9. [다음(Daum) 주소 API](#part-9-다음daum-주소-api)
10. [초기화 스크립트](#part-10-초기화-스크립트)
11. [커스텀 도메인 / DNS](#part-11-커스텀-도메인--dns)

---

## Part 1: 사전 준비

### 필요 계정 및 권한

| 서비스 | 필요 권한 | 비고 |
|--------|-----------|------|
| **GitHub** | Repository Admin (transfer 시) 또는 Fork 권한 | 조직 저장소면 Owner 권한 필요 |
| **Supabase** | Organization Owner (transfer 시) 또는 새 프로젝트 생성 권한 | Free Tier 사용 중 |
| **Netlify** | Team Owner (transfer 시) 또는 새 사이트 생성 권한 | |
| **Resend** | 계정 + 도메인 인증 | 이메일 발송용 |
| **data.go.kr** | 계정 + API 활용신청 승인 | 국세청 NTS API, HIRA API |
| **Vercel** (선택) | 프로젝트 접근 권한 | 개발자 테스트 배포용 병행 사용 중 |

### 현재 환경 정보 수집 체크리스트

이관 전 현재 환경에서 다음 정보를 수집합니다:

- [ ] Supabase 프로젝트 URL (`https://xxxxx.supabase.co`)
- [ ] Supabase API 키 3종 (URL, anon key, service role key)
- [ ] Netlify 사이트 URL 및 사이트 이름
- [ ] Netlify 환경변수 10개 값 (Part 7 참조)
- [ ] GitHub Secrets 2개 (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- [ ] Resend API 키 및 인증 도메인
- [ ] NTS API 키 (data.go.kr)
- [ ] HIRA API 키 (data.go.kr, 선택)
- [ ] 커스텀 도메인 DNS 레코드 (사용 시)
- [ ] 현재 JWT_SECRET 값
- [ ] SMTP 설정 (DB `company_settings` 테이블에 저장됨 — 관리자 대시보드에서 확인)
- [ ] Vercel 프로젝트 URL (사용 시)

---

## Part 2: GitHub 이관

### 방법 A: Repository Transfer (권장)

GitHub Settings → Danger Zone → Transfer repository로 새 소유자/조직에 이전합니다.

- 이슈, PR, 위키, Stars, 설정이 모두 이전됨
- Collaborators는 수동으로 재초대 필요

### 방법 B: Fork

원본 저장소를 Fork하여 독립 저장소로 운영합니다.

### GitHub Secrets 설정

Repository → Settings → Secrets and variables → Actions에서 2개 설정:

| Secret 이름 | 값 | 용도 |
|-------------|----|----|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | keep-alive workflow |
| `SUPABASE_ANON_KEY` | Supabase anon key | keep-alive workflow |

### GitHub Actions 확인

`.github/workflows/keep-supabase-alive.yml`이 정상 동작하는지 확인합니다:

- **스케줄**: 2시간마다 (`cron: '0 0 */2 * *'`)
- **동작**: Supabase REST API에 `users?select=id&limit=1` 요청
- **목적**: Free Tier Supabase의 7일 미활동 자동 휴면 방지

Actions 탭에서 수동 실행(workflow_dispatch)으로 테스트:

```
GitHub → Actions → "Keep Supabase Alive" → Run workflow
```

### Branch Protection Rules

현재 별도의 브랜치 보호 규칙이 설정되어 있지 않습니다. 필요에 따라 `main` 브랜치에 보호 규칙을 설정하세요.

---

## Part 3: Supabase 이관

### 방법 A: 소유권 이전 (Organization Transfer)

같은 Supabase 프로젝트를 유지하면서 조직/소유자만 변경하는 방법입니다.

1. Supabase 대시보드 → Organization Settings → General
2. Transfer project to another organization
3. 새 소유자가 Organization에 초대되어 있어야 함

이 경우 URL, API 키가 변경되지 않으므로 환경변수 수정이 불필요합니다.

### 방법 B: 새 프로젝트 생성 후 데이터 마이그레이션

#### 1. 새 프로젝트 생성

Supabase 대시보드에서 새 프로젝트를 생성합니다.
- Region: `Northeast Asia (Tokyo)` 권장 (Netlify Functions 리전과 동일)
- Database password를 안전하게 보관

#### 2. 스키마 생성 순서

테이블 간 의존성이 있으므로 아래 순서로 생성합니다:

```
1. users                    ← 기본 사용자 테이블
2. cso_matching             ← users.business_number 참조
3. settlements              ← users.business_number 참조
4. column_settings          ← 독립 (전역 설정)
5. company_settings         ← 독립 (전역 설정, DB상 company_info)
6. email_logs               ← 독립 (감사 로그)
7. password_reset_tokens    ← users.email 참조
8. hospital_master          ← 독립 (선택, Edge Function용)
```

> DB 스키마 상세는 [API-DATABASE.md](API-DATABASE.md#데이터베이스-스키마)를 참조하세요.

#### 3. SQL 마이그레이션 파일 적용 순서

`supabase/migrations/` 디렉토리의 파일을 타임스탬프 순서대로 적용합니다:

```
1. 20240209_setup_hospital_sync_cron.sql    ← pg_cron/pg_net 확장, 병원 동기화 크론
2. 20260218_fix_cso_matching_rls.sql        ← cso_matching RLS 정책 추가
3. 20260218_fix_rls_auth_initialization.sql ← RLS 성능 최적화 (4개 테이블)
4. 20260225_add_account_lockout.sql         ← users 테이블 잠금 컬럼 추가
```

Supabase SQL Editor에서 순서대로 실행하거나, Supabase CLI를 사용합니다:

```bash
supabase db push
```

#### 4. RLS 정책 설정

모든 테이블에 service_role 전체 접근 정책이 필요합니다. 앱은 서버 사이드에서 `SUPABASE_SERVICE_ROLE_KEY`로 접근하므로 RLS를 우회합니다.

마이그레이션 파일 2, 3번에서 아래 테이블의 정책이 설정됩니다:
- `cso_matching`
- `company_settings`
- `hospital_master`
- `hospital_sync_logs`
- `password_reset_tokens`

나머지 테이블(`users`, `settlements`, `column_settings`, `email_logs`)도 RLS가 활성화되어 있다면 동일한 정책을 추가합니다:

```sql
CREATE POLICY "Service role full access" ON public.<table_name>
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');
```

#### 5. 데이터 Export/Import

**pg_dump/pg_restore 방식:**

```bash
# 기존 DB에서 export
pg_dump -h <old-host> -U postgres -d postgres \
  --data-only --no-owner --no-privileges \
  -t users -t cso_matching -t settlements \
  -t column_settings -t company_info -t email_logs \
  -t password_reset_tokens \
  > data_dump.sql

# 새 DB에 import
psql -h <new-host> -U postgres -d postgres < data_dump.sql
```

**Supabase CLI 방식:**

```bash
# 기존 프로젝트에서
supabase db dump --data-only -f data_dump.sql

# 새 프로젝트에
psql "postgresql://postgres:<password>@<new-host>:5432/postgres" < data_dump.sql
```

> Supabase 연결 정보는 대시보드 → Settings → Database에서 확인합니다.

#### 6. Edge Function 배포 (sync-hospitals)

```bash
# Supabase CLI 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref <new-project-ref>

# Edge Function 배포
supabase functions deploy sync-hospitals
```

Edge Function은 `supabase/functions/sync-hospitals/` 디렉토리에 있으며, 건강보험심사평가원 API에서 병원 마스터 데이터를 동기화합니다.

> 참고: Supabase Storage는 미사용 (엑셀 파일은 메모리 파싱 후 DB 저장). Storage 이관은 불필요합니다.

#### 7. API 키 확보

새 프로젝트 대시보드 → Settings → API에서 3개 키를 확보합니다:

| 키 | 환경변수 | 용도 |
|----|----------|------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 접속 URL |
| anon (public) key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트용 공개 키 |
| service_role key | `SUPABASE_SERVICE_ROLE_KEY` | 서버용 비밀 키 (RLS 우회) |

---

## Part 4: Netlify 이관

### 방법 A: 소유권 이전

1. Netlify Team Settings → Members에서 새 담당자를 Owner로 초대
2. 기존 Owner 권한을 조정하거나 제거

이 경우 사이트 URL, 환경변수, 배포 설정이 모두 유지됩니다.

### 방법 B: 새 사이트 생성

#### 1. GitHub 연동

Netlify → Add new site → Import an existing project → GitHub

- Repository: `csoweb`
- Branch to deploy: `main`
- Build command: `npm run build`
- Publish directory: `.next`

#### 2. 환경변수 설정 (10개)

Site settings → Environment variables에서 설정:

| 변수 | 값 예시 | 필수 |
|------|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJ...` | O |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJ...` | O |
| `JWT_SECRET` | (32자 이상 랜덤 문자열) | O |
| `RESEND_API_KEY` | `re_xxxxxxxx` | O |
| `EMAIL_FROM` | `CSO Portal <noreply@your-domain.com>` | O |
| `ADMIN_EMAIL` | `admin@your-domain.com` | O |
| `NEXT_PUBLIC_BASE_URL` | `https://your-production-url.com` | O |
| `NTS_API_KEY` | data.go.kr 발급 키 | O |
| `HIRA_API_KEY` | data.go.kr 발급 키 | 선택 |

> `JWT_SECRET`은 기존 환경과 동일한 값을 사용해야 기존 사용자 세션이 유효합니다. 새 프로젝트라면 새로 생성해도 됩니다.

#### 3. `netlify.toml` 확인

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[functions]
  region = "ap-northeast-1"    # 도쿄 (Supabase 리전과 가까운 곳)

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

파일이 저장소에 포함되어 있으므로 별도 수정은 불필요합니다.

#### 4. 커스텀 도메인 설정

커스텀 도메인을 사용하는 경우:

1. Netlify → Domain settings → Add custom domain
2. DNS 제공업체에서 CNAME 또는 A 레코드 설정
3. Netlify가 자동으로 SSL 인증서(Let's Encrypt) 발급

> 자세한 내용은 [Part 11: 커스텀 도메인 / DNS](#part-11-커스텀-도메인--dns)를 참조하세요.

#### 5. 배포 트리거 확인

- GitHub `main` 브랜치에 push하면 Netlify가 자동 빌드/배포
- Netlify 대시보드 → Deploys → Trigger deploy → Deploy site로 수동 배포 가능

---

## Part 5: 외부 서비스 설정

### Resend (이메일 API)

1. [resend.com](https://resend.com) 회원가입
2. Settings → API Keys → Create API Key
3. Domains → Add Domain → DNS 레코드 추가 (SPF, DKIM)
4. 도메인 인증 완료 후 실제 발신 가능

발급받은 API 키를 `RESEND_API_KEY` 환경변수에 설정합니다.

> 도메인 인증 전에는 `onboarding@resend.dev`에서만 발신 가능 (테스트용).

### 국세청 NTS API

사업자등록번호 실시간 인증에 사용합니다 (`/api/verify-biz`).

1. [data.go.kr](https://www.data.go.kr) 회원가입
2. [국세청 사업자등록정보 진위확인 및 상태조회 서비스](https://www.data.go.kr/data/15081808/openapi.do) 활용신청
3. 승인 후 마이페이지에서 API 키 확인
4. `NTS_API_KEY` 환경변수에 설정

> API 엔드포인트: `https://api.odcloud.kr/api/nts-businessman/v1/status`

### 건강보험심사평가원 HIRA API (선택)

병원 마스터 데이터 동기화에 사용합니다 (Edge Function `sync-hospitals`).

1. [data.go.kr](https://www.data.go.kr) 에서 활용신청
   - [병원정보서비스](https://www.data.go.kr/data/15001698/openapi.do)
   - [약국정보서비스](https://www.data.go.kr/data/15001699/openapi.do)
2. 승인 후 API 키 확인
3. `HIRA_API_KEY` 환경변수에 설정

> HIRA API를 사용하지 않으면 병원 자동완성 기능이 비활성화됩니다. 나머지 기능에는 영향 없습니다.

### SMTP (선택)

Resend 외에 자체 SMTP 서버로 이메일을 발송할 수 있습니다.

- 환경변수가 아닌 **DB(`company_settings` 테이블)에 저장**
- 관리자 대시보드 → 사이트 설정 → 이메일 발송 설정에서 구성
- 프로바이더를 `smtp`로 변경하면 SMTP 발송으로 전환
- 하이웍스 예시: `smtps.hiworks.com:465` (SSL)

---

## Part 6: 이관 후 검증 체크리스트

### 빌드 & 테스트

- [ ] `npm run build` — 빌드 성공 확인
- [ ] `npm test` — 27개 파일, 171개 테스트 케이스 통과 확인

### 기능 검증

- [ ] **로그인** — 사업자등록번호 + 비밀번호로 로그인
- [ ] **회원가입** — 사업자번호 국세청 인증 → 가입 신청 → 관리자 승인 → 로그인
- [ ] **정산 데이터 조회** — 월별 필터, 페이징, 검색 정상 동작
- [ ] **정산 엑셀 다운로드** — 다운로드 파일 열기 확인
- [ ] **이메일 발송** — 관리자 → 사이트 설정 → 이메일 발송 설정 → 테스트 발송
- [ ] **CSO 매칭** — 관리자 → CSO 매칭 관리에서 매핑 확인

### 인프라 검증

- [ ] **Netlify 배포** — `main` push 후 자동 배포 트리거 확인
- [ ] **GitHub Actions** — keep-alive workflow 수동 실행 후 성공 확인
- [ ] **시스템 상태** — `/api/system/status` 엔드포인트로 전체 상태 확인
  - Supabase 연결 상태
  - NTS API 키 설정 여부
  - HIRA API 키 설정 여부
  - 이메일 프로바이더 상태 (Resend/SMTP)

### 보안 검증

- [ ] 환경변수에 실제 키 값이 설정되었는지 확인 (placeholder 아닌 실제 값)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트에 노출되지 않는지 확인 (`NEXT_PUBLIC_` 접두사 없음)
- [ ] HTTPS 적용 여부 확인 (커스텀 도메인 사용 시)

---

## Part 7: 환경변수 전체 레퍼런스

### 필수 환경변수 (10개)

| # | 변수 | 용도 | 획득 경로 | 보안 등급 | 설정 위치 |
|---|------|------|-----------|-----------|-----------|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase 대시보드 → Settings → API | 공개 | Netlify + `.env.local` + GitHub Secrets(`SUPABASE_URL`) |
| 2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 (클라이언트용) | 같은 위치 | 공개 | Netlify + `.env.local` + GitHub Secrets(`SUPABASE_ANON_KEY`) |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 (RLS 우회) | 같은 위치 | **비밀** | Netlify + `.env.local` |
| 4 | `JWT_SECRET` | JWT 서명 키 (HS256, 32자 이상) | 자체 생성 (`openssl rand -base64 48`) | **비밀** | Netlify + `.env.local` |
| 5 | `RESEND_API_KEY` | Resend 이메일 발송 API 키 | [resend.com](https://resend.com) → API Keys | **비밀** | Netlify + `.env.local` |
| 6 | `EMAIL_FROM` | 발신자 이메일 주소 | 형식: `이름 <email@domain>` | 일반 | Netlify + `.env.local` |
| 7 | `ADMIN_EMAIL` | 관리자 알림 수신 이메일 | 관리자 이메일 주소 | 일반 | Netlify + `.env.local` |
| 8 | `NEXT_PUBLIC_BASE_URL` | 사이트 기본 URL (이메일 링크에 사용) | 프로덕션 도메인 | 공개 | Netlify + `.env.local` |
| 9 | `NTS_API_KEY` | 국세청 사업자등록정보 API 키 | [data.go.kr](https://www.data.go.kr/data/15081808/openapi.do) | **비밀** | Netlify + `.env.local` |
| 10 | `HIRA_API_KEY` | 건강보험심사평가원 병원/약국 API 키 | [data.go.kr](https://www.data.go.kr/data/15001698/openapi.do) | **비밀** | Netlify + `.env.local` |

### 선택 환경변수

| 변수 | 용도 | 비고 |
|------|------|------|
| `HIRA_API_KEY` | 병원 마스터 동기화 | 미설정 시 병원 자동완성 비활성화, 나머지 기능 정상 |

> `NEXT_PUBLIC_` 접두사가 붙은 변수만 브라우저에 노출됩니다. 나머지는 서버(Netlify Functions)에서만 접근 가능합니다.

### GitHub Secrets (Netlify 환경변수와 별도)

| Secret 이름 | 대응하는 환경변수 | 용도 |
|-------------|-------------------|------|
| `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL`과 동일한 값 | keep-alive workflow |
| `SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY`와 동일한 값 | keep-alive workflow |

---

## Part 8: 코드 레벨 변경사항

Supabase 프로젝트를 새로 생성한 경우(방법 B), 아래 코드 레벨 확인이 필요합니다.

### CSP 도메인 확인

`src/middleware.ts`의 CSP 설정에서 `connect-src` 지시문을 확인합니다:

```typescript
// src/middleware.ts:75
"connect-src 'self' https://*.supabase.co",
```

현재 `https://*.supabase.co` 와일드카드를 사용하므로, Supabase 프로젝트 URL이 `*.supabase.co` 형태면 변경 불필요합니다. 커스텀 도메인을 사용하는 경우 해당 도메인을 추가하세요.

### `NEXT_PUBLIC_BASE_URL` 변경

이메일 본문의 링크(로그인, 비밀번호 재설정 등)에 사용됩니다.

```typescript
// src/lib/email.ts:17
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
```

프로덕션 도메인이 변경되면 Netlify 환경변수의 `NEXT_PUBLIC_BASE_URL`을 신규 도메인으로 반드시 업데이트하세요.

### Vercel (테스트 배포)

빌드 시간 여유로 개발자 테스트용으로 Vercel을 병행 사용 중입니다.

- `@vercel/speed-insights` 패키지가 의도적으로 유지되어 있음 (`src/app/layout.tsx`)
- 이관 시 Vercel 프로젝트 접근 권한도 함께 이전 필요
- Vercel을 사용하지 않을 경우:
  1. `npm uninstall @vercel/speed-insights`
  2. `src/app/layout.tsx`에서 `<SpeedInsights />` 컴포넌트 제거

---

## Part 9: 다음(Daum) 주소 API

회원가입과 프로필 완성 페이지에서 주소 검색에 사용합니다.

- 사용 위치:
  - `src/app/(auth)/register/page.tsx` — 회원가입
  - `src/app/(auth)/complete-profile/page.tsx` — 프로필 완성
- CSP에 `https://t1.daumcdn.net`이 `script-src`에 허용되어 있음
- **API 키 없이 동작** (무료 공개 API)
- 이관 시 특별한 작업 없음 — 동작 확인만 하면 됩니다

---

## Part 10: 초기화 스크립트

새 DB를 초기화하거나 데이터를 세팅할 때 사용하는 스크립트입니다.

### 스크립트 목록

| 스크립트 | 용도 | 실행 조건 |
|----------|------|-----------|
| `scripts/hospital_master_ddl.sql` | 병원 마스터 테이블 DDL | 새 DB에서 hospital_master 테이블 필요 시 |
| `scripts/upload_hospital_data.ts` | 병원 데이터 벌크 업로드 | hospital_master 초기 데이터 적재 시 |
| `scripts/seed-users.ts` | CSO 매칭 기반 사용자 일괄 생성 | 테스트 계정 또는 초기 사용자 대량 생성 시 |
| `scripts/rehash-passwords.ts` | 비밀번호 정책 변경 시 재해싱 | bcrypt cost 변경 등 보안 정책 업데이트 시 |

### 신규 DB 초기화 실행 순서

1. 스키마 생성 (Part 3의 테이블 생성 순서 참조)
2. SQL 마이그레이션 4개 적용
3. `scripts/hospital_master_ddl.sql` 실행 (병원 마스터 필요 시)
4. `scripts/upload_hospital_data.ts` 실행 (병원 데이터 적재)
5. `scripts/seed-users.ts` 실행 (초기 사용자 생성, 필요 시)
6. 기존 데이터가 있다면 pg_dump/pg_restore로 이관 (Part 3 참조)

> 스크립트 실행 시 `.env.local`에 Supabase 환경변수가 설정되어 있어야 합니다.

---

## Part 11: 커스텀 도메인 / DNS

### 현재 상태

- `netlify.toml`에는 도메인 설정이 없음 (Netlify 대시보드에서 관리)
- 커스텀 도메인을 사용하는 경우 Netlify 대시보드에서 설정됨

### 이관 절차

1. **기존 DNS 레코드 캡처**: 현재 도메인의 DNS 설정을 기록
   - CNAME 레코드 (예: `www` → `xxx.netlify.app`)
   - A 레코드 (필요 시)
   - 기타 TXT 레코드 (이메일 인증용 SPF, DKIM 등)

2. **새 Netlify 사이트에 도메인 추가**:
   - Site settings → Domain management → Add custom domain
   - Netlify가 자동으로 Let's Encrypt SSL 인증서 발급

3. **DNS 레코드 변경**:
   - DNS 제공업체에서 CNAME/A 레코드를 새 Netlify 사이트로 변경
   - TTL이 낮으면(300초) 빠르게 전파됨

4. **`NEXT_PUBLIC_BASE_URL` 업데이트**:
   - 도메인이 변경되면 Netlify 환경변수의 `NEXT_PUBLIC_BASE_URL`도 업데이트
   - 이메일 본문 링크가 올바른 도메인을 가리키는지 확인

5. **Resend 도메인 인증** (해당 시):
   - 도메인이 변경되면 Resend에서 새 도메인 인증 필요
   - DNS에 SPF, DKIM 레코드 추가

---

## 참고사항

### Supabase Storage

현재 미사용입니다. 엑셀 파일은 업로드 시 메모리에서 파싱한 후 DB에 저장하므로 Storage 이관은 불필요합니다.

### 기존 문서 참조

| 작업 | 참조 문서 |
|------|-----------|
| 로컬 개발 환경 세팅 | [ONBOARDING.md](ONBOARDING.md) |
| 이관 후 일상 운영/트러블슈팅 | [OPERATIONS.md](OPERATIONS.md) |
| API 엔드포인트/DB 스키마 상세 | [API-DATABASE.md](API-DATABASE.md) |
| 코드 아키텍처 | [ARCHITECTURE.md](ARCHITECTURE.md) |

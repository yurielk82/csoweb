# 배포 & 운영

배포 파이프라인, 인프라 구성, 문제 해결 방법을 다룹니다.

## 배포 파이프라인

GitHub `main` 브랜치에 push하면 Netlify가 자동으로 빌드·배포합니다.

```
git push origin main  →  Netlify 감지  →  npm run build  →  배포 완료
```

빌드 설정은 `netlify.toml`에 정의되어 있습니다:
- 빌드 명령: `npm run build`
- Node 버전: 18
- Functions 리전: `ap-northeast-1` (도쿄)
- 플러그인: `@netlify/plugin-nextjs`

> 참조: `netlify.toml`

### 배포 전 체크리스트

1. `npm run build` — 로컬에서 빌드 성공 확인
2. `npm run lint` — lint 에러 없는지 확인
3. Netlify 대시보드에서 환경변수가 최신인지 확인 (특히 새 변수 추가 시)

---

## 환경변수 관리

| 변수 | 용도 | 설정 위치 |
|------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Netlify + `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 | Netlify + `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 (RLS 우회) | Netlify + `.env.local` |
| `JWT_SECRET` | JWT 서명 키 | Netlify + `.env.local` |
| `RESEND_API_KEY` | Resend 이메일 API 키 | Netlify + `.env.local` |
| `EMAIL_FROM` | 발신자 이메일 | Netlify + `.env.local` |
| `ADMIN_EMAIL` | 관리자 알림 수신 이메일 | Netlify + `.env.local` |
| `NEXT_PUBLIC_BASE_URL` | 사이트 기본 URL | Netlify(프로덕션 URL) + `.env.local`(localhost) |

`NEXT_PUBLIC_` 접두사가 붙은 변수만 클라이언트(브라우저)에 노출됩니다. 나머지는 서버에서만 접근 가능합니다.

---

## 인프라 구성 요소

### Supabase (데이터베이스)

- **역할**: PostgreSQL 데이터베이스 + REST API
- **인증**: Supabase Auth는 사용하지 않음 (자체 JWT)
- **RLS**: 일부 테이블에 적용됨. 서비스 키 사용 시 RLS 우회
- **플랜**: Free Tier (7일 미활동 시 자동 휴면 — 아래 워크플로우로 방지)

### GitHub Actions: Supabase 휴면 방지

Free Tier Supabase는 7일간 활동이 없으면 자동 일시정지됩니다. 이를 방지하기 위해 2시간마다 간단한 쿼리를 보내는 워크플로우가 동작합니다.

- **스케줄**: 2시간마다 (`cron: '0 0 */2 * *'`)
- **동작**: Supabase REST API에 `users?select=id&limit=1` 요청
- **Secrets**: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (GitHub repository secrets)

> 참조: `.github/workflows/keep-supabase-alive.yml`

### Supabase Edge Function: sync-hospitals

병원 마스터 데이터를 건강보험심사평가원 API에서 동기화하는 Edge Function입니다.

- **호출**: POST 요청 (인증 헤더 또는 크론 헤더 필요)
- **동작**: 공공 API에서 병원 정보를 페이지 단위로 가져와 `hospital_master` 테이블에 upsert
- **설정**: 1000건/페이지, 500건/배치, 3회 재시도

> 참조: `supabase/functions/sync-hospitals/`

---

## 트러블슈팅

### 증상별 대응표

| 증상 | 원인 | 확인 방법 | 해결 |
|------|------|-----------|------|
| 로그인 불가 — "승인 대기" | 관리자 미승인 | DB `users` 테이블에서 `is_approved` 확인 | 관리자가 승인 처리 |
| 로그인 불가 — 비밀번호 오류 | 비밀번호 불일치 또는 초기화됨 | 관리자가 비밀번호 초기화 여부 확인 | 비밀번호 재설정 또는 관리자 초기화 |
| 정산 데이터 0건 | CSO 매칭 누락 | 관리자 → CSO 매칭 관리에서 무결성 검사 | 해당 업체의 매칭 추가 |
| 업로드 실패 | SIT솔루션 Compare&Chart 엑셀 형식 불일치 (컬럼명, 시트 구조) | 에러 메시지에서 실패 행/컬럼 확인 | SIT솔루션에서 엑셀 재다운로드 후 업로드 |
| 빌드 실패 (Netlify) | TypeScript 에러 또는 의존성 문제 | Netlify 대시보드 → Deploy → 빌드 로그 | 로컬 `npm run build`로 재현 후 수정 |
| 이메일 미발송 | Resend API 키 만료 또는 일일 한도 초과 | `/api/email/logs`에서 상태 확인 | Resend 대시보드에서 키 재발급 |
| Supabase 503 에러 | Free Tier 자동 휴면 | Supabase 대시보드에서 프로젝트 상태 확인 | 대시보드에서 수동 복원 (몇 분 소요) |
| 정산 금액 불일치 | 업로드 시 숫자 파싱 오류 | 원본 엑셀과 DB 데이터 대조 | 해당 월 삭제 후 재업로드 |

---

## 로그 확인 경로

| 로그 종류 | 확인 경로 |
|-----------|-----------|
| **빌드 로그** | Netlify 대시보드 → Deploys → 해당 배포 클릭 |
| **런타임 로그** (API 에러 등) | Netlify 대시보드 → Logs → Functions |
| **DB 쿼리 로그** | Supabase 대시보드 → Logs → Postgres |
| **이메일 발송 이력** | 앱 내 `/api/email/logs` 또는 Resend 대시보드 |
| **시스템 상태** | `/api/system/status` API 호출 |
| **Edge Function 로그** | Supabase 대시보드 → Edge Functions → sync-hospitals → Logs |

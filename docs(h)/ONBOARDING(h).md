# 온보딩 가이드

로컬 환경에서 프로젝트를 실행하기까지의 과정입니다.

## 사전 요구사항

- **Node.js 18+** (`node -v`로 확인)
- **npm** (Node.js 설치 시 포함)
- **Git**
- **Supabase 프로젝트 접근 권한** — 기존 팀원에게 대시보드 초대를 받아야 합니다

## 1단계: 클론 + 의존성 설치

```bash
git clone https://github.com/<org>/csoweb.git
cd csoweb
npm install
```

## 2단계: 환경변수 설정

`.env.local.example`을 복사하여 `.env.local`을 만듭니다.

```bash
cp .env.local.example .env.local
```

각 변수를 채워 넣습니다:

| 변수 | 설명 | 획득 경로 |
|------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase 대시보드 → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 (클라이언트용) | 같은 위치 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 (서버용, RLS 우회) | 같은 위치 — **절대 클라이언트에 노출 금지** |
| `JWT_SECRET` | JWT 서명 키 (32자 이상) | 기존 팀원에게 전달받거나, 로컬 전용으로 새로 생성 |
| `RESEND_API_KEY` | Resend 이메일 발송 API 키 | [resend.com](https://resend.com) 대시보드 |
| `EMAIL_FROM` | 발신자 이메일 주소 | 예: `CSO Portal <noreply@example.com>` |
| `ADMIN_EMAIL` | 관리자 알림 수신 이메일 | 관리자 이메일 주소 |
| `NEXT_PUBLIC_BASE_URL` | 사이트 기본 URL | 로컬: `http://localhost:3000` |

> **참조**: `.env.local.example` 파일에 전체 변수 목록이 있습니다.

## 3단계: 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000`에서 로그인 화면이 나타나면 성공입니다.

## 4단계: 테스트 로그인

로컬 DB에 테스트 계정이 있다면 그대로 사용합니다. 없다면:

1. `/register`에서 회원가입 (사업자등록번호 10자리 필요)
2. Supabase 대시보드 → `users` 테이블에서 해당 계정의 `is_approved`를 `true`로 변경
3. 관리자 계정이 필요하면 `is_admin`도 `true`로 변경

**첫 로그인 시 비밀번호 강제 변경 화면이 나타납니다.** `must_change_password`가 `true`인 계정은 비밀번호를 변경해야 메인 화면에 진입할 수 있습니다.

## 자주 겪는 문제

| 증상 | 원인 | 해결 |
|------|------|------|
| `fetch failed` / Supabase 연결 실패 | `.env.local`의 Supabase URL 또는 키가 잘못됨 | 대시보드에서 값 재확인, `NEXT_PUBLIC_` 접두사 확인 |
| 빌드 에러 (`npm run build` 실패) | TypeScript 타입 에러 또는 의존성 누락 | `npm install` 재실행, 에러 메시지의 파일 확인 |
| 로그인 후 빈 화면 | JWT_SECRET이 서버와 불일치 | `.env.local`의 JWT_SECRET 확인 |
| 회원가입 후 로그인 불가 | 관리자 승인 대기 상태 | DB에서 `is_approved = true` 설정 |
| `Module not found` 에러 | `@/` 경로 별칭 인식 실패 | `tsconfig.json`의 paths 설정 확인, IDE 재시작 |

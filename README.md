<a id="readme-top"></a>

<!-- 배지 -->
<div align="center">

[![Next.js][nextjs-shield]][nextjs-url]
[![TypeScript][typescript-shield]][typescript-url]
[![Supabase][supabase-shield]][supabase-url]
[![Tailwind CSS][tailwind-shield]][tailwind-url]
[![Netlify][netlify-shield]][netlify-url]

</div>

<!-- 프로젝트 헤더 -->
<br />
<div align="center">
  <h1>CSO 정산 포털</h1>
  <p><code>v0.20.8</code></p>
  <p>
    CSO(위탁영업) 업체가 제약사 정산 수수료를 조회하는 B2B 포털
  </p>
  <p>
    <a href="docs/USER_MANUAL.md">사용자 매뉴얼</a>
    &middot;
    <a href="docs/ADMIN_MANUAL.md">운영자 매뉴얼</a>
    &middot;
    <a href="docs/ARCHITECTURE.md">아키텍처</a>
    &middot;
    <a href="docs/API-DATABASE.md">API 레퍼런스</a>
    &middot;
    <a href="docs/OPERATIONS.md">운영 가이드</a>
    &middot;
    <a href="docs/MIGRATION.md">이관 매뉴얼</a>
  </p>
</div>

<!-- 목차 -->
<details>
  <summary>목차</summary>
  <ol>
    <li><a href="#프로젝트-소개">프로젝트 소개</a></li>
    <li><a href="#기술-스택">기술 스택</a></li>
    <li>
      <a href="#시작하기">시작하기</a>
      <ul>
        <li><a href="#사전-요구사항">사전 요구사항</a></li>
        <li><a href="#설치">설치</a></li>
      </ul>
    </li>
    <li><a href="#사용법">사용법</a></li>
    <li><a href="#로드맵">로드맵</a></li>
    <li><a href="#기여-방법">기여 방법</a></li>
    <li><a href="#라이선스">라이선스</a></li>
    <li><a href="#연락처">연락처</a></li>
    <li><a href="#참고-자료">참고 자료</a></li>
  </ol>
</details>

---

## 프로젝트 소개

<!-- 스크린샷 자리: 실제 스크린샷으로 교체하세요 -->
<!-- ![Product Screenshot][product-screenshot] -->

제약사가 CSO(위탁영업) 업체에 지급하는 정산 수수료를 관리하는 포털입니다.

**왜 만들었는가:**

- 제약사 정산 데이터(SIT솔루션 Compare&Chart 다운로드 엑셀)를 수작업으로 각 CSO 업체에 개별 전달하는 비효율을 없애기 위해
- CSO 업체가 직접 로그인해서 자사 정산 데이터만 조회·다운로드할 수 있도록
- 업체명 ↔ 사업자번호 매칭을 체계적으로 관리하여 정산 누락을 방지하기 위해

**핵심 메커니즘:**

| 개념 | 설명 |
|------|------|
| **사업자등록번호 식별** | B2B이므로 이메일이 아닌 사업자번호가 사용자를 구분하는 핵심 키 |
| **CSO 매칭** | 엑셀 속 텍스트 업체명 ↔ 회원 사업자번호를 연결하는 매핑 테이블 |
| **한글 컬럼명** | 제약업계 엑셀 양식 그대로 반영 (47개 컬럼) |

**사용자 역할:**

| 역할 | 할 수 있는 일 |
|------|--------------|
| **관리자** | SIT솔루션 Compare&Chart 엑셀 업로드, 회원 승인/관리, CSO 매칭 설정, 메일 발송 |
| **일반 회원** | 자사 사업자번호에 해당하는 정산 데이터 조회/다운로드 |

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 기술 스택

| 기술 | 역할 |
|------|------|
| [![Next.js][nextjs-shield]][nextjs-url] | App Router 기반 풀스택 프레임워크 (v14) |
| [![TypeScript][typescript-shield]][typescript-url] | 타입 안전성 (strict 모드) |
| [![Supabase][supabase-shield]][supabase-url] | PostgreSQL + REST API (인증은 자체 JWT) |
| [![Tailwind CSS][tailwind-shield]][tailwind-url] | 유틸리티 기반 스타일링 |
| [![Netlify][netlify-shield]][netlify-url] | 자동 배포 (GitHub → main push) |

**주요 라이브러리:** Radix UI (컴포넌트), exceljs/xlsx (엑셀 파싱), jose (JWT), bcryptjs (해싱), resend (이메일), react-dropzone (업로드)

**테스트:** Vitest (유닛/통합/컴포넌트), Playwright (E2E), Testing Library (React 컴포넌트)

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 시작하기

로컬 환경에서 프로젝트를 실행하는 방법입니다. 상세한 가이드는 [ONBOARDING](docs/ONBOARDING.md)을 참고하세요.

### 사전 요구사항

- Node.js 18+
- npm
- Git
- Supabase 프로젝트 접근 권한 (기존 팀원에게 대시보드 초대 필요)

### 설치

1. **저장소 클론**
   ```bash
   git clone https://github.com/<org>/csoweb.git
   cd csoweb
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경변수 설정**
   ```bash
   cp .env.local.example .env.local
   ```
   `.env.local`을 열어 Supabase URL, 키, JWT 시크릿 등 8개 변수를 채웁니다.
   각 변수의 설명과 획득 경로는 [ONBOARDING](docs/ONBOARDING.md#2단계-환경변수-설정)을 참고하세요.

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```
   `http://localhost:3000`에서 로그인 화면이 나타나면 성공입니다.

5. **테스트 계정 설정**

   회원가입 후 Supabase 대시보드에서 `is_approved = true`로 변경하거나,
   기존 테스트 계정을 사용합니다. 첫 로그인 시 비밀번호 변경이 강제됩니다.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 사용법

### 관리자 워크플로우

```
SIT솔루션 Compare&Chart 엑셀 업로드 → 미리보기 확인 → DB 저장 확정
  → CSO 매칭 관리 (업체명 ↔ 사업자번호)
  → 회원 승인/관리
  → 정산 안내 메일 발송 (메일머지)
```

### 일반 회원 워크플로우

```
로그인 → 정산 데이터 조회 (월별 필터)
  → 엑셀 다운로드
  → 월별 합계 확인
```

자세한 API 엔드포인트는 [API-DATABASE](docs/API-DATABASE.md)를, 코드 구조는 [ARCHITECTURE](docs/ARCHITECTURE.md)를 참고하세요.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 테스트

```bash
npm test              # 전체 유닛+통합+컴포넌트 (171개 케이스)
npm run test:watch    # 워치 모드
npm run test:unit     # 유닛만 (lib/, application/)
npm run test:integration  # API 통합만 (app/api/)
npm run test:component    # 컴포넌트만 (.test.tsx)
npm run test:coverage     # 커버리지 리포트 (v8)
npm run test:ui           # Vitest UI (브라우저)
npm run test:e2e          # Playwright E2E (dev server 자동 실행)
npm run test:e2e:headed   # Playwright headed 모드
```

| 카테고리 | 파일 수 | 케이스 수 | 대상 |
|----------|---------|-----------|------|
| Unit | 3 | 45 | `lib/auth`, `lib/utils`, `lib/excel` |
| Application Use Case | 9 | 51 | `application/user/*`, `application/settlement/*`, `application/cso-matching/*`, `application/auth/*` |
| API 통합 | 13 | 63 | `api/auth/*`, `api/users/*`, `api/settlements/*`, `api/columns` |
| 컴포넌트 | 2 | 12 | `AuthContext`, `Header` |
| **합계** | **27** | **171** | |

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 로드맵

- [x] 회원가입 / 로그인 / 비밀번호 관리
- [x] 관리자 회원 승인/거부 흐름
- [x] SIT솔루션 Compare&Chart 엑셀 업로드 (미리보기 + 확정)
- [x] CSO 매칭 (업체명 ↔ 사업자번호)
- [x] 정산 데이터 조회 / 엑셀 다운로드
- [x] 월별 합계 및 통계
- [x] 메일머지 (정산 안내 일괄 발송)
- [x] 컬럼 표시 설정 (가시성, 순서)
- [x] CSO 매칭 무결성 검사
- [x] 회원가입 사업자번호 국세청 실시간 인증 (계속사업자만 가입 허용)
- [x] 이메일 듀얼 프로바이더 (Resend + SMTP 하이웍스)
- [x] 메일머지 SSE 실시간 진행률 + 수신자 수 표시
- [x] 대시보드 시스템 정보 강화 (SMTP/NTS 상태, 버전 동기화)
- [x] 정산서 Notice 편집을 마스터조회 페이지로 이동 (사용 맥락에서 인라인 편집)
- [x] 이메일 알림 유형별 ON/OFF 토글 (설정에서 5가지 유형별 발송 제어)
- [ ] CSO 필터링
- [x] DDD 레이어 전환 완료 (`lib/db.ts` 호환 레이어 제거)
- [x] 테스트 인프라 구축 (Vitest + Playwright, 108개 케이스)
- [x] 코드 품질 전면 리뷰 (v0.18.0) — XSS 방어, 빈 catch 해소, SRP 분리, 스켈레톤/Error Boundary, SEO, next/image
- [ ] SIT솔루션 API 연동 (엑셀 수동 업로드 → API 자동 통신 전환)
- [ ] 다국어 지원

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 기여 방법

프로젝트에 기여하는 방법입니다.

1. 저장소 Fork
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'feat: 기능 설명'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

코드 작성 시 DDD 레이어 구조를 따라주세요. 자세한 내용은 [ARCHITECTURE](docs/ARCHITECTURE.md#코드-레이어-구조)를 참고하세요.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 라이선스

비공개 프로젝트입니다. 무단 배포를 금지합니다.

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 연락처

영업관리팀 권대환 — [qwer@ukp.co.kr](mailto:qwer@ukp.co.kr)

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

## 참고 자료

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [Resend Email API](https://resend.com/docs)
- [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">맨 위로</a>)</p>

<!-- 배지 레퍼런스 링크 -->
[nextjs-shield]: https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[nextjs-url]: https://nextjs.org/
[typescript-shield]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org/
[supabase-shield]: https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white
[supabase-url]: https://supabase.com/
[tailwind-shield]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[tailwind-url]: https://tailwindcss.com/
[netlify-shield]: https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white
[netlify-url]: https://www.netlify.com/

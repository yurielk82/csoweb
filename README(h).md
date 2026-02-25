# CSO 정산 포털

CSO(위탁영업) 업체가 제약사 정산 수수료를 조회하는 B2B 포털입니다.

## 누가 쓰는가

| 역할 | 설명 |
|------|------|
| **관리자** | SIT솔루션 Compare&Chart 엑셀 업로드, 회원 승인/관리, CSO 매칭 설정 |
| **일반 회원** | 자사 사업자번호에 해당하는 정산 데이터 조회/다운로드 |

## 기술 스택

| 기술 | 역할 |
|------|------|
| **Next.js 14** | App Router 기반 풀스택 프레임워크 |
| **TypeScript** | 타입 안전성 (strict 모드) |
| **Supabase** | PostgreSQL + REST API (인증은 자체 JWT) |
| **Tailwind CSS** | 유틸리티 기반 스타일링 |
| **Netlify** | 자동 배포 (GitHub → main push) |

## 처음이라면

| 목적 | 문서 |
|------|------|
| 로컬 환경 세팅하고 실행하기 | [ONBOARDING](docs(h)/ONBOARDING(h).md) |
| 코드 구조와 비즈니스 로직 이해하기 | [ARCHITECTURE](docs(h)/ARCHITECTURE(h).md) |
| API 엔드포인트나 DB 스키마 찾기 | [API-DATABASE](docs(h)/API-DATABASE(h).md) |
| 배포, 운영, 문제 해결 | [OPERATIONS](docs(h)/OPERATIONS(h).md) |

## 문서 구분

- **`(h)` 문서** — 사람이 읽는 문서 (이 파일 포함)
- **`CLAUDE.md`** — AI 코딩 에이전트용 지시 규칙 (사람이 읽을 필요 없음)
- **`README.md`** — create-next-app 기본 템플릿 (프로젝트 정보 없음)

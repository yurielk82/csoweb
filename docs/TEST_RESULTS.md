# 테스트 결과 보고서

> v0.16.0 — 2026-02-26 갱신 (lib/db.ts 제거 후 mock 전략 반영)

## 실행 환경

- **프레임워크**: Vitest 4.0.18
- **환경**: jsdom (컴포넌트), node (순수 로직)
- **E2E**: Playwright (Chromium)
- **Node.js**: 18+

## 테스트 결과 요약

```
Test Files  27 passed (27)
     Tests  171 passed (171)
```

## 카테고리별 상세

### Unit 테스트 (45개)

| 파일 | 케이스 | 시간 | 대상 |
|------|--------|------|------|
| `src/lib/auth.test.ts` | 26 | 1959ms | hashPassword, verifyPassword, createToken, verifyToken, formatBusinessNumber, normalizeBusinessNumber, isValidBusinessNumber, isValidEmail, isValidPassword |
| `src/lib/utils.test.ts` | 6 | 13ms | cn() — Tailwind 클래스 병합 |
| `src/lib/excel.test.ts` | 13 | 183ms | validateExcelFile, exportToExcel, getYearMonthsFromData |

### Application Use Case 테스트 (30개)

| 파일 | 케이스 | 시간 | 대상 |
|------|--------|------|------|
| `src/application/settlement/GetSettlementsUseCase.test.ts` | 12 | 8ms | getSettlements (관리자/일반/매칭없음), getAvailableYearMonths, getSettlementSummary, getVisibleColumns |
| `src/application/settlement/ExportSettlementsUseCase.test.ts` | 5 | 6ms | exportSettlements (관리자/일반/매칭없음/visible 컬럼 필터) |
| `src/application/settlement/UploadSettlementsUseCase.test.ts` | 2 | 4ms | uploadSettlements |
| `src/application/cso-matching/UpsertMatchingUseCase.test.ts` | 5 | 5ms | upsertMatching, getAllMatching, deleteMatching, deleteAllMatching |
| `src/application/user/RegisterUserUseCase.test.ts` | 2 | 5ms | registerUser (성공/중복 사업자번호) |
| `src/application/user/ApproveUserUseCase.test.ts` | 4 | 4ms | approveUser, rejectUser |

### API 통합 테스트 (21개)

| 파일 | 케이스 | 시간 | 대상 |
|------|--------|------|------|
| `src/app/api/auth/login/route.test.ts` | 8 | 17ms | 400 (필수항목 누락), 401 (미등록/비밀번호 불일치), 403 (미승인), 200 + 리다이렉트 3분기 (대시보드/change-password/complete-profile) |
| `src/app/api/auth/register/route.test.ts` | 7 | 16ms | 400 (밸리데이션 4종), 409 (중복 사업자번호/이메일), 200 (성공) |
| `src/app/api/settlements/route.test.ts` | 6 | 17ms | 401 (미인증), 관리자/일반 분기, 검색 필터, 페이지네이션, 합계 계산 |

### 컴포넌트 테스트 (12개)

| 파일 | 케이스 | 시간 | 대상 |
|------|--------|------|------|
| `src/contexts/AuthContext.test.tsx` | 8 | 85ms | 초기 상태, 마운트, setUser/clearUser, localStorage 복원/삭제, 잘못된 데이터 처리, Provider 없이 사용 시 에러 |
| `src/components/shared/header.test.tsx` | 4 | 112ms | 로딩 상태, 관리자 메뉴, 일반 사용자 메뉴 |

### E2E 테스트 (7개) — Playwright

| 파일 | 케이스 | 대상 |
|------|--------|------|
| `e2e/auth.spec.ts` | 4 | 로그인 페이지 렌더링, 필수값 누락, 잘못된 인증정보, 로그아웃 후 리다이렉트 |
| `e2e/settlement.spec.ts` | 3 | 미인증 리다이렉트, 로그인/회원가입 페이지 접근 |

## 커버리지 (테스트된 파일 기준)

| 영역 | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| `application/user/` | 100% | 100% | 100% | 100% |
| `application/cso-matching/` | 100% | 100% | 100% | 100% |
| `application/settlement/` | 74.6% | 80% | 69.2% | 75% |
| `lib/auth.ts` | 66.7% | 50% | 75% | 69% |
| `lib/utils.ts` | 100% | 100% | 100% | 100% |
| `lib/excel.ts` | 48.5% | 37.4% | 93.8% | 44.1% |
| `api/auth/login` | 91.3% | 92.3% | 100% | 91.3% |
| `api/auth/register` | 91.7% | 96.4% | 100% | 91.7% |
| `api/settlements` | 81.4% | 83.3% | 88.9% | 81.4% |

### 미커버 영역 설명

- `lib/auth.ts` (48-64행): `setSession`/`getSession`/`clearSession` — Next.js `cookies()` 의존 함수. API 통합 테스트에서 간접 커버
- `lib/excel.ts` (19-158행): `parseExcelFile` — ExcelJS 바이너리 파싱. 실제 엑셀 파일이 필요하여 현재 제외
- `application/settlement/GetMonthlySummaryUseCase.ts`: 향후 추가 예정

## 모킹 전략

### Application Use Case

```typescript
vi.mock('@/infrastructure/supabase', () => ({
  getUserRepository: () => mockUserRepo,
  getSettlementRepository: () => mockSettlementRepo,
  // ...
}));
```

### API Route

```typescript
// Repository Factory mock
vi.mock('@/infrastructure/supabase', () => ({
  getUserRepository: vi.fn(() => mockUserRepo),
}));

// Application Use Case mock
vi.mock('@/application/auth', () => ({
  authenticateUser: vi.fn(),
}));
```

## 실행 방법

```bash
npm test              # 전체 (108개)
npm run test:coverage # 커버리지 포함
npm run test:e2e      # E2E (dev server 자동 실행)
```

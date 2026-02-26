# CSO Web v0.17.2 코드리뷰 스캔 결과

## 1. Security — XSS 위험

| 파일 | 줄 | 이슈 |
|------|-----|------|
| `src/lib/email.ts` | 723 | `buildNoticeHtml()` — notice 텍스트를 이스케이프 없이 HTML 삽입 |
| `src/lib/email.ts` | 714 | `buildBodyHtml()` — body 텍스트를 이스케이프 없이 HTML 삽입 |
| `src/app/(main)/admin/mailmerge/page.tsx` | 627 | `dangerouslySetInnerHTML` — 서버 측 이스케이프로 근본 해결 |
| `src/lib/email.ts` | 159-201 | `generateEmailFooter()` — companyInfo 필드 이스케이프 없이 삽입 |
| `src/lib/email.ts` | 258-266 | `getRegistrationRequestEmail()` — data 필드 이스케이프 없이 삽입 |

## 2. Security — 빈 catch 블록 (44개)

### 의도적 무시 (주석 보강만, 4곳)
| 파일 | 줄 | 사유 |
|------|-----|------|
| `src/lib/supabase/server.ts` | 20, 45 | Supabase SSR 공식 패턴 |
| `src/lib/auth.ts` | 42 | JWT 검증 실패 = 정상 분기 |
| `src/app/api/email/mailmerge/route.ts` | 241 | SSE 스트림 닫힘 |
| `src/app/(main)/admin/mailmerge/page.tsx` | 350 | SSE JSON 파싱 불완전 줄 |

### console.error/warn 추가 필요 (40곳)
| 파일 | 줄 | 비고 |
|------|-----|------|
| `src/contexts/AuthContext.tsx` | 59 | |
| `src/lib/email.ts` | 799, 820 | warn |
| `src/app/api/verify-biz/route.ts` | 64 | |
| `src/app/api/system/status/route.ts` | 35 | warn |
| `src/app/api/upload/route.ts` | 72 | |
| `src/app/(main)/profile/page.tsx` | 130, 171, 211, 251, 304 | 5곳 |
| `src/app/(main)/admin/upload/page.tsx` | 141, 208, 249 | 3곳 |
| `src/app/(main)/admin/settings/page.tsx` | 135, 189 | 2곳 |
| `src/app/(main)/admin/members/page.tsx` | 183, 285, 323 | 3곳 |
| `src/app/(main)/admin/approvals/page.tsx` | 116, 171, 213 | 3곳 |
| `src/app/(main)/admin/columns/page.tsx` | 268, 297 | 2곳 |
| `src/app/(main)/admin/data/page.tsx` | 101 | 1곳 |
| `src/app/(main)/admin/mailmerge/page.tsx` | 163, 243, 252, 281 | 4곳 |
| `src/app/(main)/admin/master/page.tsx` | 345 | 1곳 |
| `src/app/(auth)/login/page.tsx` | 102 | 1곳 |
| `src/app/(auth)/register/page.tsx` | 295 | 1곳 |
| `src/app/(auth)/reset-password/page.tsx` | 76, 127 | 2곳 |
| `src/app/(auth)/forgot-password/page.tsx` | 56 | 1곳 |
| `src/app/(auth)/complete-profile/page.tsx` | 118, 228 | 2곳 |
| `src/app/(auth)/change-password/page.tsx` | 55, 107 | 2곳 |

## 3. Type Safety

| 파일 | 줄 | 이슈 |
|------|-----|------|
| `src/domain/settlement/types.ts` | 52 | `[key: string]` 인덱스 시그니처 — 타입 안전성 저하 |
| `src/types/index.ts` | 88 | 동일 (중복 정의) |

## 4. 거대 컴포넌트 (SRP 위반)

| 파일 | 줄 수 | 비고 |
|------|-------|------|
| `src/app/(main)/dashboard/page.tsx` | 752 | 상태 20개 + 피벗 로직 + 렌더링 |
| `src/app/(main)/admin/upload/page.tsx` | 639 | 업로드 + 매핑 + 이메일 |
| `src/app/(main)/admin/mailmerge/page.tsx` | 665 | SSE + 폼 + 미리보기 + 로그 |
| `src/components/admin/SettlementIntegrityManager.tsx` | 1,679 | 계획 범위 외 |

## 5. Error Boundary / loading.tsx 부재

- `src/app/error.tsx` — 없음
- `src/app/(main)/error.tsx` — 없음
- `src/app/(auth)/error.tsx` — 없음
- `src/app/(main)/loading.tsx` — 없음
- `src/app/(main)/dashboard/loading.tsx` — 없음
- `src/app/(main)/admin/loading.tsx` — 없음

## 6. SEO 미설정

- `robots.ts` — 없음
- `sitemap.ts` — 없음
- Open Graph metadata — 없음
- `title.template` — 없음

## 7. `<img>` 태그 (next/image 미사용)

| 파일 | 줄 | 대상 |
|------|-----|------|
| `src/app/(auth)/login/page.tsx` | 230 | 공공누리 이미지 |
| `src/app/(auth)/login/page.tsx` | 245 | CC 아이콘 |
| `src/app/(auth)/login/page.tsx` | 246 | BY 아이콘 |

# csoweb DDD 패턴 참조

## 레이어 구조

```
src/domain/{도메인}/          ← 순수 타입 + 비즈니스 규칙
  types.ts                   ← 엔티티, 값 객체 타입
  {Domain}Repository.ts      ← 리포지토리 인터페이스
  index.ts                   ← 재수출

src/application/{도메인}/     ← 유스케이스 (domain만 참조)
  {Action}{Domain}UseCase.ts ← 유스케이스 클래스
  {Action}{Domain}UseCase.test.ts ← 유스케이스 테스트
  index.ts

src/infrastructure/supabase/ ← Supabase 구현체
  Supabase{Domain}Repository.ts ← 리포지토리 구현
  client.ts                  ← Supabase 클라이언트 싱글톤
  index.ts
```

## 도메인 타입 패턴 (types.ts)

```typescript
// 엔티티: DB 레코드와 1:1 매핑
export interface Settlement {
  id: string;
  companyId: string;
  yearMonth: string;
  amount: number;
  // ...
}

// 값 객체: 불변, 동등성 비교
export interface YearMonth {
  year: number;
  month: number;
}

// 도메인 규칙: 순수 함수로 표현
export function calculateFee(settlement: Settlement): number {
  // 비즈니스 규칙
}
```

## 리포지토리 인터페이스 패턴

```typescript
// domain/{도메인}/{Domain}Repository.ts
export interface SettlementRepository {
  findByCompanyAndMonth(companyId: string, yearMonth: string): Promise<Settlement[]>;
  save(settlement: Settlement): Promise<void>;
  // Supabase 특정 타입 사용 금지 (PostgrestResponse 등)
}
```

## 유스케이스 패턴

```typescript
// application/{도메인}/{Action}{Domain}UseCase.ts
import { SettlementRepository } from "@/domain/settlement";

export class GetSettlementsUseCase {
  constructor(private readonly repo: SettlementRepository) {}

  async execute(companyId: string, yearMonth: string): Promise<Settlement[]> {
    // 1. 입력 검증 (zod)
    // 2. 도메인 로직 실행
    // 3. 리포지토리 호출
    // 4. 결과 반환 (UI 로직 없음)
  }
}
```

## 리포지토리 구현 패턴

```typescript
// infrastructure/supabase/Supabase{Domain}Repository.ts
import { SettlementRepository, Settlement } from "@/domain/settlement";
import { supabase } from "./client";

export class SupabaseSettlementRepository implements SettlementRepository {
  async findByCompanyAndMonth(companyId: string, yearMonth: string): Promise<Settlement[]> {
    const { data, error } = await supabase
      .from("settlements")
      .select("*")
      .eq("company_id", companyId)
      .eq("year_month", yearMonth);

    if (error) throw new Error(`정산 조회 실패: ${error.message}`);
    return data ?? [];
  }
}
```

## 기존 도메인 목록

| 도메인 | 엔티티 | 유스케이스 | 리포지토리 |
|--------|--------|-----------|-----------|
| settlement | Settlement | Get, Upload, Export, GetMonthlySummary | SupabaseSettlementRepository |
| company | Company | — | SupabaseCompanyRepository |
| user | User | — | SupabaseUserRepository |
| cso-matching | CSOMatching | — | SupabaseCSOMatchingRepository |
| column-setting | ColumnSetting | — | SupabaseColumnSettingRepository |
| email | EmailLog | — | SupabaseEmailLogRepository |
| password-reset-token | PasswordResetToken | — | SupabasePasswordResetTokenRepository |

## 새 도메인 추가 체크리스트

1. [ ] `src/domain/{도메인}/types.ts` — 엔티티/값 객체 타입
2. [ ] `src/domain/{도메인}/{Domain}Repository.ts` — 리포지토리 인터페이스
3. [ ] `src/domain/{도메인}/index.ts` — 재수출
4. [ ] `src/application/{도메인}/{Action}{Domain}UseCase.ts` — 유스케이스
5. [ ] `src/application/{도메인}/{Action}{Domain}UseCase.test.ts` — 테스트
6. [ ] `src/infrastructure/supabase/Supabase{Domain}Repository.ts` — 구현체
7. [ ] 의존 방향 검증: domain ← application ← infrastructure

// ============================================
// Server-side Data Cache (unstable_cache + revalidateTag)
// ============================================
// 데이터 변경 빈도: settlements/cso_matching(월 1회), column_settings/company(거의 없음)
// → 매 요청 DB 조회 대신, Vercel Data Cache에 저장 후 변경 시점에만 무효화

import { unstable_cache, revalidateTag } from 'next/cache';
import {
  getSettlementRepository,
  getCSOMatchingRepository,
  getColumnSettingRepository,
  getCompanyRepository,
  getUserRepository,
} from '@/infrastructure/supabase';
import { DEFAULT_COLUMN_SETTINGS } from '@/types';

// ── Column Settings ──
// 태그: column-settings
// 무효화 시점: PUT /api/columns, DELETE /api/columns
export const getCachedColumns = unstable_cache(
  async () => {
    const repo = getColumnSettingRepository();
    await repo.initialize(DEFAULT_COLUMN_SETTINGS);
    return repo.findAll();
  },
  ['column-settings-data'],
  { tags: ['column-settings'] }
);

// ── Company Info ──
// 태그: footer-data (기존과 동일)
// 무효화 시점: PUT /api/settings/company
export const getCachedCompanyInfo = unstable_cache(
  async () => getCompanyRepository().get(),
  ['company-info'],
  { tags: ['footer-data'] }
);

// ── CSO Matching (사업자번호별 매칭된 업체명 목록) ──
// 태그: cso-matching
// 무효화 시점: POST/DELETE /api/admin/cso-matching/upsert
export const getCachedMatchedNames = unstable_cache(
  async (businessNumber: string) => {
    return getCSOMatchingRepository().getMatchedCompanyNames(businessNumber);
  },
  ['cso-matching-data'],
  { tags: ['cso-matching'] }
);

// ── Available Settlement Months ──
// 태그: settlement-data
// 무효화 시점: POST /api/upload, DELETE /api/settlements/month/[month]
// matchedNamesKey: JSON.stringify(matchedNames) 또는 'ALL'
export const getCachedAvailableMonths = unstable_cache(
  async (matchedNamesKey: string) => {
    const repo = getSettlementRepository();
    if (matchedNamesKey === 'ALL') {
      return repo.getAvailableMonths();
    }
    const matchedNames: string[] = JSON.parse(matchedNamesKey);
    return repo.getAvailableMonthsByCSOMatching(matchedNames);
  },
  ['settlement-months-data'],
  { tags: ['settlement-data'] }
);

// ── Settlement Totals (월별 합계) ──
// 태그: settlement-data
// 무효화 시점: POST /api/upload, DELETE /api/settlements/month/[month]
export const getCachedTotals = unstable_cache(
  async (matchedNamesKey: string, settlementMonth: string) => {
    const repo = getSettlementRepository();
    if (matchedNamesKey === 'ALL') {
      return repo.getTotals(settlementMonth);
    }
    const matchedNames: string[] = JSON.parse(matchedNamesKey);
    return repo.getTotalsByCSOMatching(matchedNames, settlementMonth);
  },
  ['settlement-totals-data'],
  { tags: ['settlement-data'] }
);

// ── Settlement Stats (정산월별 통계 — 데이터 관리 페이지) ──
// 태그: settlement-data
// 무효화 시점: POST /api/upload, DELETE /api/settlements/month/[month]
export const getCachedSettlementStats = unstable_cache(
  async () => getSettlementRepository().getStatsByMonth(),
  ['settlement-stats-data'],
  { tags: ['settlement-data'] }
);

// ── CSO List (승인된 일반 회원 목록 — 마스터 조회 거래처 드롭다운) ──
// 태그: user-data
// 무효화 시점: POST /api/users/approve, POST /api/users/approve-batch, POST /api/users/reject
export const getCachedCSOList = unstable_cache(
  async () => {
    const users = await getUserRepository().findAll();
    return users
      .filter(u => u.is_approved && !u.is_admin)
      .map(u => ({ business_number: u.business_number, company_name: u.company_name }));
  },
  ['cso-list-data'],
  { tags: ['user-data'] }
);

// ── Cache Invalidation Functions ──
// 각 쓰기 API에서 호출

export function invalidateSettlementCache() {
  revalidateTag('settlement-data');
}

export function invalidateColumnCache() {
  revalidateTag('column-settings');
}

export function invalidateCSOMatchingCache() {
  revalidateTag('cso-matching');
}

export function invalidateCompanyCache() {
  revalidateTag('footer-data');
}

export function invalidateUserCache() {
  revalidateTag('user-data');
}

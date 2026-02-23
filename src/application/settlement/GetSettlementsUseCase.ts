// ============================================
// Get Settlements Use Case
// ============================================

import { getSettlementRepository, getCSOMatchingRepository, getColumnSettingRepository } from '@/infrastructure/supabase';
import type { Settlement } from '@/domain/settlement';
import type { ColumnSetting } from '@/domain/column-setting';

interface GetSettlementsParams {
  businessNumber?: string;
  isAdmin: boolean;
  settlementMonth?: string;
  selectColumns?: string;
}

interface GetSettlementsResult {
  settlements: Settlement[];
}

export async function getSettlements(params: GetSettlementsParams): Promise<GetSettlementsResult> {
  const settlementRepo = getSettlementRepository();
  const csoMatchingRepo = getCSOMatchingRepository();

  if (params.isAdmin) {
    // 관리자: 전체 데이터 조회
    const settlements = await settlementRepo.findAll(params.settlementMonth, params.selectColumns);
    return { settlements };
  }

  if (!params.businessNumber) {
    return { settlements: [] };
  }

  // 일반 회원: CSO 매칭 기반 조회
  const matchedNames = await csoMatchingRepo.getMatchedCompanyNames(params.businessNumber);

  if (matchedNames.length === 0) {
    return { settlements: [] };
  }

  const settlements = await settlementRepo.findByCSOMatching(matchedNames, params.settlementMonth, params.selectColumns);
  return { settlements };
}

export async function getAvailableYearMonths(businessNumber: string | undefined, isAdmin: boolean): Promise<string[]> {
  const settlementRepo = getSettlementRepository();
  const csoMatchingRepo = getCSOMatchingRepository();

  if (isAdmin) {
    return settlementRepo.getAvailableMonths();
  }

  if (!businessNumber) return [];

  const matchedNames = await csoMatchingRepo.getMatchedCompanyNames(businessNumber);
  if (matchedNames.length === 0) return [];

  return settlementRepo.getAvailableMonthsByCSOMatching(matchedNames);
}

export async function getSettlementSummary(
  businessNumber: string,
  settlementMonth: string,
  isAdmin: boolean
): Promise<{
  총_금액: number;
  총_수수료: number;
  제약수수료_합계: number;
  담당수수료_합계: number;
  데이터_건수: number;
  총_수량: number;
}> {
  const settlementRepo = getSettlementRepository();
  const csoMatchingRepo = getCSOMatchingRepository();

  if (isAdmin) {
    return settlementRepo.getSummary(businessNumber, settlementMonth);
  }

  const matchedNames = await csoMatchingRepo.getMatchedCompanyNames(businessNumber);
  if (matchedNames.length === 0) {
    return { 총_금액: 0, 총_수수료: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 데이터_건수: 0, 총_수량: 0 };
  }

  return settlementRepo.getSummaryByCSOMatching(matchedNames, settlementMonth);
}

export async function getVisibleColumns(): Promise<ColumnSetting[]> {
  const columnSettingRepo = getColumnSettingRepository();
  return columnSettingRepo.findAll();
}

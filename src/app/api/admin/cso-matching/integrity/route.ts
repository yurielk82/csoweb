// ===========================================
// CSO Matching Integrity Check API (v2)
// 사업자번호 기준 그룹핑, CSO관리업체명 배열로 반환
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { SUPABASE_PAGE_SIZE, TEST_CSO_PREFIX } from '@/constants/defaults';

export const dynamic = 'force-dynamic';

interface IntegrityResultV2 {
  id: string;
  business_number: string;
  business_name: string | null;
  registration_status: 'registered' | 'unregistered' | 'pending_approval';
  cso_company_names: string[];
  last_settlement_month: string | null;
  row_count: number;
  is_readonly: boolean;
}

type MatchingRow = { cso_company_name: string; business_number: string };
type UserRow = { business_number: string; company_name: string; is_approved: boolean; is_admin: boolean; is_test: boolean };
type SettlementRow = { 'CSO관리업체': string | null; '정산월': string | null; business_number: string };
type MonthRow = { '정산월': string | null };

// ── CSO/사용자 맵 구축 ──

function buildCsoMaps(matchingData: MatchingRow[]) {
  const bizToCSO = new Map<string, Set<string>>();
  const csoToBiz = new Map<string, string>();

  for (const match of matchingData) {
    const normalizedName = match.cso_company_name.trim();
    // 테스트 계정의 [TEST] 접두사 매핑은 무결성 검사에서 제외
    if (normalizedName.startsWith(TEST_CSO_PREFIX)) continue;
    if (!bizToCSO.has(match.business_number)) bizToCSO.set(match.business_number, new Set());
    bizToCSO.get(match.business_number)!.add(normalizedName);
    csoToBiz.set(normalizedName, match.business_number);
  }

  return { bizToCSO, csoToBiz };
}

function buildUserMap(usersData: UserRow[]) {
  const userMap = new Map<string, { company_name: string; is_approved: boolean }>();
  const adminBizNumbers = new Set<string>();
  const adminCompanyNames = new Set<string>();

  for (const user of usersData) {
    // 관리자는 무결성 검사에서 제외 (BN + 회사명 모두)
    if (user.is_admin) {
      adminBizNumbers.add(user.business_number);
      if (user.company_name) adminCompanyNames.add(user.company_name.trim());
      continue;
    }
    // 테스트 계정은 BN만 제외 (회사명은 실제 CSO와 일치할 수 있으므로 필터 제외)
    if (user.is_test) {
      adminBizNumbers.add(user.business_number);
      continue;
    }
    userMap.set(user.business_number, { company_name: user.company_name, is_approved: user.is_approved });
  }

  return { userMap, adminBizNumbers, adminCompanyNames };
}

// ── 정산서 통계 ──

function buildCsoStats(
  settlementData: SettlementRow[],
  adminBizNumbers: Set<string>,
  adminCompanyNames: Set<string>,
) {
  const csoStats = new Map<string, { count: number; lastMonth: string | null }>();

  for (const row of settlementData) {
    const csoName = row['CSO관리업체']?.trim();
    if (!csoName) continue;
    if (adminBizNumbers.has(row.business_number)) continue;
    if (adminCompanyNames.has(csoName)) continue;

    if (!csoStats.has(csoName)) csoStats.set(csoName, { count: 0, lastMonth: null });
    const stat = csoStats.get(csoName)!;
    stat.count++;
    if (row['정산월'] && (!stat.lastMonth || row['정산월'] > stat.lastMonth)) {
      stat.lastMonth = row['정산월'];
    }
  }

  return csoStats;
}

// ── 결과 생성 ──

function buildResults(
  bizToCSO: Map<string, Set<string>>,
  userMap: Map<string, { company_name: string; is_approved: boolean }>,
  adminBizNumbers: Set<string>,
  csoStats: Map<string, { count: number; lastMonth: string | null }>,
): IntegrityResultV2[] {
  const results: IntegrityResultV2[] = [];
  const processedBusinessNumbers = new Set<string>();

  // 매칭 테이블에 있는 사업자번호 처리 (관리자 제외)
  for (const [bizNum, csoNames] of bizToCSO.entries()) {
    if (adminBizNumbers.has(bizNum)) continue;
    processedBusinessNumbers.add(bizNum);

    const user = userMap.get(bizNum);
    const csoArray = Array.from(csoNames);
    const { totalCount, lastMonth } = aggregateCsoStats(csoArray, csoStats);

    results.push(buildResultRow({ bizNum, user, csoArray, totalCount, lastMonth }));
  }

  // 매칭 테이블에 없지만 회원인 경우
  for (const [bizNum, user] of userMap.entries()) {
    if (processedBusinessNumbers.has(bizNum)) continue;
    results.push({
      id: `user-${bizNum}`,
      business_number: bizNum,
      business_name: user.company_name,
      registration_status: user.is_approved ? 'registered' : 'pending_approval',
      cso_company_names: [],
      last_settlement_month: null,
      row_count: 0,
      is_readonly: true,
    });
  }

  return sortResults(results);
}

function aggregateCsoStats(
  csoArray: string[],
  csoStats: Map<string, { count: number; lastMonth: string | null }>,
) {
  let totalCount = 0;
  let lastMonth: string | null = null;
  for (const csoName of csoArray) {
    const stat = csoStats.get(csoName);
    if (stat) {
      totalCount += stat.count;
      if (stat.lastMonth && (!lastMonth || stat.lastMonth > lastMonth)) lastMonth = stat.lastMonth;
    }
  }
  return { totalCount, lastMonth };
}

interface BuildResultRowOptions {
  bizNum: string;
  user: { company_name: string; is_approved: boolean } | undefined;
  csoArray: string[];
  totalCount: number;
  lastMonth: string | null;
}

function buildResultRow({
  bizNum, user, csoArray, totalCount, lastMonth,
}: BuildResultRowOptions): IntegrityResultV2 {
  if (user) {
    return {
      id: `biz-${bizNum}`, business_number: bizNum,
      business_name: user.company_name,
      registration_status: user.is_approved ? 'registered' : 'pending_approval',
      cso_company_names: csoArray, last_settlement_month: lastMonth,
      row_count: totalCount, is_readonly: true,
    };
  }
  return {
    id: `biz-${bizNum}`, business_number: bizNum,
    business_name: null, registration_status: 'unregistered',
    cso_company_names: csoArray, last_settlement_month: lastMonth,
    row_count: totalCount, is_readonly: false,
  };
}

function sortResults(results: IntegrityResultV2[]): IntegrityResultV2[] {
  const statusOrder = { unregistered: 0, pending_approval: 1, registered: 2 };
  return results.sort((a, b) => {
    const statusDiff = statusOrder[a.registration_status] - statusOrder[b.registration_status];
    if (statusDiff !== 0) return statusDiff;
    if (a.cso_company_names.length === 0 && b.cso_company_names.length > 0) return -1;
    if (a.cso_company_names.length > 0 && b.cso_company_names.length === 0) return 1;
    return a.business_number.localeCompare(b.business_number);
  });
}

// ── 통계 계산 ──

function computeStats(
  results: IntegrityResultV2[],
  csoStats: Map<string, { count: number; lastMonth: string | null }>,
  csoToBiz: Map<string, string>,
  userMap: Map<string, { company_name: string; is_approved: boolean }>,
) {
  const total = results.length;
  const settlementCsoCount = csoStats.size;

  let completeCount = 0;
  for (const csoName of csoStats.keys()) {
    const bizNum = csoToBiz.get(csoName);
    if (bizNum) {
      const user = userMap.get(bizNum);
      if (user && user.is_approved) completeCount++;
    }
  }

  const notRegisteredCount = results.filter(r =>
    r.cso_company_names.length > 0 &&
    (r.registration_status === 'unregistered' || r.registration_status === 'pending_approval')
  ).length;

  let noCsoMappingCount = 0;
  const unmappedCsoNames: string[] = [];
  for (const csoName of csoStats.keys()) {
    if (!csoToBiz.has(csoName)) {
      noCsoMappingCount++;
      unmappedCsoNames.push(csoName);
    }
  }

  return {
    stats: {
      total, settlementCsoCount, completeCount, notRegisteredCount, noCsoMappingCount,
      registered: results.filter(r => r.registration_status === 'registered').length,
      unregistered: results.filter(r => r.registration_status === 'unregistered').length,
      pending_approval: results.filter(r => r.registration_status === 'pending_approval').length,
      no_cso_match: results.filter(r => r.cso_company_names.length === 0).length,
      no_cso_match_settlement: results.filter(r => r.last_settlement_month !== null && r.cso_company_names.length === 0).length,
    },
    unmappedCsoNames,
  };
}

// ── 정산서 데이터 페이징 조회 ──

async function fetchAllSettlements(supabase: ReturnType<typeof getSupabase>, month: string | null) {
  const allData: SettlementRow[] = [];
  const pageSize = SUPABASE_PAGE_SIZE;
  let page = 0;

  while (true) {
    let query = supabase.from('settlements').select('CSO관리업체, 정산월, business_number');
    if (month) query = query.eq('정산월', month);

    const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) { console.error('Settlement fetch error:', error); break; }
    if (!data || data.length === 0) break;
    allData.push(...(data as unknown as SettlementRow[]));
    if (data.length < pageSize) break;
    page++;
  }

  return allData;
}

// ── Route handler ──

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const supabase = getSupabase();
    const month = new URL(request.url).searchParams.get('month');

    // 1. 병렬 데이터 조회
    const [matchingResult, usersResult, settlementData] = await Promise.all([
      supabase.from('cso_matching').select('cso_company_name, business_number'),
      supabase.from('users').select('business_number, company_name, is_approved, is_admin, is_test'),
      fetchAllSettlements(supabase, month),
    ]);

    if (matchingResult.error) console.error('CSO matching fetch error:', matchingResult.error);
    if (usersResult.error) {
      return NextResponse.json({ success: false, error: '회원 데이터 조회 실패' }, { status: 500 });
    }

    // 2. 맵 구축
    const { bizToCSO, csoToBiz } = buildCsoMaps((matchingResult.data as unknown as MatchingRow[]) || []);
    const { userMap, adminBizNumbers, adminCompanyNames } = buildUserMap((usersResult.data as unknown as UserRow[]) || []);
    const csoStats = buildCsoStats(settlementData, adminBizNumbers, adminCompanyNames);

    // 3. 결과 생성
    const results = buildResults(bizToCSO, userMap, adminBizNumbers, csoStats);
    const { stats, unmappedCsoNames } = computeStats(results, csoStats, csoToBiz, userMap);

    // 4. 정산월 목록
    const { data: monthsData } = await supabase.from('settlements').select('정산월').not('정산월', 'is', null);
    const availableMonths = [...new Set(((monthsData as unknown as MonthRow[]) || []).map(d => d['정산월']))]
      .filter(Boolean).sort().reverse() as string[];

    return NextResponse.json({
      success: true,
      data: {
        results, availableMonths, stats,
        csoMapping: Object.fromEntries(csoToBiz),
        unmappedCsoNames,
      },
    });
  } catch (error) {
    console.error('Integrity check error:', error);
    return NextResponse.json({ success: false, error: '거래처 매핑 데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSettlementRepository } from '@/infrastructure/supabase';
import {
  getCachedColumns,
  getCachedCompanyInfo,
  getCachedMatchedNames,
  getCachedAvailableMonths,
  getCachedTotals,
  getCachedCSOList,
} from '@/lib/data-cache';
import { DEFAULT_PAGE_SIZE, ALWAYS_NEEDED_COLUMNS } from '@/constants/defaults';

export const dynamic = 'force-dynamic';

/**
 * 대시보드/마스터 초기화 통합 API
 *
 * 캐시 전략:
 * - columns, company, CSO matching, months, totals → unstable_cache (Vercel Data Cache)
 * - settlements (페이지 데이터) → DB 직접 조회 (페이지/검색 조합이 다양하여 캐시 불적합)
 * - 캐시 무효화: 관리자 업로드/설정 변경 시 revalidateTag()
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get('page') || '1');
    const pageSize = parseInt(sp.get('page_size') || String(DEFAULT_PAGE_SIZE));
    const search = sp.get('search') || undefined;
    const filterBusinessNumber = sp.get('business_number') || undefined;
    const includeSettlements = sp.get('include_settlements') !== 'false';
    const includeCsoList = sp.get('include_cso_list') === 'true';

    const settlementRepo = getSettlementRepository();

    // ── Phase 1: 캐시된 메타데이터 병렬 조회 (DB 미접근 시 즉시 반환) ──
    const [columns, companyInfo, matchedNames, csoList] = await Promise.all([
      getCachedColumns(),
      getCachedCompanyInfo(),
      session.is_admin
        ? filterBusinessNumber
          ? getCachedMatchedNames(filterBusinessNumber)
          : Promise.resolve(null)
        : getCachedMatchedNames(session.business_number),
      includeCsoList && session.is_admin
        ? getCachedCSOList()
        : Promise.resolve(undefined),
    ]);

    const visibleColumns = columns.filter(c => c.is_visible);
    const notice = { notice_content: companyInfo.notice_content, ceo_name: companyInfo.ceo_name };
    const emptyTotals = { 수량: 0, 금액: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 거래처수: 0, 제품수: 0 };

    // 일반 회원인데 매칭 없으면 빈 결과
    if (!session.is_admin && (!matchedNames || matchedNames.length === 0)) {
      return NextResponse.json({
        success: true,
        data: {
          columns: visibleColumns,
          yearMonths: [],
          notice,
          settlements: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
          totals: emptyTotals,
          noMatching: true,
        },
      });
    }

    // 관리자 + 특정 CSO 선택인데 매칭 없으면
    if (session.is_admin && filterBusinessNumber && matchedNames && matchedNames.length === 0) {
      const yearMonths = await getCachedAvailableMonths('ALL');
      return NextResponse.json({
        success: true,
        data: {
          columns: visibleColumns,
          yearMonths,
          notice,
          settlements: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
          totals: emptyTotals,
          ...(csoList && { csoList }),
        },
      });
    }

    // ── Phase 2: 캐시된 yearMonths 조회 ──
    const matchedNamesKey = matchedNames ? JSON.stringify(matchedNames) : 'ALL';
    const yearMonths = await getCachedAvailableMonths(matchedNamesKey);

    const settlementMonth = sp.get('settlement_month') || yearMonths[0] || undefined;

    // ── Phase 3: 데이터 조회 ──
    if (!includeSettlements || !settlementMonth) {
      return NextResponse.json({
        success: true,
        data: {
          columns: visibleColumns,
          yearMonths,
          notice,
          settlements: [],
          pagination: { page: 1, pageSize, total: 0, totalPages: 0 },
          totals: emptyTotals,
          ...(csoList && { csoList }),
        },
      });
    }

    const visibleColumnKeys = visibleColumns.map(c => c.column_key);
    const selectColumns = [...new Set([...ALWAYS_NEEDED_COLUMNS, ...visibleColumnKeys])].join(',');
    const queryParams = { settlementMonth, selectColumns, page, pageSize, search };

    // 캐시된 totals + DB 페이지네이션 병렬 실행
    const [paginated, totals] = await Promise.all([
      // 페이지 데이터: 항상 DB 직접 조회 (페이지/검색 조합이 다양)
      matchedNames
        ? settlementRepo.findByCSOMatchingPaginated(matchedNames, queryParams)
        : settlementRepo.findAllPaginated(queryParams),
      // 합계: 캐시 (검색 없이 월 전체 합계)
      getCachedTotals(matchedNamesKey, settlementMonth),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        columns: visibleColumns,
        yearMonths,
        notice,
        settlements: paginated.data,
        pagination: {
          page,
          pageSize,
          total: paginated.total,
          totalPages: Math.ceil(paginated.total / pageSize),
        },
        totals,
        ...(csoList && { csoList }),
      },
    });
  } catch (error) {
    console.error('Dashboard init error:', error);
    return NextResponse.json(
      { success: false, error: '초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

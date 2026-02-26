import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getSession } from '@/lib/auth';
import {
  getSettlementRepository,
  getCSOMatchingRepository,
  getColumnSettingRepository,
  getCompanyRepository,
} from '@/infrastructure/supabase';
import { DEFAULT_COLUMN_SETTINGS } from '@/types';

export const dynamic = 'force-dynamic';

// 합계·검색·그룹핑에 항상 필요한 컬럼
const ALWAYS_NEEDED_COLUMNS = [
  'id', 'business_number', '정산월', 'CSO관리업체',
  '제품명', '거래처명', '영업사원',
  '수량', '금액', '제약수수료_합계', '담당수수료_합계',
];

// 회사 정보 캐시 (footer-data 태그 — settings PUT 시 무효화됨)
const getCachedCompanyInfo = unstable_cache(
  async () => getCompanyRepository().get(),
  ['company-info'],
  { tags: ['footer-data'] }
);

/**
 * 대시보드/마스터 초기화 통합 API
 *
 * 4개의 개별 API(columns, year-months, company, settlements)를
 * 1회 호출로 병합하여 Vercel cold start × 4 → × 1 로 감소.
 *
 * Query params:
 *   - page (default 1)
 *   - page_size (default 50)
 *   - settlement_month (default: 최신월)
 *   - search
 *   - business_number (관리자: 특정 CSO 필터)
 *   - include_settlements (default true, false면 메타만 반환)
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
    const pageSize = parseInt(sp.get('page_size') || '50');
    const search = sp.get('search') || undefined;
    const filterBusinessNumber = sp.get('business_number') || undefined;
    const includeSettlements = sp.get('include_settlements') !== 'false';

    const settlementRepo = getSettlementRepository();
    const csoMatchingRepo = getCSOMatchingRepository();
    const columnSettingRepo = getColumnSettingRepository();

    // ── Phase 1: 병렬로 메타데이터 + CSO 매칭 조회 ──
    const [columns, companyInfo, matchedNames] = await Promise.all([
      columnSettingRepo.initialize(DEFAULT_COLUMN_SETTINGS).then(() => columnSettingRepo.findAll()),
      getCachedCompanyInfo(),
      session.is_admin
        ? filterBusinessNumber
          ? csoMatchingRepo.getMatchedCompanyNames(filterBusinessNumber)
          : Promise.resolve(null)
        : csoMatchingRepo.getMatchedCompanyNames(session.business_number),
    ]);

    // 일반 회원인데 매칭 없으면 빈 결과
    if (!session.is_admin && (!matchedNames || matchedNames.length === 0)) {
      return NextResponse.json({
        success: true,
        data: {
          columns: columns.filter(c => c.is_visible),
          yearMonths: [],
          notice: { notice_content: companyInfo.notice_content, ceo_name: companyInfo.ceo_name },
          settlements: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
          totals: { 수량: 0, 금액: 0, 제약수수료_합계: 0, 담당수수료_합계: 0 },
          noMatching: true,
        },
      });
    }

    // 관리자 + 특정 CSO 선택인데 매칭 없으면
    if (session.is_admin && filterBusinessNumber && matchedNames && matchedNames.length === 0) {
      // yearMonths는 전체 기준으로 반환 (CSO 매칭 없어도 월은 보여야 함)
      const yearMonths = await settlementRepo.getAvailableMonths();
      return NextResponse.json({
        success: true,
        data: {
          columns: columns.filter(c => c.is_visible),
          yearMonths,
          notice: { notice_content: companyInfo.notice_content, ceo_name: companyInfo.ceo_name },
          settlements: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
          totals: { 수량: 0, 금액: 0, 제약수수료_합계: 0, 담당수수료_합계: 0 },
        },
      });
    }

    // ── Phase 2: yearMonths 조회 ──
    const yearMonths = matchedNames
      ? await settlementRepo.getAvailableMonthsByCSOMatching(matchedNames)
      : await settlementRepo.getAvailableMonths();

    // settlement_month 결정: 쿼리 파라미터 > 최신월
    const settlementMonth = sp.get('settlement_month') || yearMonths[0] || undefined;

    // ── Phase 3: 데이터 조회 (include_settlements=true일 때만) ──
    if (!includeSettlements || !settlementMonth) {
      return NextResponse.json({
        success: true,
        data: {
          columns: columns.filter(c => c.is_visible),
          yearMonths,
          notice: { notice_content: companyInfo.notice_content, ceo_name: companyInfo.ceo_name },
          settlements: [],
          pagination: { page: 1, pageSize, total: 0, totalPages: 0 },
          totals: { 수량: 0, 금액: 0, 제약수수료_합계: 0, 담당수수료_합계: 0 },
        },
      });
    }

    const visibleColumnKeys = columns
      .filter(c => c.is_visible)
      .map(c => c.column_key);
    const selectColumns = [...new Set([...ALWAYS_NEEDED_COLUMNS, ...visibleColumnKeys])].join(',');
    const queryParams = { settlementMonth, selectColumns, page, pageSize, search };

    const [paginated, totals] = await Promise.all([
      matchedNames
        ? settlementRepo.findByCSOMatchingPaginated(matchedNames, queryParams)
        : settlementRepo.findAllPaginated(queryParams),
      matchedNames
        ? settlementRepo.getTotalsByCSOMatching(matchedNames, settlementMonth)
        : settlementRepo.getTotals(settlementMonth),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        columns: columns.filter(c => c.is_visible),
        yearMonths,
        notice: { notice_content: companyInfo.notice_content, ceo_name: companyInfo.ceo_name },
        settlements: paginated.data,
        pagination: {
          page,
          pageSize,
          total: paginated.total,
          totalPages: Math.ceil(paginated.total / pageSize),
        },
        totals,
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

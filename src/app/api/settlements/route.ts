import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSettlementRepository } from '@/infrastructure/supabase';
import {
  getCachedColumns,
  getCachedMatchedNames,
  getCachedTotals,
} from '@/lib/data-cache';

export const dynamic = 'force-dynamic';

// 합계 계산, 검색 필터, 그룹핑에 항상 필요한 컬럼
const ALWAYS_NEEDED_COLUMNS = [
  'id', 'business_number', '정산월', 'CSO관리업체',
  '제품명', '거래처명', '영업사원',
  '수량', '금액', '제약수수료_합계', '담당수수료_합계',
];

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const settlementMonth = searchParams.get('settlement_month') || searchParams.get('year_month') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '50');
    const search = searchParams.get('search') || undefined;
    const filterBusinessNumber = searchParams.get('business_number') || undefined;

    // 캐시된 컬럼 설정 사용
    const columnSettings = await getCachedColumns();
    const visibleColumnKeys = columnSettings
      .filter(c => c.is_visible)
      .map(c => c.column_key);
    const selectColumns = [...new Set([...ALWAYS_NEEDED_COLUMNS, ...visibleColumnKeys])].join(',');

    const settlementRepo = getSettlementRepository();
    const queryParams = { settlementMonth, selectColumns, page, pageSize, search };

    // 캐시된 CSO 매칭 결과 사용
    let matchedNames: string[] | null = null;

    if (session.is_admin) {
      if (filterBusinessNumber) {
        matchedNames = await getCachedMatchedNames(filterBusinessNumber);
        if (matchedNames.length === 0) {
          return NextResponse.json({
            success: true,
            data: {
              settlements: [],
              pagination: { page, pageSize, total: 0, totalPages: 0 },
              totals: { 수량: 0, 금액: 0, 제약수수료_합계: 0, 담당수수료_합계: 0 },
            },
          });
        }
      }
    } else {
      matchedNames = await getCachedMatchedNames(session.business_number);
      if (matchedNames.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            settlements: [],
            pagination: { page, pageSize, total: 0, totalPages: 0 },
            totals: { 수량: 0, 금액: 0, 제약수수료_합계: 0, 담당수수료_합계: 0 },
          },
        });
      }
    }

    const matchedNamesKey = matchedNames ? JSON.stringify(matchedNames) : 'ALL';

    // 캐시된 합계 + DB 페이지 데이터 병렬 조회
    const [paginated, totals] = await Promise.all([
      matchedNames
        ? settlementRepo.findByCSOMatchingPaginated(matchedNames, queryParams)
        : settlementRepo.findAllPaginated(queryParams),
      settlementMonth
        ? getCachedTotals(matchedNamesKey, settlementMonth)
        : Promise.resolve({ 수량: 0, 금액: 0, 제약수수료_합계: 0, 담당수수료_합계: 0 }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
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
    console.error('Get settlements error:', error);
    return NextResponse.json(
      { success: false, error: '정산서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Get available settlement months
export async function OPTIONS() {
  try {
    const months = await getSettlementRepository().getAvailableMonths();
    return NextResponse.json({
      success: true,
      data: months,
    });
  } catch (error) {
    console.error('Get settlement months error:', error);
    return NextResponse.json(
      { success: false, error: '정산월 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

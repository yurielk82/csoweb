import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getAllSettlements,
  getAvailableSettlementMonths,
  getSettlementsByCSOMatching,
  getColumnSettings
} from '@/lib/db';

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
    // 관리자용: 특정 CSO의 business_number로 필터링
    const filterBusinessNumber = searchParams.get('business_number') || undefined;

    // 표시 가능한 컬럼만 조회하여 SELECT 최적화 (39개 → ~15개)
    const columnSettings = await getColumnSettings();
    const visibleColumnKeys = columnSettings
      .filter(c => c.is_visible)
      .map(c => c.column_key);
    const selectColumns = [...new Set([...ALWAYS_NEEDED_COLUMNS, ...visibleColumnKeys])].join(',');

    let settlements;

    if (session.is_admin) {
      if (filterBusinessNumber) {
        settlements = await getSettlementsByCSOMatching(filterBusinessNumber, settlementMonth, selectColumns);
      } else {
        settlements = await getAllSettlements(settlementMonth, selectColumns);
      }
    } else {
      settlements = await getSettlementsByCSOMatching(
        session.business_number,
        settlementMonth,
        selectColumns
      );
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      settlements = settlements.filter(s =>
        s.제품명?.toLowerCase().includes(searchLower) ||
        s.거래처명?.toLowerCase().includes(searchLower) ||
        s.영업사원?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const total = settlements.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedData = settlements.slice(start, start + pageSize);

    // Calculate totals
    const totals = {
      수량: settlements.reduce((sum, s) => sum + (Number(s.수량) || 0), 0),
      금액: settlements.reduce((sum, s) => sum + (Number(s.금액) || 0), 0),
      제약수수료_합계: settlements.reduce((sum, s) => sum + (Number(s.제약수수료_합계) || 0), 0),
      담당수수료_합계: settlements.reduce((sum, s) => sum + (Number(s.담당수수료_합계) || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        settlements: paginatedData,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
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
    const months = await getAvailableSettlementMonths();
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

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMonthlySummaryByBusinessNumber, getMonthlySummaryByCSOMatching } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * 월별 수수료 합계 조회 API
 * - 관리자가 설정한 is_summary 컬럼 기준으로 합계 계산
 * - 정산월별로 그룹핑하여 반환
 * - 일반 회원: CSO매칭 테이블 기반으로 자신의 데이터만 조회
 * - 관리자: 전체 데이터 조회 (기존 로직 유지)
 */
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    let result;
    
    if (session.is_admin) {
      // 관리자: 기존 business_number 기반 조회 (전체 데이터)
      // 관리자는 특정 업체 필터 없이 전체를 볼 수 있도록 빈 결과 반환하거나
      // 필요시 특정 로직 적용 가능
      result = await getMonthlySummaryByBusinessNumber(session.business_number);
    } else {
      // 일반 회원: CSO매칭 테이블 기반 조회
      // 로그인한 회원의 사업자번호로 cso_matching에서 연결된 CSO관리업체명을 찾고
      // 해당 업체명의 정산 데이터에서 월별 합계 계산
      result = await getMonthlySummaryByCSOMatching(session.business_number);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        months: result.months,
        summary_columns: result.summary_columns.map(c => ({
          column_key: c.column_key,
          column_name: c.column_name,
          display_order: c.display_order,
        })),
      },
    });
  } catch (error) {
    console.error('Get monthly summary error:', error);
    return NextResponse.json(
      { success: false, error: '월별 합계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

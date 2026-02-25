import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMonthlySummary } from '@/application/settlement';

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

    const result = await getMonthlySummary(session.business_number, session.is_admin);

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

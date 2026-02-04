import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  getAvailableSettlementMonths,
  getAvailableSettlementMonthsByCSOMatching 
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    let months: string[];
    
    if (session.is_admin) {
      // 관리자: 전체 정산월 조회
      months = await getAvailableSettlementMonths();
    } else {
      // 일반 회원: CSO매칭 테이블 기반으로 자신의 데이터가 있는 정산월만 조회
      months = await getAvailableSettlementMonthsByCSOMatching(session.business_number);
    }
    
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

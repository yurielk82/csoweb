import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSettlementRepository } from '@/infrastructure/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const month = request.nextUrl.searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: '정산월(YYYY-MM) 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    // DB에서 DISTINCT 직접 조회 — cso_matching 경유 불필요
    const companies = await getSettlementRepository().getCSOCompaniesForMonth(month);

    return NextResponse.json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error('Get CSO companies error:', error);
    return NextResponse.json(
      { success: false, error: 'CSO 업체 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

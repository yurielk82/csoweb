import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSettlementRepository } from '@/infrastructure/supabase';
import { getCachedCSOMatchingList } from '@/lib/data-cache';

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

    const [businessNumbers, allMatchings] = await Promise.all([
      getSettlementRepository().getBusinessNumbersForMonth(month),
      getCachedCSOMatchingList(),
    ]);
    const bizSet = new Set(businessNumbers.filter(Boolean));
    // business_number당 첫 번째 CSO명 사용 (1 BN → N개 CSO명 가능)
    const bnToName = new Map<string, string>();
    for (const m of allMatchings) {
      if (bizSet.has(m.business_number) && !bnToName.has(m.business_number)) {
        bnToName.set(m.business_number, m.cso_company_name);
      }
    }
    const filtered = Array.from(bnToName.entries())
      .map(([bn, name]) => ({ business_number: bn, company_name: name }))
      .sort((a, b) => a.company_name.localeCompare(b.company_name));

    return NextResponse.json({
      success: true,
      data: filtered,
    });
  } catch (error) {
    console.error('Get CSO companies error:', error);
    return NextResponse.json(
      { success: false, error: 'CSO 업체 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

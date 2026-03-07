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

    // Step 1: 해당 월의 DISTINCT CSO관리업체 이름 조회 (pagination 적용)
    const csoNames = await getSettlementRepository().getCSOCompanyNamesForMonth(month);

    // Step 2: cso_matching 전체 조회 (캐시)
    const matchingList = await getCachedCSOMatchingList();

    // Step 3: CSO 이름 기준 JOIN → { business_number(CSO BN), company_name }
    const matchingMap = new Map<string, string>();
    for (const m of matchingList) {
      if (m.cso_company_name && m.business_number) {
        matchingMap.set(m.cso_company_name, m.business_number);
      }
    }

    const companies = csoNames
      .filter(name => matchingMap.has(name))
      .map(name => ({
        business_number: matchingMap.get(name)!,
        company_name: name,
      }))
      .sort((a, b) => a.company_name.localeCompare(b.company_name));

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

// ===========================================
// CSO Matching Integrity Check API (v2)
// 사업자번호 기준 그룹핑, CSO관리업체명 배열로 반환
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface IntegrityResultV2 {
  id: string;
  business_number: string;
  business_name: string | null; // 사업자명 (회원DB 또는 수동입력)
  registration_status: 'registered' | 'unregistered' | 'pending_approval';
  cso_company_names: string[]; // CSO관리업체명 배열 (태그)
  last_settlement_month: string | null;
  row_count: number;
  is_readonly: boolean; // 사업자번호/사업자명 편집 가능 여부
}

export async function GET(request: NextRequest) {
  try {
    // Admin check
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    // 1. CSO 매칭 테이블 전체 조회
    const { data: matchingData, error: matchingError } = await supabase
      .from('cso_matching')
      .select('cso_company_name, business_number');

    if (matchingError) {
      console.error('CSO matching fetch error:', matchingError);
    }

    type MatchingRow = {
      cso_company_name: string;
      business_number: string;
    };

    // 사업자번호별로 CSO관리업체명 그룹핑
    const bizToCSO = new Map<string, Set<string>>();
    const csoToBiz = new Map<string, string>(); // CSO명 → 사업자번호 (중복 검증용)
    
    for (const match of (matchingData as unknown as MatchingRow[]) || []) {
      if (!bizToCSO.has(match.business_number)) {
        bizToCSO.set(match.business_number, new Set());
      }
      bizToCSO.get(match.business_number)!.add(match.cso_company_name);
      csoToBiz.set(match.cso_company_name, match.business_number);
    }

    // 2. 회원(users) 테이블 조회
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('business_number, company_name, is_approved, is_admin');

    if (usersError) {
      console.error('Users fetch error:', usersError);
      return NextResponse.json(
        { success: false, error: '회원 데이터 조회 실패' },
        { status: 500 }
      );
    }

    type UserRow = {
      business_number: string;
      company_name: string;
      is_approved: boolean;
      is_admin: boolean;
    };

    // 사업자번호로 회원 정보 맵 생성
    const userMap = new Map<string, {
      company_name: string;
      is_approved: boolean;
    }>();
    for (const user of (usersData as unknown as UserRow[]) || []) {
      if (user.is_admin) continue;
      userMap.set(user.business_number, {
        company_name: user.company_name,
        is_approved: user.is_approved,
      });
    }

    // 3. 정산서 데이터에서 통계 추출
    type SettlementRow = {
      'CSO관리업체': string | null;
      '정산월': string | null;
      business_number: string;
    };

    const allSettlementData: SettlementRow[] = [];
    const pageSize = 1000;
    let page = 0;

    while (true) {
      let query = supabase
        .from('settlements')
        .select('CSO관리업체, 정산월, business_number');

      if (month) {
        query = query.eq('정산월', month);
      }

      const { data, error } = await query
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Settlement fetch error:', error);
        break;
      }

      if (!data || data.length === 0) break;
      allSettlementData.push(...(data as unknown as SettlementRow[]));
      if (data.length < pageSize) break;
      page++;
    }

    // CSO관리업체별 통계
    const csoStats = new Map<string, { count: number; lastMonth: string | null }>();
    for (const row of allSettlementData) {
      const csoName = row['CSO관리업체'];
      if (!csoName) continue;

      if (!csoStats.has(csoName)) {
        csoStats.set(csoName, { count: 0, lastMonth: null });
      }
      const stat = csoStats.get(csoName)!;
      stat.count++;
      if (row['정산월'] && (!stat.lastMonth || row['정산월'] > stat.lastMonth)) {
        stat.lastMonth = row['정산월'];
      }
    }

    // 4. 결과 생성 (사업자번호 기준)
    const results: IntegrityResultV2[] = [];
    const processedBusinessNumbers = new Set<string>();

    // 4-1. 매칭 테이블에 있는 사업자번호 처리
    for (const [bizNum, csoNames] of bizToCSO.entries()) {
      processedBusinessNumbers.add(bizNum);
      
      const user = userMap.get(bizNum);
      const csoArray = Array.from(csoNames);
      
      // 해당 사업자번호의 CSO들 통계 합산
      let totalCount = 0;
      let lastMonth: string | null = null;
      for (const csoName of csoArray) {
        const stat = csoStats.get(csoName);
        if (stat) {
          totalCount += stat.count;
          if (stat.lastMonth && (!lastMonth || stat.lastMonth > lastMonth)) {
            lastMonth = stat.lastMonth;
          }
        }
      }

      let status: IntegrityResultV2['registration_status'];
      let businessName: string | null = null;
      let isReadonly = false;

      if (user) {
        status = user.is_approved ? 'registered' : 'pending_approval';
        businessName = user.company_name;
        isReadonly = true; // 회원가입된 경우 사업자번호/사업자명 수정 불가
      } else {
        status = 'unregistered';
        businessName = null; // 수동 입력 필요
        isReadonly = false;
      }

      results.push({
        id: `biz-${bizNum}`,
        business_number: bizNum,
        business_name: businessName,
        registration_status: status,
        cso_company_names: csoArray,
        last_settlement_month: lastMonth,
        row_count: totalCount,
        is_readonly: isReadonly,
      });
    }

    // 4-2. 매칭 테이블에 없지만 회원인 경우 (매칭 추가 필요)
    for (const [bizNum, user] of userMap.entries()) {
      if (processedBusinessNumbers.has(bizNum)) continue;

      results.push({
        id: `user-${bizNum}`,
        business_number: bizNum,
        business_name: user.company_name,
        registration_status: user.is_approved ? 'registered' : 'pending_approval',
        cso_company_names: [], // CSO 매칭 없음 - 추가 필요
        last_settlement_month: null,
        row_count: 0,
        is_readonly: true,
      });
    }

    // 5. 정렬: 미등록 우선, 그 다음 사업자명 순
    results.sort((a, b) => {
      // 상태 우선순위: unregistered > pending_approval > registered
      const statusOrder = { unregistered: 0, pending_approval: 1, registered: 2 };
      const statusDiff = statusOrder[a.registration_status] - statusOrder[b.registration_status];
      if (statusDiff !== 0) return statusDiff;
      
      // CSO 매칭 없는 항목 우선
      if (a.cso_company_names.length === 0 && b.cso_company_names.length > 0) return -1;
      if (a.cso_company_names.length > 0 && b.cso_company_names.length === 0) return 1;
      
      // 사업자번호 순
      return a.business_number.localeCompare(b.business_number);
    });

    // 6. 통계
    const stats = {
      total: results.length,
      registered: results.filter(r => r.registration_status === 'registered').length,
      unregistered: results.filter(r => r.registration_status === 'unregistered').length,
      pending_approval: results.filter(r => r.registration_status === 'pending_approval').length,
      no_cso_match: results.filter(r => r.cso_company_names.length === 0).length,
    };

    // 7. 사용 가능한 정산월 목록
    const { data: monthsData } = await supabase
      .from('settlements')
      .select('정산월')
      .not('정산월', 'is', null);

    type MonthRow = { '정산월': string | null };
    const availableMonths = [...new Set(((monthsData as unknown as MonthRow[]) || []).map(d => d['정산월']))]
      .filter(Boolean)
      .sort()
      .reverse() as string[];

    // 8. CSO명 → 사업자번호 매핑 (중복 검증용)
    const csoMapping = Object.fromEntries(csoToBiz);

    return NextResponse.json({
      success: true,
      data: {
        results,
        availableMonths,
        stats,
        csoMapping, // 프론트에서 중복 검증에 사용
      },
    });
  } catch (error) {
    console.error('Integrity check error:', error);
    return NextResponse.json(
      { success: false, error: '무결성 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

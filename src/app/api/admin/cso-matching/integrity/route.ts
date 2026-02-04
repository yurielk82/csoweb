// ===========================================
// CSO Matching Integrity Check API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 텍스트 정규화 함수 (공백/특수문자 제거)
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, '') // 모든 공백 제거
    .replace(/[^\w가-힣]/g, '') // 특수문자 제거
    .toLowerCase();
}

interface IntegrityResult {
  id: string;
  cso_company_name: string;
  business_number: string | null;
  status: 'normal' | 'unregistered' | 'pending_join' | 'missing_match';
  erp_company_name: string | null;
  last_settlement_month: string | null;
  is_approved: boolean | null;
  row_count: number;
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

    // 1. 정산서에서 고유한 CSO관리업체 목록 추출 (페이지네이션으로 전체 조회)
    // Type assertion for settlement data
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
        return NextResponse.json(
          { success: false, error: '정산 데이터 조회 실패' },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) break;
      
      allSettlementData.push(...(data as unknown as SettlementRow[]));
      
      if (data.length < pageSize) break;
      page++;
    }

    console.log(`Total settlement rows fetched: ${allSettlementData.length}`);

    // CSO관리업체별 통계 집계
    const csoStats = new Map<string, {
      count: number;
      lastMonth: string | null;
      businessNumbers: Set<string>;
    }>();

    for (const row of allSettlementData) {
      const csoName = row['CSO관리업체'];
      if (!csoName) continue;

      if (!csoStats.has(csoName)) {
        csoStats.set(csoName, {
          count: 0,
          lastMonth: null,
          businessNumbers: new Set(),
        });
      }

      const stat = csoStats.get(csoName)!;
      stat.count++;
      
      if (row['정산월'] && (!stat.lastMonth || row['정산월'] > stat.lastMonth)) {
        stat.lastMonth = row['정산월'];
      }
      
      if (row.business_number) {
        stat.businessNumbers.add(row.business_number);
      }
    }

    console.log(`Unique CSO companies found: ${csoStats.size}`);

    // 2. CSO 매칭 테이블 조회
    const { data: matchingData, error: matchingError } = await supabase
      .from('cso_matching')
      .select('*');

    if (matchingError) {
      console.error('CSO matching fetch error:', matchingError);
      // 테이블이 없을 수 있으므로 빈 배열로 처리
    }

    // Type assertion for matching data
    type MatchingRow = {
      cso_company_name: string;
      business_number: string;
    };

    // 매칭 테이블을 정규화된 이름으로 맵 생성
    const matchingMap = new Map<string, { business_number: string; original_name: string }>();
    for (const match of (matchingData as unknown as MatchingRow[]) || []) {
      const normalizedName = normalizeText(match.cso_company_name);
      matchingMap.set(normalizedName, {
        business_number: match.business_number,
        original_name: match.cso_company_name,
      });
    }

    // 3. 회원(users) 테이블 조회
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

    // Type assertion for users data
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
      is_admin: boolean;
    }>();
    for (const user of (usersData as unknown as UserRow[]) || []) {
      if (user.is_admin) continue; // 관리자 제외
      userMap.set(user.business_number, {
        company_name: user.company_name,
        is_approved: user.is_approved,
        is_admin: user.is_admin,
      });
    }

    // 4. 무결성 검증 수행
    const results: IntegrityResult[] = [];

    for (const [csoName, stats] of csoStats.entries()) {
      const normalizedName = normalizeText(csoName);
      const matching = matchingMap.get(normalizedName);

      let status: IntegrityResult['status'];
      let businessNumber: string | null = null;
      let erpCompanyName: string | null = null;
      let isApproved: boolean | null = null;

      if (!matching) {
        // 매칭 테이블에 없음 - 미등록
        status = 'unregistered';
      } else {
        businessNumber = matching.business_number;
        const user = userMap.get(businessNumber);

        if (!user) {
          // 회원 테이블에 없음 - 가입대기
          status = 'pending_join';
        } else {
          erpCompanyName = user.company_name;
          isApproved = user.is_approved;
          status = 'normal';
        }
      }

      results.push({
        id: `cso-${normalizedName}`,
        cso_company_name: csoName,
        business_number: businessNumber,
        status,
        erp_company_name: erpCompanyName,
        last_settlement_month: stats.lastMonth,
        is_approved: isApproved,
        row_count: stats.count,
      });
    }

    // 5. 매칭누락 케이스 추가 확인 (회원은 있지만 매칭 테이블에 없는 경우)
    // 정산서에 있는 사업자번호 중 매칭 테이블에 없는 회원 확인
    const settlementBusinessNumbers = new Set<string>();
    for (const stat of csoStats.values()) {
      for (const bn of stat.businessNumbers) {
        settlementBusinessNumbers.add(bn);
      }
    }

    // 이미 처리된 사업자번호 목록
    const processedBusinessNumbers = new Set<string>();
    for (const result of results) {
      if (result.business_number) {
        processedBusinessNumbers.add(result.business_number);
      }
    }

    // 정산서에 있지만 매칭 테이블에 없고, 회원은 있는 경우
    for (const bn of settlementBusinessNumbers) {
      if (processedBusinessNumbers.has(bn)) continue;

      const user = userMap.get(bn);
      if (user) {
        // 매칭 테이블에 없지만 회원은 있음 - 매칭누락
        const csoCount = Array.from(csoStats.entries())
          .filter(([, stat]) => stat.businessNumbers.has(bn))
          .reduce((sum, [, stat]) => sum + stat.count, 0);

        const lastMonth = Array.from(csoStats.entries())
          .filter(([, stat]) => stat.businessNumbers.has(bn))
          .map(([, stat]) => stat.lastMonth)
          .filter(Boolean)
          .sort()
          .reverse()[0] || null;

        results.push({
          id: `user-${bn}`,
          cso_company_name: user.company_name,
          business_number: bn,
          status: 'missing_match',
          erp_company_name: user.company_name,
          last_settlement_month: lastMonth,
          is_approved: user.is_approved,
          row_count: csoCount,
        });
      }
    }

    // 상태별, 업체명별 정렬
    results.sort((a, b) => {
      // 에러 상태 우선 정렬
      const statusOrder = { unregistered: 0, pending_join: 1, missing_match: 2, normal: 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // 같은 상태면 업체명 순
      return a.cso_company_name.localeCompare(b.cso_company_name, 'ko');
    });

    // 6. 사용 가능한 정산월 목록 조회
    const { data: monthsData } = await supabase
      .from('settlements')
      .select('정산월')
      .not('정산월', 'is', null);

    type MonthRow = { '정산월': string | null };
    const availableMonths = [...new Set(((monthsData as unknown as MonthRow[]) || []).map(d => d['정산월']))]
      .filter(Boolean)
      .sort()
      .reverse() as string[];

    return NextResponse.json({
      success: true,
      data: {
        results,
        availableMonths,
        stats: {
          total: results.length,
          normal: results.filter(r => r.status === 'normal').length,
          unregistered: results.filter(r => r.status === 'unregistered').length,
          pending_join: results.filter(r => r.status === 'pending_join').length,
          missing_match: results.filter(r => r.status === 'missing_match').length,
        },
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

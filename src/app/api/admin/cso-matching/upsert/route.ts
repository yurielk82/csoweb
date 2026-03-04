// ===========================================
// CSO Matching Upsert API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { getCachedCSOMatchingList, invalidateCSOMatchingCache } from '@/lib/data-cache';

export const dynamic = 'force-dynamic';

interface MatchingItem {
  cso_company_name: string;
  business_number: string;
}

export async function POST(request: NextRequest) {
  try {
    // Admin check
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const items: MatchingItem[] = body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '업로드할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // Validate items
    const validItems: MatchingItem[] = [];
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.cso_company_name || !item.cso_company_name.trim()) {
        errors.push(`행 ${i + 1}: 업체명이 비어있습니다.`);
        continue;
      }

      if (!item.business_number || item.business_number.length !== 10) {
        errors.push(`행 ${i + 1}: 유효하지 않은 사업자번호 (${item.business_number})`);
        continue;
      }

      validItems.push({
        cso_company_name: item.cso_company_name.trim(),
        business_number: item.business_number,
      });
    }

    if (validItems.length === 0) {
      return NextResponse.json(
        { success: false, error: '유효한 데이터가 없습니다.', details: errors },
        { status: 400 }
      );
    }

    // 파일 내 중복 제거 (동일 cso_company_name은 마지막 값 유지)
    const dedupMap = new Map<string, string>();
    let duplicatesRemoved = 0;
    for (const item of validItems) {
      const existing = dedupMap.get(item.cso_company_name);
      if (existing !== undefined) {
        duplicatesRemoved++;
      }
      dedupMap.set(item.cso_company_name, item.business_number);
    }

    const supabase = getSupabase();

    // 기존 DB 매칭 데이터 조회
    const { data: existingData, error: fetchError } = await supabase
      .from('cso_matching')
      .select('cso_company_name, business_number');

    if (fetchError) {
      console.error('Fetch existing data error:', fetchError);
      if (fetchError.code === '42P01') {
        return NextResponse.json(
          { success: false, error: 'cso_matching 테이블이 존재하지 않습니다. 데이터베이스를 확인해주세요.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { success: false, error: `기존 데이터 조회 실패: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const existingMap = new Map<string, string>();
    for (const row of existingData || []) {
      existingMap.set(row.cso_company_name, row.business_number);
    }

    // 비교 분류
    const toInsert: MatchingItem[] = [];
    let skipped = 0;
    let updated = 0;

    for (const [csoName, bizNum] of dedupMap) {
      const existingBizNum = existingMap.get(csoName);

      if (existingBizNum === undefined) {
        // DB에 없음 → 신규 추가
        toInsert.push({ cso_company_name: csoName, business_number: bizNum });
      } else if (existingBizNum === bizNum) {
        // 동일 정보 → 스킵
        skipped++;
      } else {
        // 사업자번호 변경 → 업데이트
        toInsert.push({ cso_company_name: csoName, business_number: bizNum });
        updated++;
      }
    }

    // 신규 항목만 INSERT (배치 100건)
    let insertedCount = 0;

    if (toInsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize).map(item => ({
          cso_company_name: item.cso_company_name,
          business_number: item.business_number,
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('cso_matching')
          .upsert(batch, {
            onConflict: 'cso_company_name',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error('Upsert error:', error);
          return NextResponse.json(
            { success: false, error: `데이터 저장 실패: ${error.message}` },
            { status: 500 }
          );
        }

        insertedCount += batch.length;
      }

      // CSO 매칭 캐시 무효화 (실제 변경이 있을 때만)
      invalidateCSOMatchingCache();
    }

    // 결과 메시지 구성
    const newInsertCount = insertedCount - updated;
    const messageParts: string[] = [];
    if (newInsertCount > 0) messageParts.push(`신규 ${newInsertCount}건 추가`);
    if (updated > 0) messageParts.push(`${updated}건 업데이트`);
    if (skipped > 0) messageParts.push(`동일 ${skipped}건 스킵`);
    if (duplicatesRemoved > 0) messageParts.push(`파일 내 중복 ${duplicatesRemoved}건 제거`);

    return NextResponse.json({
      success: true,
      data: {
        inserted: newInsertCount,
        updated,
        skipped,
        duplicatesRemoved,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        hasMoreErrors: errors.length > 10,
      },
      message: messageParts.join(', ') || '변경 사항이 없습니다.',
    });
  } catch (error) {
    console.error('Upsert error:', error);
    return NextResponse.json(
      { success: false, error: '매칭 데이터 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 매칭 테이블 전체 조회
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // 검색어 없으면 캐시 사용, 있으면 DB 직접 조회
    if (!search) {
      const data = await getCachedCSOMatchingList();
      return NextResponse.json({ success: true, data });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('cso_matching')
      .select('*')
      .order('cso_company_name', { ascending: true })
      .or(`cso_company_name.ilike.%${search}%,business_number.ilike.%${search}%`);

    if (error) {
      console.error('Fetch matching data error:', error);
      return NextResponse.json(
        { success: false, error: '매칭 데이터 조회 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { success: false, error: '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 특정 매칭 삭제
export async function DELETE(request: NextRequest) {
  try {
    // Admin check
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cso_company_name } = body;

    if (!cso_company_name) {
      return NextResponse.json(
        { success: false, error: '업체명이 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('cso_matching')
      .delete()
      .eq('cso_company_name', cso_company_name);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { success: false, error: '삭제 실패' },
        { status: 500 }
      );
    }

    // CSO 매칭 캐시 무효화
    invalidateCSOMatchingCache();

    return NextResponse.json({
      success: true,
      message: '매칭 데이터가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { success: false, error: '삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

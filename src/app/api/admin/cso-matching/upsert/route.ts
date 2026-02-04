// ===========================================
// CSO Matching Upsert API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

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

    const supabase = getSupabase();

    // Upsert in batches
    const batchSize = 100;
    let upsertedCount = 0;

    for (let i = 0; i < validItems.length; i += batchSize) {
      const batch = validItems.slice(i, i + batchSize).map(item => ({
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
        // 테이블이 없을 수 있으므로 생성 시도
        if (error.code === '42P01') {
          return NextResponse.json(
            { success: false, error: 'cso_matching 테이블이 존재하지 않습니다. 데이터베이스를 확인해주세요.' },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { success: false, error: `데이터 저장 실패: ${error.message}` },
          { status: 500 }
        );
      }

      upsertedCount += batch.length;
    }

    return NextResponse.json({
      success: true,
      data: {
        upserted: upsertedCount,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        hasMoreErrors: errors.length > 10,
      },
      message: `${upsertedCount}건의 매칭 데이터가 저장되었습니다.`,
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

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = supabase
      .from('cso_matching')
      .select('*')
      .order('cso_company_name', { ascending: true });

    if (search) {
      query = query.or(`cso_company_name.ilike.%${search}%,business_number.ilike.%${search}%`);
    }

    const { data, error } = await query;

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

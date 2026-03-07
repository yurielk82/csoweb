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

// ── Helpers ──

function validateItems(items: MatchingItem[]): { validItems: MatchingItem[]; errors: string[] } {
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
    validItems.push({ cso_company_name: item.cso_company_name.trim(), business_number: item.business_number });
  }

  return { validItems, errors };
}

function deduplicateItems(validItems: MatchingItem[]) {
  const dedupMap = new Map<string, string>();
  let duplicatesRemoved = 0;

  for (const item of validItems) {
    if (dedupMap.has(item.cso_company_name)) duplicatesRemoved++;
    dedupMap.set(item.cso_company_name, item.business_number);
  }

  return { dedupMap, duplicatesRemoved };
}

function classifyItems(
  dedupMap: Map<string, string>,
  existingMap: Map<string, string>,
) {
  const toInsert: MatchingItem[] = [];
  let skipped = 0;
  let updated = 0;

  for (const [csoName, bizNum] of dedupMap) {
    const existingBizNum = existingMap.get(csoName);
    if (existingBizNum === undefined) {
      toInsert.push({ cso_company_name: csoName, business_number: bizNum });
    } else if (existingBizNum === bizNum) {
      skipped++;
    } else {
      toInsert.push({ cso_company_name: csoName, business_number: bizNum });
      updated++;
    }
  }

  return { toInsert, skipped, updated };
}

async function batchUpsert(supabase: ReturnType<typeof getSupabase>, toInsert: MatchingItem[]) {
  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize).map(item => ({
      cso_company_name: item.cso_company_name,
      business_number: item.business_number,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('cso_matching').upsert(batch, {
      onConflict: 'cso_company_name',
      ignoreDuplicates: false,
    });

    if (error) {
      console.error('Upsert error:', error);
      return { success: false as const, error: `데이터 저장 실패: ${error.message}` };
    }
    insertedCount += batch.length;
  }

  return { success: true as const, insertedCount };
}

function requireAdmin() {
  return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
}

// ── Route handlers ──

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return requireAdmin();

    const body = await request.json();
    const items: MatchingItem[] = body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: '업로드할 데이터가 없습니다.' }, { status: 400 });
    }

    const { validItems, errors } = validateItems(items);
    if (validItems.length === 0) {
      return NextResponse.json({ success: false, error: '유효한 데이터가 없습니다.', details: errors }, { status: 400 });
    }

    const { dedupMap, duplicatesRemoved } = deduplicateItems(validItems);
    const supabase = getSupabase();

    const { data: existingData, error: fetchError } = await supabase
      .from('cso_matching')
      .select('cso_company_name, business_number');

    if (fetchError) {
      console.error('Fetch existing data error:', fetchError);
      const msg = fetchError.code === '42P01'
        ? 'cso_matching 테이블이 존재하지 않습니다. 데이터베이스를 확인해주세요.'
        : `기존 데이터 조회 실패: ${fetchError.message}`;
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }

    const existingMap = new Map<string, string>();
    for (const row of existingData || []) {
      existingMap.set(row.cso_company_name, row.business_number);
    }

    const { toInsert, skipped, updated } = classifyItems(dedupMap, existingMap);

    if (toInsert.length > 0) {
      const result = await batchUpsert(supabase, toInsert);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }
      invalidateCSOMatchingCache();
    }

    const newInsertCount = toInsert.length - updated;
    const messageParts: string[] = [];
    if (newInsertCount > 0) messageParts.push(`신규 ${newInsertCount}건 추가`);
    if (updated > 0) messageParts.push(`${updated}건 업데이트`);
    if (skipped > 0) messageParts.push(`동일 ${skipped}건 스킵`);
    if (duplicatesRemoved > 0) messageParts.push(`파일 내 중복 ${duplicatesRemoved}건 제거`);

    return NextResponse.json({
      success: true,
      data: {
        inserted: newInsertCount, updated, skipped, duplicatesRemoved,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        hasMoreErrors: errors.length > 10,
      },
      message: messageParts.join(', ') || '변경 사항이 없습니다.',
    });
  } catch (error) {
    console.error('Upsert error:', error);
    return NextResponse.json({ success: false, error: '매칭 데이터 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

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
      return NextResponse.json({ success: false, error: '매칭 데이터 조회 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ success: false, error: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) return requireAdmin();

    const body = await request.json();
    const { cso_company_name } = body;

    if (!cso_company_name) {
      return NextResponse.json({ success: false, error: '업체명이 필요합니다.' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('cso_matching').delete().eq('cso_company_name', cso_company_name);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ success: false, error: '삭제 실패' }, { status: 500 });
    }

    invalidateCSOMatchingCache();
    return NextResponse.json({ success: true, message: '매칭 데이터가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ success: false, error: '삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

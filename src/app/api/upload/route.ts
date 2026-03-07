import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { parseExcelFile } from '@/lib/excel';
import { getSettlementRepository } from '@/infrastructure/supabase';
import { getSupabase } from '@/lib/supabase';
import { invalidateSettlementCache, invalidateCSOMatchingCache } from '@/lib/data-cache';
import type { Settlement } from '@/types';

// 메모리 제한 증가
export const maxDuration = 60; // 60초 타임아웃
export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const CSO_MAPPING_BATCH_SIZE = 100;

// ── Validation ──

function validateUploadFile(file: File): string | null {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return '허용되지 않는 파일 형식입니다. Excel 파일(.xlsx, .xls)만 업로드 가능합니다.';
  }
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return '허용되지 않는 파일 형식입니다. Excel 파일(.xlsx, .xls)만 업로드 가능합니다.';
  }
  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = file.size / (1024 * 1024);
    return `파일 크기(${fileSizeMB.toFixed(1)}MB)가 4MB를 초과합니다. 파일을 분할해주세요.`;
  }
  return null;
}

function parseCustomMapping(formData: FormData): Record<string, string> | undefined {
  const customMappingStr = formData.get('customMapping') as string | null;
  if (!customMappingStr) return undefined;

  try {
    const mapping = JSON.parse(customMappingStr);
    console.log('Using custom column mapping:', Object.keys(mapping || {}).length, 'columns');
    return mapping;
  } catch (error) {
    console.error('업로드 JSON 파싱 오류:', error);
    console.warn('Invalid custom mapping JSON, ignoring');
    return undefined;
  }
}

// ── 접속업체 스냅샷 저장 ──

async function saveUploadSnapshots(
  data: Partial<Settlement>[],
  settlementMonths: string[],
  settlementRepo: ReturnType<typeof getSettlementRepository>,
) {
  const supabaseClient = getSupabase();
  const { data: adminUsers } = await supabaseClient
    .from('users')
    .select('business_number')
    .eq('is_admin', true);
  const adminBnSet = new Set((adminUsers || []).map((u: { business_number: string }) => u.business_number));

  for (const month of settlementMonths) {
    const monthBizNumbers = [...new Set(
      data
        .filter(row => row.정산월 === month)
        .map(row => row.business_number?.toString().trim())
        .filter((bn): bn is string => !!bn && !adminBnSet.has(bn))
    )];

    await settlementRepo.upsertUploadSnapshot({
      settlement_month: month,
      row_count: data.filter(row => row.정산월 === month).length,
      cso_business_numbers: monthBizNumbers,
      accessed_business_numbers: [],
    });
  }

  console.log(`접속업체 스냅샷 저장 완료: ${settlementMonths.join(', ')}`);
}

// ── CSO 매핑 자동 생성 ──

async function autoCreateCsoMappings(data: Partial<Settlement>[]) {
  const csoMappings = new Map<string, string>();
  for (const row of data) {
    const csoName = row.CSO관리업체?.toString().trim();
    const bn = row.business_number?.toString().trim();
    if (csoName && bn && bn.length === 10) csoMappings.set(csoName, bn);
  }

  if (csoMappings.size === 0) return;

  const upsertItems = Array.from(csoMappings.entries()).map(([name, bn]) => ({
    cso_company_name: name,
    business_number: bn,
    updated_at: new Date().toISOString(),
  }));

  const supabase = getSupabase();
  for (let i = 0; i < upsertItems.length; i += CSO_MAPPING_BATCH_SIZE) {
    await supabase.from('cso_matching').upsert(
      upsertItems.slice(i, i + CSO_MAPPING_BATCH_SIZE),
      { onConflict: 'cso_company_name', ignoreDuplicates: false },
    );
  }

  invalidateCSOMatchingCache();
  console.log(`CSO 매핑 자동 생성: ${upsertItems.length}건`);
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: '파일을 선택해주세요.' }, { status: 400 });
    }

    const validationError = validateUploadFile(file);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    console.log(`Parsing Excel file: ${file.name}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);

    const customMapping = parseCustomMapping(formData);
    const buffer = await file.arrayBuffer();
    const { data, errors } = await parseExcelFile(buffer, customMapping);

    console.log(`Parsed: ${data.length} rows, ${errors.length} errors`);

    if (errors.length > 0 && data.length === 0) {
      return NextResponse.json({ success: false, error: errors.join('\n') }, { status: 400 });
    }

    if (!data.some(row => row.정산월)) {
      return NextResponse.json({ success: false, error: '정산월 컬럼이 없거나 데이터가 비어있습니다.' }, { status: 400 });
    }

    const settlementRepo = getSettlementRepository();
    const { rowCount, settlementMonths } = await settlementRepo.insert(data);
    invalidateSettlementCache();

    // 비동기 후속 작업 (실패해도 업로드 성공에 영향 없음)
    try { await saveUploadSnapshots(data, settlementMonths, settlementRepo); }
    catch (error) { console.error('접속업체 스냅샷 저장 실패 (업로드는 정상 처리됨):', error); }

    try { await autoCreateCsoMappings(data); }
    catch (error) { console.error('CSO 매핑 자동 생성 실패 (업로드는 정상 처리됨):', error); }

    return NextResponse.json({
      success: true,
      data: { rowCount, settlementMonths, errors: errors.length > 0 ? errors : undefined },
      message: `${rowCount.toLocaleString()}건 업로드 완료 (정산월: ${settlementMonths.join(', ')})`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json(
      { success: false, error: `파일 업로드 중 오류가 발생했습니다: ${errorMessage}` },
      { status: 500 }
    );
  }
}

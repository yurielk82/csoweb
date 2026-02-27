import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { parseExcelFile } from '@/lib/excel';
import { getSettlementRepository } from '@/infrastructure/supabase';
import { getSupabase } from '@/lib/supabase';
import { invalidateSettlementCache, invalidateCSOMatchingCache } from '@/lib/data-cache';

// 메모리 제한 증가
export const maxDuration = 60; // 60초 타임아웃
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.is_admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 파일 확장자 검증
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { success: false, error: `허용되지 않는 파일 형식입니다. Excel 파일(.xlsx, .xls)만 업로드 가능합니다.` },
        { status: 400 }
      );
    }

    // MIME 타입 검증
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (file.type && !allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `허용되지 않는 파일 형식입니다. Excel 파일(.xlsx, .xls)만 업로드 가능합니다.` },
        { status: 400 }
      );
    }

    // 파일 크기 체크 (4MB 제한 — Next.js body parser 기본값과 통일)
    const fileSizeMB = file.size / (1024 * 1024);
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `파일 크기(${fileSizeMB.toFixed(1)}MB)가 4MB를 초과합니다. 파일을 분할해주세요.` },
        { status: 400 }
      );
    }
    
    console.log(`Parsing Excel file: ${file.name}, size: ${fileSizeMB.toFixed(2)}MB`);
    
    // 커스텀 매핑 파싱
    const customMappingStr = formData.get('customMapping') as string | null;
    let customMapping: Record<string, string> | undefined;
    if (customMappingStr) {
      try {
        customMapping = JSON.parse(customMappingStr);
        console.log('Using custom column mapping:', Object.keys(customMapping || {}).length, 'columns');
      } catch (error) {
        console.error('업로드 JSON 파싱 오류:', error);
        console.warn('Invalid custom mapping JSON, ignoring');
      }
    }
    
    // Parse Excel file (async)
    const buffer = await file.arrayBuffer();
    const { data, errors } = await parseExcelFile(buffer, customMapping);
    
    console.log(`Parsed: ${data.length} rows, ${errors.length} errors`);
    
    if (errors.length > 0 && data.length === 0) {
      return NextResponse.json(
        { success: false, error: errors.join('\n') },
        { status: 400 }
      );
    }
    
    // 정산월이 있는지 확인
    const hasSettlementMonth = data.some(row => row.정산월);
    if (!hasSettlementMonth) {
      return NextResponse.json(
        { success: false, error: '정산월 컬럼이 없거나 데이터가 비어있습니다.' },
        { status: 400 }
      );
    }
    
    // Insert settlements (정산월 기준으로 자동 관리)
    const { rowCount, settlementMonths } = await getSettlementRepository().insert(data);

    // 정산 데이터 캐시 무효화 (months, totals 등)
    invalidateSettlementCache();

    // CSO관리업체 → business_number 자동 매핑 (비동기, 실패해도 업로드 성공에 영향 없음)
    try {
      const csoMappings = new Map<string, string>();
      for (const row of data) {
        const csoName = row.CSO관리업체?.toString().trim();
        const bn = row.business_number?.toString().trim();
        if (csoName && bn && bn.length === 10) {
          csoMappings.set(csoName, bn);
        }
      }

      if (csoMappings.size > 0) {
        const upsertItems = Array.from(csoMappings.entries()).map(([name, bn]) => ({
          cso_company_name: name,
          business_number: bn,
          updated_at: new Date().toISOString(),
        }));

        const supabase = getSupabase();
        const batchSize = 100;
        for (let i = 0; i < upsertItems.length; i += batchSize) {
          await supabase
            .from('cso_matching')
            .upsert(upsertItems.slice(i, i + batchSize), {
              onConflict: 'cso_company_name',
              ignoreDuplicates: false,
            });
        }

        invalidateCSOMatchingCache();
        console.log(`CSO 매핑 자동 생성: ${upsertItems.length}건`);
      }
    } catch (error) {
      console.error('CSO 매핑 자동 생성 실패 (업로드는 정상 처리됨):', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        rowCount,
        settlementMonths,
        errors: errors.length > 0 ? errors : undefined,
      },
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

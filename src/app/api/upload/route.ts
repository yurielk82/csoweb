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
    const settlementRepo = getSettlementRepository();
    const { rowCount, settlementMonths } = await settlementRepo.insert(data);

    // 정산 데이터 캐시 무효화 (months, totals 등)
    invalidateSettlementCache();

    // ── 접속업체 스냅샷 저장 (실패해도 업로드 성공에 영향 없음) ──
    // 업로드 시점부터 접속 추적 시작 (업로드 전에는 해당 월 데이터가 없으므로 접속해도 볼 데이터 없음)
    try {
      const supabaseClient = getSupabase();

      // 관리자 business_number 조회
      const { data: adminUsers } = await supabaseClient
        .from('users')
        .select('business_number')
        .eq('is_admin', true);
      const adminBnSet = new Set((adminUsers || []).map((u: { business_number: string }) => u.business_number));

      for (const month of settlementMonths) {
        // 해당 월의 CSO business_numbers (관리자 제외)
        const monthBizNumbers = [...new Set(
          data
            .filter(row => row.정산월 === month)
            .map(row => row.business_number?.toString().trim())
            .filter((bn): bn is string => !!bn && !adminBnSet.has(bn))
        )];

        // 업로드 시점 = 접속 추적 시작점, accessed는 빈 배열로 시작
        // 이후 로그인 시 addAccessedBusinessNumber()로 점진적 갱신
        await settlementRepo.upsertUploadSnapshot({
          settlement_month: month,
          row_count: data.filter(row => row.정산월 === month).length,
          cso_business_numbers: monthBizNumbers,
          accessed_business_numbers: [],
        });
      }

      console.log(`접속업체 스냅샷 저장 완료: ${settlementMonths.join(', ')}`);
    } catch (error) {
      console.error('접속업체 스냅샷 저장 실패 (업로드는 정상 처리됨):', error);
    }

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

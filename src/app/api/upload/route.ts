import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { parseExcelFile } from '@/lib/excel';
import { insertSettlements } from '@/lib/db';

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

    // 파일 크기 체크 (20MB 제한)
    const fileSizeMB = file.size / (1024 * 1024);
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `파일 크기(${fileSizeMB.toFixed(1)}MB)가 20MB를 초과합니다. 파일을 분할해주세요.` },
        { status: 400 }
      );
    }
    
    console.log(`Parsing Excel file: ${file.name}, size: ${fileSizeMB.toFixed(2)}MB`);
    
    // Parse Excel file (async)
    const buffer = await file.arrayBuffer();
    const { data, errors } = await parseExcelFile(buffer);
    
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
    const { rowCount, settlementMonths } = await insertSettlements(data);
    
    // 이메일 자동 발송 제거 - 별도 메뉴에서 수동 발송
    
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

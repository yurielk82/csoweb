import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import ExcelJS from 'exceljs';
import { EXCEL_COLUMN_MAP } from '@/types';

export const dynamic = 'force-dynamic';

// 문자열 유사도 계산 (Levenshtein distance 기반)
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  
  return (longer.length - costs[longer.length]) / longer.length;
}

// 컬럼명 정규화 (공백, 개행 제거)
function normalizeColumnName(name: string): string {
  return name.replace(/[\n\r\s]+/g, '').toLowerCase();
}

// 최적의 DB 컬럼 찾기
function findBestMatch(excelColumn: string, dbColumns: string[]): { dbColumn: string; score: number } | null {
  const normalized = normalizeColumnName(excelColumn);
  let bestMatch: { dbColumn: string; score: number } | null = null;
  
  for (const dbCol of dbColumns) {
    // 정확히 일치하는 경우
    const normalizedDb = normalizeColumnName(dbCol);
    if (normalized === normalizedDb) {
      return { dbColumn: dbCol, score: 1.0 };
    }
    
    // 포함 관계 확인
    if (normalized.includes(normalizedDb) || normalizedDb.includes(normalized)) {
      const score = 0.9;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { dbColumn: dbCol, score };
      }
      continue;
    }
    
    // 유사도 계산
    const score = similarity(normalized, normalizedDb);
    if (score >= 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { dbColumn: dbCol, score };
    }
  }
  
  return bestMatch;
}

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
    
    // 파일 파싱하여 헤더 추출
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json(
        { success: false, error: '엑셀 파일에 시트가 없습니다.' },
        { status: 400 }
      );
    }
    
    // 헤더 행 읽기
    const headerRow = worksheet.getRow(1);
    const excelColumns: string[] = [];
    
    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = headerRow.getCell(col);
      const value = cell.value ? String(cell.value).trim() : '';
      if (value) {
        excelColumns.push(value);
      }
    }
    
    // DB 컬럼 목록 (EXCEL_COLUMN_MAP의 키들)
    const dbColumnOptions = Object.keys(EXCEL_COLUMN_MAP);
    
    // 자동 매핑 생성
    const mappings: Array<{
      excelColumn: string;
      dbColumn: string | null;
      score: number;
      isRequired: boolean;
    }> = [];
    
    const requiredColumns = ['사업자번호', '정산월'];
    
    for (const excelCol of excelColumns) {
      // EXCEL_COLUMN_MAP에서 정확히 일치하는지 확인
      const cleanExcelCol = excelCol.replace(/\n/g, '');
      let dbColumn: string | null = null;
      let score = 0;
      
      if (EXCEL_COLUMN_MAP[excelCol]) {
        dbColumn = excelCol;
        score = 1.0;
      } else if (EXCEL_COLUMN_MAP[cleanExcelCol]) {
        dbColumn = cleanExcelCol;
        score = 1.0;
      } else {
        // Fuzzy matching
        const match = findBestMatch(excelCol, dbColumnOptions);
        if (match) {
          dbColumn = match.dbColumn;
          score = match.score;
        }
      }
      
      mappings.push({
        excelColumn: excelCol,
        dbColumn,
        score,
        isRequired: requiredColumns.includes(dbColumn || ''),
      });
    }
    
    // 샘플 데이터 (최대 5행)
    const sampleData: Record<string, unknown>[] = [];
    const maxSampleRows = Math.min(6, worksheet.rowCount); // 헤더 포함 최대 6행
    
    for (let row = 2; row <= maxSampleRows; row++) {
      const dataRow = worksheet.getRow(row);
      const rowData: Record<string, unknown> = {};
      
      excelColumns.forEach((col, idx) => {
        const cell = dataRow.getCell(idx + 1);
        let value = cell.value;
        
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            if (value instanceof Date) {
              value = value.toISOString().slice(0, 10);
            } else if ('result' in value) {
              value = value.result;
            } else if ('text' in value) {
              value = value.text;
            }
          }
        }
        
        rowData[col] = value ?? '';
      });
      
      sampleData.push(rowData);
    }
    
    // 매핑되지 않은 필수 컬럼 확인
    const missingRequired = requiredColumns.filter(
      req => !mappings.some(m => m.dbColumn === req)
    );
    
    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        totalRows: worksheet.rowCount - 1,
        excelColumns,
        dbColumnOptions,
        mappings,
        sampleData,
        missingRequired,
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { success: false, error: '파일 미리보기 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

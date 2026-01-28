// ============================================
// Excel Processing (ExcelJS + SheetJS)
// ============================================

import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { EXCEL_COLUMN_MAP } from '@/types';
import type { Settlement } from '@/types';

// Parse Excel file and convert to settlement data (using ExcelJS)
export async function parseExcelFile(buffer: ArrayBuffer): Promise<{
  data: Partial<Settlement>[];
  errors: string[];
}> {
  const errors: string[] = [];
  const data: Partial<Settlement>[] = [];
  
  try {
    const workbook = new ExcelJS.Workbook();
    // ArrayBuffer를 Uint8Array로 변환하여 로드
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
    
    const worksheet = workbook.worksheets[0];
    
    if (!worksheet) {
      errors.push('엑셀 파일에 시트가 없습니다.');
      return { data, errors };
    }

    const rowCount = worksheet.rowCount;
    const colCount = worksheet.columnCount;
    
    if (rowCount < 2) {
      errors.push('엑셀 파일에 데이터가 없습니다.');
      return { data, errors };
    }

    // 헤더 행 읽기 (첫 번째 행)
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    const headerColMap: Record<string, number> = {};
    
    for (let col = 1; col <= colCount; col++) {
      const cell = headerRow.getCell(col);
      const value = cell.value ? String(cell.value).trim().replace(/\n/g, '') : '';
      headers.push(value);
      if (value) {
        headerColMap[value] = col;
      }
    }

    // 컬럼 매핑 인덱스 생성 (DB 컬럼명 -> 엑셀 컬럼 인덱스)
    const columnIndexMap: Record<string, number> = {};
    for (const [excelCol, dbCol] of Object.entries(EXCEL_COLUMN_MAP)) {
      const cleanExcelCol = excelCol.replace(/\n/g, '');
      if (headerColMap[excelCol]) {
        columnIndexMap[dbCol] = headerColMap[excelCol];
      } else if (headerColMap[cleanExcelCol]) {
        columnIndexMap[dbCol] = headerColMap[cleanExcelCol];
      }
    }

    // 사업자번호 컬럼이 있는지 확인
    if (!columnIndexMap['business_number']) {
      errors.push('사업자번호 컬럼을 찾을 수 없습니다.');
      return { data, errors };
    }

    // 데이터 행 처리 (두 번째 행부터)
    let errorCount = 0;
    for (let row = 2; row <= rowCount; row++) {
      const dataRow = worksheet.getRow(row);
      const settlement: Partial<Settlement> = {};
      
      for (const [dbCol, colIdx] of Object.entries(columnIndexMap)) {
        const cell = dataRow.getCell(colIdx);
        let value = cell.value;
        
        // 셀 값 변환
        if (value !== null && value !== undefined && value !== '') {
          // 객체 타입 처리 (날짜, 수식 등)
          if (typeof value === 'object') {
            if (value instanceof Date) {
              value = value.toISOString().slice(0, 10);
            } else if ('result' in value) {
              value = value.result;
            } else if ('text' in value) {
              value = value.text;
            } else {
              value = String(value);
            }
          }
          
          if (dbCol === 'business_number') {
            // 사업자번호 처리
            const bn = String(value).replace(/\D/g, '');
            if (bn.length === 10) {
              settlement.business_number = bn;
            } else if (errorCount < 10) {
              errors.push(`행 ${row}: 유효하지 않은 사업자번호 "${value}"`);
              errorCount++;
            }
          } else {
            (settlement as Record<string, unknown>)[dbCol] = value;
          }
        }
      }
      
      // 사업자번호가 있는 행만 추가
      if (settlement.business_number) {
        data.push(settlement);
      }
    }
    
    if (data.length === 0) {
      errors.push('유효한 데이터가 없습니다. 사업자번호를 확인해주세요.');
    }
    
    if (errorCount >= 10) {
      errors.push(`... 외 다수의 사업자번호 오류`);
    }
    
    console.log(`Excel parsed: ${data.length} valid rows from ${rowCount - 1} total rows`);
    
    return { data, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('Excel parsing error:', errorMsg);
    errors.push(`파일 파싱 오류: ${errorMsg}`);
    return { data, errors };
  }
}

// Export settlements to Excel (using SheetJS for speed)
export function exportToExcel(
  data: Settlement[],
  columns: { key: string; name: string }[]
): Uint8Array {
  // Create worksheet data
  const wsData: unknown[][] = [];
  
  // Header row
  wsData.push(columns.map(col => col.name));
  
  // Data rows
  for (const row of data) {
    wsData.push(columns.map(col => row[col.key] ?? ''));
  }
  
  // Create worksheet and workbook
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '정산서');
  
  // Set column widths
  const colWidths = columns.map(col => ({
    wch: Math.max(col.name.length * 2, 10)
  }));
  ws['!cols'] = colWidths;
  
  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

// Validate Excel file
export function validateExcelFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file extension
  const validExtensions = ['.xlsx', '.xls'];
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  
  if (!validExtensions.includes(extension)) {
    return {
      valid: false,
      error: '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.',
    };
  }
  
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: '파일 크기는 50MB를 초과할 수 없습니다.',
    };
  }
  
  // Check MIME type
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  
  if (file.type && !validMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: '유효한 엑셀 파일이 아닙니다.',
    };
  }
  
  return { valid: true };
}

// Get available year-months from Excel data
export function getYearMonthsFromData(data: Partial<Settlement>[]): string[] {
  const yearMonths = new Set<string>();
  
  for (const row of data) {
    if (row.정산월) {
      yearMonths.add(row.정산월);
    }
  }
  
  return Array.from(yearMonths).sort().reverse();
}

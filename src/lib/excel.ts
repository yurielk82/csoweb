// ============================================
// Excel Processing (ExcelJS + SheetJS)
// ============================================

import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { EXCEL_COLUMN_MAP } from '@/types';
import type { Settlement } from '@/types';

// Parse Excel file and convert to settlement data (using ExcelJS)
// customMapping: 사용자가 수동으로 지정한 매핑 (엑셀컬럼명 -> DB컬럼명)
export async function parseExcelFile(
  buffer: ArrayBuffer,
  customMapping?: Record<string, string>
): Promise<{
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
      const rawValue = cell.value ? String(cell.value).trim() : '';
      const cleanValue = rawValue.replace(/\n/g, '');
      headers.push(rawValue);
      if (rawValue) {
        headerColMap[rawValue] = col;
        if (rawValue !== cleanValue) {
          headerColMap[cleanValue] = col;
        }
      }
    }

    // 컬럼 매핑 인덱스 생성 (DB 컬럼명 -> 엑셀 컬럼 인덱스)
    const columnIndexMap: Record<string, number> = {};
    
    // 1. 커스텀 매핑이 있으면 우선 적용
    if (customMapping) {
      for (const [excelCol, dbCol] of Object.entries(customMapping)) {
        const cleanExcelCol = excelCol.replace(/\n/g, '');
        // EXCEL_COLUMN_MAP을 통해 DB 컬럼명으로 변환
        const actualDbCol = EXCEL_COLUMN_MAP[dbCol] || dbCol;
        
        if (headerColMap[excelCol]) {
          columnIndexMap[actualDbCol] = headerColMap[excelCol];
        } else if (headerColMap[cleanExcelCol]) {
          columnIndexMap[actualDbCol] = headerColMap[cleanExcelCol];
        }
      }
    }
    
    // 2. 기본 EXCEL_COLUMN_MAP으로 나머지 매핑 (커스텀 매핑에 없는 것만)
    for (const [excelCol, dbCol] of Object.entries(EXCEL_COLUMN_MAP)) {
      if (columnIndexMap[dbCol]) continue; // 이미 매핑됨
      
      const cleanExcelCol = excelCol.replace(/\n/g, '');
      if (headerColMap[excelCol]) {
        columnIndexMap[dbCol] = headerColMap[excelCol];
      } else if (headerColMap[cleanExcelCol]) {
        columnIndexMap[dbCol] = headerColMap[cleanExcelCol];
      }
    }

    // 사업자번호 컬럼이 있는지 확인
    if (!columnIndexMap['business_number']) {
      errors.push('사업자번호 컬럼을 찾을 수 없습니다. 컬럼 매핑을 확인해주세요.');
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
// 피벗 형태로 내보내기: 거래처명별 소계 + CSO관리업체 총합계 포함
export function exportToExcel(
  data: Settlement[],
  columns: { key: string; name: string }[]
): Uint8Array {
  // Create worksheet data
  const wsData: unknown[][] = [];
  
  // Header row
  wsData.push(columns.map(col => col.name));
  
  // 소계/총합계를 모두 거래처명 열(B열)에 표시
  const customerColumnIndex = columns.findIndex(c => c.key === '거래처명');
  const csoColumnIndex = columns.findIndex(c => c.key === 'CSO관리업체');
  // 거래처명 열 > CSO관리업체 열 > 첫번째 열 순서로 fallback
  const labelColumnIndex = customerColumnIndex >= 0 ? customerColumnIndex : (csoColumnIndex >= 0 ? csoColumnIndex : 0);
  
  // 피벗 데이터 생성: CSO관리업체 > 거래처명 > 상세 데이터
  const csoMap = new Map<string, Map<string, Settlement[]>>();
  
  for (const row of data) {
    const csoName = row.CSO관리업체 || '(미지정)';
    const customerName = row.거래처명 || '(미지정)';
    
    if (!csoMap.has(csoName)) {
      csoMap.set(csoName, new Map());
    }
    const customerMap = csoMap.get(csoName)!;
    if (!customerMap.has(customerName)) {
      customerMap.set(customerName, []);
    }
    customerMap.get(customerName)!.push(row);
  }
  
  // 정렬된 CSO관리업체 순회
  for (const [csoName, customerMap] of Array.from(csoMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const csoTotal = { 수량: 0, 금액: 0, 제약수수료_합계: 0 };
    
    // 정렬된 거래처 순회
    for (const [customerName, rows] of Array.from(customerMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      // 상세 데이터 행
      for (const row of rows) {
        wsData.push(columns.map(col => row[col.key] ?? ''));
      }
      
      // 거래처별 소계 계산
      const subtotal = {
        수량: rows.reduce((sum, r) => sum + (Number(r.수량) || 0), 0),
        금액: rows.reduce((sum, r) => sum + (Number(r.금액) || 0), 0),
        제약수수료_합계: rows.reduce((sum, r) => sum + (Number(r.제약수수료_합계) || 0), 0),
      };
      
      // 거래처 소계 행 - 거래처명 열(B열)에 표시
      const subtotalRow = columns.map((col, idx) => {
        if (idx === labelColumnIndex) return `${customerName} 합계`;
        if (col.key === '수량') return subtotal.수량;
        if (col.key === '금액') return subtotal.금액;
        if (col.key === '제약수수료_합계') return subtotal.제약수수료_합계;
        return '';
      });
      wsData.push(subtotalRow);
      
      // CSO 총합계에 누적
      csoTotal.수량 += subtotal.수량;
      csoTotal.금액 += subtotal.금액;
      csoTotal.제약수수료_합계 += subtotal.제약수수료_합계;
    }
    
    // CSO관리업체 총합계 행 - 거래처명 열(B열)에 표시
    const csoTotalRow = columns.map((col, idx) => {
      if (idx === labelColumnIndex) return `${csoName} 총합계`;
      if (col.key === '수량') return csoTotal.수량;
      if (col.key === '금액') return csoTotal.금액;
      if (col.key === '제약수수료_합계') return csoTotal.제약수수료_합계;
      return '';
    });
    wsData.push(csoTotalRow);
  }
  
  // Create worksheet and workbook
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '정산서');
  
  // Set column widths
  const colWidths = columns.map(col => ({
    wch: Math.max(col.name.length * 2, 12)
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

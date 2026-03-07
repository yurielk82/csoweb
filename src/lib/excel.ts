// ============================================
// Excel Processing (ExcelJS + SheetJS)
// ============================================

import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { EXCEL_COLUMN_MAP } from '@/types';
import type { Settlement } from '@/types';

// ── Header parsing helpers ──

function parseHeaders(worksheet: ExcelJS.Worksheet, colCount: number): {
  headers: string[];
  headerColMap: Record<string, number>;
} {
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

  return { headers, headerColMap };
}

// ── Column mapping ──

function buildColumnIndexMap(
  headerColMap: Record<string, number>,
  customMapping?: Record<string, string>,
): Record<string, number> {
  const columnIndexMap: Record<string, number> = {};

  // 1. 커스텀 매핑 우선 적용
  if (customMapping) {
    for (const [excelCol, dbCol] of Object.entries(customMapping)) {
      const cleanExcelCol = excelCol.replace(/\n/g, '');
      const actualDbCol = EXCEL_COLUMN_MAP[dbCol] || dbCol;

      if (headerColMap[excelCol]) {
        columnIndexMap[actualDbCol] = headerColMap[excelCol];
      } else if (headerColMap[cleanExcelCol]) {
        columnIndexMap[actualDbCol] = headerColMap[cleanExcelCol];
      }
    }
  }

  // 2. 기본 EXCEL_COLUMN_MAP으로 나머지 매핑
  for (const [excelCol, dbCol] of Object.entries(EXCEL_COLUMN_MAP)) {
    if (columnIndexMap[dbCol]) continue;

    const cleanExcelCol = excelCol.replace(/\n/g, '');
    if (headerColMap[excelCol]) {
      columnIndexMap[dbCol] = headerColMap[excelCol];
    } else if (headerColMap[cleanExcelCol]) {
      columnIndexMap[dbCol] = headerColMap[cleanExcelCol];
    }
  }

  return columnIndexMap;
}

// ── Cell value conversion ──

function convertCellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if ('result' in value) return value.result;
  if ('text' in value) return value.text;
  return String(value);
}

// ── Row processing ──

function processDataRows(
  worksheet: ExcelJS.Worksheet,
  rowCount: number,
  columnIndexMap: Record<string, number>,
): { data: Partial<Settlement>[]; errors: string[] } {
  const data: Partial<Settlement>[] = [];
  const errors: string[] = [];
  let errorCount = 0;
  const MAX_ERRORS = 10;

  for (let row = 2; row <= rowCount; row++) {
    const dataRow = worksheet.getRow(row);
    const settlement: Partial<Settlement> = {};

    for (const [dbCol, colIdx] of Object.entries(columnIndexMap)) {
      const cell = dataRow.getCell(colIdx);
      const value = convertCellValue(cell.value);
      if (value === null) continue;

      if (dbCol === 'business_number') {
        const bn = String(value).replace(/\D/g, '');
        if (bn.length === 10) {
          settlement.business_number = bn;
        } else if (errorCount < MAX_ERRORS) {
          errors.push(`행 ${row}: 유효하지 않은 사업자번호 "${value}"`);
          errorCount++;
        }
      } else {
        (settlement as Record<string, unknown>)[dbCol] = value;
      }
    }

    if (settlement.business_number) data.push(settlement);
  }

  if (data.length === 0) errors.push('유효한 데이터가 없습니다. 사업자번호를 확인해주세요.');
  if (errorCount >= MAX_ERRORS) errors.push(`... 외 다수의 사업자번호 오류`);

  return { data, errors };
}

// ── Main parse function ──

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      errors.push('엑셀 파일에 시트가 없습니다.');
      return { data, errors };
    }

    const rowCount = worksheet.rowCount;
    if (rowCount < 2) {
      errors.push('엑셀 파일에 데이터가 없습니다.');
      return { data, errors };
    }

    const { headerColMap } = parseHeaders(worksheet, worksheet.columnCount);
    const columnIndexMap = buildColumnIndexMap(headerColMap, customMapping);

    if (!columnIndexMap['business_number']) {
      errors.push('사업자번호 컬럼을 찾을 수 없습니다. 컬럼 매핑을 확인해주세요.');
      return { data, errors };
    }

    const result = processDataRows(worksheet, rowCount, columnIndexMap);
    return { data: result.data, errors: [...errors, ...result.errors] };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('Excel parsing error:', errorMsg);
    errors.push(`파일 파싱 오류: ${errorMsg}`);
    return { data, errors };
  }
}

// ── Export helpers ──

function buildPivotMap(data: Settlement[]): Map<string, Map<string, Settlement[]>> {
  const csoMap = new Map<string, Map<string, Settlement[]>>();

  for (const row of data) {
    const csoName = row.CSO관리업체 || '(미지정)';
    const customerName = row.거래처명 || '(미지정)';

    if (!csoMap.has(csoName)) csoMap.set(csoName, new Map());
    const customerMap = csoMap.get(csoName)!;
    if (!customerMap.has(customerName)) customerMap.set(customerName, []);
    customerMap.get(customerName)!.push(row);
  }

  return csoMap;
}

function calcSubtotals(rows: Settlement[]) {
  return {
    수량: rows.reduce((sum, r) => sum + (Number(r.수량) || 0), 0),
    금액: rows.reduce((sum, r) => sum + (Number(r.금액) || 0), 0),
    제약수수료_합계: rows.reduce((sum, r) => sum + (Number(r.제약수수료_합계) || 0), 0),
  };
}

function buildSummaryRow(
  columns: { key: string; name: string }[],
  labelIndex: number,
  label: string,
  totals: { 수량: number; 금액: number; 제약수수료_합계: number },
): unknown[] {
  return columns.map((col, idx) => {
    if (idx === labelIndex) return label;
    if (col.key === '수량') return totals.수량;
    if (col.key === '금액') return totals.금액;
    if (col.key === '제약수수료_합계') return totals.제약수수료_합계;
    return '';
  });
}

// Export settlements to Excel (using SheetJS for speed)
// 피벗 형태로 내보내기: 거래처명별 소계 + CSO관리업체 총합계 포함
export function exportToExcel(
  data: Settlement[],
  columns: { key: string; name: string }[]
): Uint8Array {
  const wsData: unknown[][] = [];
  wsData.push(columns.map(col => col.name));

  const customerColumnIndex = columns.findIndex(c => c.key === '거래처명');
  const csoColumnIndex = columns.findIndex(c => c.key === 'CSO관리업체');
  const labelColumnIndex = customerColumnIndex >= 0 ? customerColumnIndex : (csoColumnIndex >= 0 ? csoColumnIndex : 0);

  const csoMap = buildPivotMap(data);

  for (const [csoName, customerMap] of Array.from(csoMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const csoTotal = { 수량: 0, 금액: 0, 제약수수료_합계: 0 };

    for (const [customerName, rows] of Array.from(customerMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      for (const row of rows) {
        wsData.push(columns.map(col => row[col.key] ?? ''));
      }

      const subtotal = calcSubtotals(rows);
      wsData.push(buildSummaryRow(columns, labelColumnIndex, `${customerName} 합계`, subtotal));

      csoTotal.수량 += subtotal.수량;
      csoTotal.금액 += subtotal.금액;
      csoTotal.제약수수료_합계 += subtotal.제약수수료_합계;
    }

    wsData.push(buildSummaryRow(columns, labelColumnIndex, `${csoName} 총합계`, csoTotal));
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '정산서');

  const colWidths = columns.map(col => ({ wch: Math.max(col.name.length * 2, 12) }));
  ws['!cols'] = colWidths;

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

// Validate Excel file
export function validateExcelFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const validExtensions = ['.xlsx', '.xls'];
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

  if (!validExtensions.includes(extension)) {
    return { valid: false, error: '엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.' };
  }

  const maxSize = 4 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: '파일 크기는 4MB를 초과할 수 없습니다.' };
  }

  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  if (file.type && !validMimeTypes.includes(file.type)) {
    return { valid: false, error: '유효한 엑셀 파일이 아닙니다.' };
  }

  return { valid: true };
}

// Get available year-months from Excel data
export function getYearMonthsFromData(data: Partial<Settlement>[]): string[] {
  const yearMonths = new Set<string>();
  for (const row of data) {
    if (row.정산월) yearMonths.add(row.정산월);
  }
  return Array.from(yearMonths).sort().reverse();
}

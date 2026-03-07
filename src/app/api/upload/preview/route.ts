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

function normalizeColumnName(name: string): string {
  return name.replace(/[\n\r\s]+/g, '').toLowerCase();
}

function findBestMatch(excelColumn: string, dbColumns: string[]): { dbColumn: string; score: number } | null {
  const normalized = normalizeColumnName(excelColumn);
  let bestMatch: { dbColumn: string; score: number } | null = null;

  for (const dbCol of dbColumns) {
    const normalizedDb = normalizeColumnName(dbCol);
    if (normalized === normalizedDb) return { dbColumn: dbCol, score: 1.0 };

    if (normalized.includes(normalizedDb) || normalizedDb.includes(normalized)) {
      const score = 0.9;
      if (!bestMatch || score > bestMatch.score) bestMatch = { dbColumn: dbCol, score };
      continue;
    }

    const score = similarity(normalized, normalizedDb);
    if (score >= 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { dbColumn: dbCol, score };
    }
  }

  return bestMatch;
}

const REQUIRED_COLUMNS = ['사업자번호', '정산월'];
const MAX_SAMPLE_ROWS = 5;

function buildAutoMappings(excelColumns: string[], dbColumnOptions: string[]) {
  return excelColumns.map(excelCol => {
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
      const match = findBestMatch(excelCol, dbColumnOptions);
      if (match) { dbColumn = match.dbColumn; score = match.score; }
    }

    return { excelColumn: excelCol, dbColumn, score, isRequired: REQUIRED_COLUMNS.includes(dbColumn || '') };
  });
}

function extractSampleData(
  worksheet: ExcelJS.Worksheet,
  excelColumns: string[],
): Record<string, unknown>[] {
  const sampleData: Record<string, unknown>[] = [];
  const maxRows = Math.min(MAX_SAMPLE_ROWS + 1, worksheet.rowCount);

  for (let row = 2; row <= maxRows; row++) {
    const dataRow = worksheet.getRow(row);
    const rowData: Record<string, unknown> = {};

    excelColumns.forEach((col, idx) => {
      const cell = dataRow.getCell(idx + 1);
      let value = cell.value;

      if (value !== null && value !== undefined && typeof value === 'object') {
        if (value instanceof Date) {
          value = value.toISOString().slice(0, 10);
        } else if ('result' in value) {
          value = value.result;
        } else if ('text' in value) {
          value = value.text;
        }
      }

      rowData[col] = value ?? '';
    });

    sampleData.push(rowData);
  }
  return sampleData;
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

    const headerRow = worksheet.getRow(1);
    const excelColumns: string[] = [];
    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = headerRow.getCell(col);
      const value = cell.value ? String(cell.value).trim() : '';
      if (value) excelColumns.push(value);
    }

    const dbColumnOptions = Object.keys(EXCEL_COLUMN_MAP);
    const mappings = buildAutoMappings(excelColumns, dbColumnOptions);
    const sampleData = extractSampleData(worksheet, excelColumns);
    const missingRequired = REQUIRED_COLUMNS.filter(
      req => !mappings.some(m => m.dbColumn === req)
    );

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name, totalRows: worksheet.rowCount - 1,
        excelColumns, dbColumnOptions, mappings, sampleData, missingRequired,
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

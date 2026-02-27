import { describe, it, expect } from 'vitest';
import { exportToExcel, validateExcelFile, getYearMonthsFromData } from './excel';
import type { Settlement } from '@/types';
import { mockSettlements, createMockSettlement } from '@/__tests__/helpers/mock-data';

// ============================================
// validateExcelFile
// ============================================

describe('validateExcelFile', () => {
  function createFile(name: string, size: number, type: string): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], name, { type });
  }

  it('.xlsx 파일은 유효하다', () => {
    const file = createFile(
      'data.xlsx',
      1024,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(validateExcelFile(file)).toEqual({ valid: true });
  });

  it('.xls 파일은 유효하다', () => {
    const file = createFile('data.xls', 1024, 'application/vnd.ms-excel');
    expect(validateExcelFile(file)).toEqual({ valid: true });
  });

  it('.csv 파일은 무효하다', () => {
    const result = validateExcelFile(createFile('data.csv', 1024, 'text/csv'));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('엑셀 파일');
  });

  it('4MB 초과 파일은 무효하다', () => {
    const file = createFile(
      'large.xlsx',
      5 * 1024 * 1024,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const result = validateExcelFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('4MB');
  });

  it('4MB 이하 파일은 유효하다', () => {
    const file = createFile(
      'ok.xlsx',
      4 * 1024 * 1024,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(validateExcelFile(file)).toEqual({ valid: true });
  });

  it('잘못된 MIME 타입은 무효하다', () => {
    const file = createFile('data.xlsx', 1024, 'application/pdf');
    const result = validateExcelFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('유효한 엑셀');
  });

  it('MIME 타입이 비어있으면 확장자만으로 판단한다', () => {
    const file = createFile('data.xlsx', 1024, '');
    expect(validateExcelFile(file)).toEqual({ valid: true });
  });
});

// ============================================
// getYearMonthsFromData
// ============================================

describe('getYearMonthsFromData', () => {
  it('정산월 목록을 중복 제거 후 내림차순 반환한다', () => {
    const data: Partial<Settlement>[] = [
      { 정산월: '2025-01' },
      { 정산월: '2025-03' },
      { 정산월: '2025-02' },
      { 정산월: '2025-01' },
    ];
    expect(getYearMonthsFromData(data)).toEqual(['2025-03', '2025-02', '2025-01']);
  });

  it('정산월이 없는 행은 무시한다', () => {
    const data: Partial<Settlement>[] = [
      { 정산월: '2025-01' },
      { business_number: '1234567890' },
      { 정산월: '2025-02' },
    ];
    expect(getYearMonthsFromData(data)).toEqual(['2025-02', '2025-01']);
  });

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(getYearMonthsFromData([])).toEqual([]);
  });
});

// ============================================
// exportToExcel
// ============================================

describe('exportToExcel', () => {
  const columns = [
    { key: 'CSO관리업체', name: 'CSO관리업체' },
    { key: '거래처명', name: '거래처명' },
    { key: '제품명', name: '제품명' },
    { key: '수량', name: '수량' },
    { key: '금액', name: '금액' },
    { key: '제약수수료_합계', name: '제약수수료 합계' },
  ];

  it('Uint8Array 형태의 엑셀 버퍼를 반환한다', () => {
    const buffer = exportToExcel(mockSettlements, columns);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('빈 데이터도 헤더만 포함한 버퍼를 반환한다', () => {
    const buffer = exportToExcel([], columns);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('다양한 CSO관리업체 데이터를 피벗 형태로 내보낸다', () => {
    const data = [
      createMockSettlement({ CSO관리업체: 'CSO-A', 거래처명: '약국1', 수량: 10, 금액: 1000, 제약수수료_합계: 100 }),
      createMockSettlement({ CSO관리업체: 'CSO-A', 거래처명: '약국1', 수량: 20, 금액: 2000, 제약수수료_합계: 200 }),
      createMockSettlement({ CSO관리업체: 'CSO-B', 거래처명: '약국2', 수량: 30, 금액: 3000, 제약수수료_합계: 300 }),
    ];
    const buffer = exportToExcel(data, columns);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

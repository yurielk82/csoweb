// ============================================
// Excel Parser (Infrastructure)
// ============================================
// 기존 lib/excel.ts 재export — 이미 순수 유틸리티이므로 로직 이동 불필요

export { parseExcelFile, exportToExcel, validateExcelFile, getYearMonthsFromData } from '@/lib/excel';

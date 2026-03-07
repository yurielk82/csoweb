import type { ColumnSetting } from '@/types';
import type { SettlementResponse, NoticeSettings, ErrorType } from '../useSettlementData';
import { fetchWithTimeout } from '@/lib/fetch';
import { API_ROUTES } from '@/constants/api';

// ── Init result processing ──

export interface InitResult {
  columns: ColumnSetting[];
  selectedColumns: string[];
  yearMonths: string[];
  selectedMonth: string;
  errorType: ErrorType;
  notice: NoticeSettings | null;
  data: SettlementResponse | null;
}

export function processInitResult(result: {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}): InitResult {
  const output: InitResult = {
    columns: [],
    selectedColumns: [],
    yearMonths: [],
    selectedMonth: '',
    errorType: null,
    notice: null,
    data: null,
  };

  if (!result.success) {
    output.errorType = 'no_data';
    return output;
  }

  const d = result.data as Record<string, unknown>;

  if (d.columns) {
    const visibleColumns = d.columns as ColumnSetting[];
    output.columns = visibleColumns;
    const requiredKeys = visibleColumns
      .filter((c: ColumnSetting) => c.is_required)
      .map((c: ColumnSetting) => c.column_key);
    output.selectedColumns = requiredKeys.length > 0
      ? requiredKeys
      : visibleColumns.map((c: ColumnSetting) => c.column_key);
  }

  const months = (d.yearMonths || []) as string[];
  output.yearMonths = months;

  if (d.noMatching) {
    output.errorType = 'no_matching';
  } else if (months.length > 0) {
    output.selectedMonth = months[0];
  } else {
    output.errorType = 'no_data';
  }

  if (d.notice) output.notice = d.notice as NoticeSettings;

  if (d.settlements && d.pagination && d.totals) {
    output.data = {
      settlements: d.settlements as SettlementResponse['settlements'],
      pagination: d.pagination as SettlementResponse['pagination'],
      totals: d.totals as SettlementResponse['totals'],
    };
  }

  return output;
}

// ── Notice variable replacement ──

export function replaceNoticeVariables(
  text: string,
  selectedMonth: string,
  ceoName: string,
): string {
  if (!selectedMonth) return text;
  const [, monthStr] = selectedMonth.split('-');
  const month = Number(monthStr);
  const settlementMonth = `${month}월`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthStr = `${nextMonth}월`;

  return text
    .replace(/{{정산월}}/g, settlementMonth)
    .replace(/{{정산월\+1}}/g, nextMonthStr)
    .replace(/{{대표자명}}/g, ceoName);
}

// ── Excel download ──

export async function downloadExcel(
  selectedMonth: string,
  selectedColumns: string[],
): Promise<{ ok: boolean; blob?: Blob; status?: number; error?: string }> {
  const params = new URLSearchParams({
    settlement_month: selectedMonth,
    columns: selectedColumns.join(','),
  });
  const res = await fetchWithTimeout(`${API_ROUTES.SETTLEMENTS.EXPORT}?${params}`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    return { ok: false, status: res.status, error: errorData?.error || '엑셀 다운로드 중 오류가 발생했습니다.' };
  }

  const blob = await res.blob();
  return { ok: true, blob };
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

import { API_ROUTES } from '@/constants/api';
import type { IntegrityRow, IntegrityStats, FilterStatus, MatchingUploadItem, ToastFn } from './types';

// ── Row state helpers ──

export function setRowSaveState(
  setTableData: React.Dispatch<React.SetStateAction<IntegrityRow[]>>,
  rowId: string,
  saveState: IntegrityRow['saveState'],
) {
  setTableData(prev => prev.map(r => (r.id === rowId ? { ...r, saveState } : r)));
}

export function resetRowSaveState(
  setTableData: React.Dispatch<React.SetStateAction<IntegrityRow[]>>,
  rowId: string,
  delayMs = 1000,
) {
  setTimeout(() => setRowSaveState(setTableData, rowId, 'idle'), delayMs);
}

// ── Filtering ──

export function applyFilters(
  tableData: IntegrityRow[],
  searchQuery: string,
  filterStatus: FilterStatus,
  scope: 'all' | 'settlement',
  selectedMonth: string,
): IntegrityRow[] {
  let results = [...tableData];

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    const searchBizNum = searchQuery.replace(/\D/g, '');
    results = results.filter((r) => {
      if (searchBizNum && r.business_number.includes(searchBizNum)) return true;
      if (r.business_name?.toLowerCase().includes(query)) return true;
      if (r.cso_company_names.some(cso => cso.toLowerCase().includes(query))) return true;
      return false;
    });
  }

  if (selectedMonth) {
    results = results.filter((r) => r.last_settlement_month === selectedMonth);
  }

  if (filterStatus === 'all') return results;
  if (filterStatus === 'settlement') return results.filter((r) => r.last_settlement_month !== null);

  if (scope === 'settlement') {
    results = results.filter((r) => r.last_settlement_month !== null);
  }

  if (filterStatus === 'complete') {
    return results.filter(r => r.cso_company_names.length > 0 && r.registration_status === 'registered');
  }
  if (filterStatus === 'not_registered') {
    return results.filter(r => r.registration_status === 'unregistered' || r.registration_status === 'pending_approval');
  }
  if (filterStatus === 'no_cso') {
    return results.filter(r => r.cso_company_names.length === 0);
  }
  if (filterStatus === 'unprocessed') {
    return results.filter(r =>
      (r.registration_status === 'unregistered' || r.registration_status === 'pending_approval') &&
      r.cso_company_names.length === 0
    );
  }

  return results;
}

// ── Stats ──

export function computeStats(
  tableData: IntegrityRow[],
  selectedMonth: string,
  scope: 'all' | 'settlement',
): IntegrityStats {
  const filteredByMonth = selectedMonth
    ? tableData.filter((r) => r.last_settlement_month === selectedMonth)
    : tableData;

  const total = filteredByMonth.length;
  const settlementData = filteredByMonth.filter((r) => r.last_settlement_month !== null);
  const settlement = settlementData.length;
  const baseData = scope === 'all' ? filteredByMonth : settlementData;

  const complete = baseData.filter(r => r.cso_company_names.length > 0 && r.registration_status === 'registered').length;
  const notRegistered = baseData.filter(r => r.registration_status === 'unregistered' || r.registration_status === 'pending_approval').length;
  const noCso = baseData.filter(r => r.cso_company_names.length === 0).length;
  const unprocessed = baseData.filter(r =>
    (r.registration_status === 'unregistered' || r.registration_status === 'pending_approval') &&
    r.cso_company_names.length === 0
  ).length;

  return { total, settlement, complete, notRegistered, noCso, unprocessed };
}

// ── Excel Parse ──

function extractField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (row[key]) return String(row[key]).trim();
  }
  return '';
}

function extractBizNum(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (row[key]) return String(row[key]).replace(/\D/g, '');
  }
  return '';
}

export async function parseMatchingFile(
  file: File,
  toast: ToastFn,
): Promise<{ items: MatchingUploadItem[]; rawCount: number; dupsRemoved: number }> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

  const rawItems: MatchingUploadItem[] = [];

  for (const row of jsonData) {
    const companyName = extractField(row, ['업체명', 'CSO관리업체', 'CSO관리업체명', '관리업체명', '회사명']);
    const bizNum = extractBizNum(row, ['사업자번호', '사업자등록번호', '사업자_번호']);

    if (companyName && bizNum && bizNum.length === 10) {
      rawItems.push({ cso_company_name: companyName, business_number: bizNum });
    }
  }

  const dedupMap = new Map<string, MatchingUploadItem>();
  let dupsRemoved = 0;
  for (const item of rawItems) {
    const existing = dedupMap.get(item.cso_company_name);
    if (existing && existing.business_number === item.business_number) {
      dupsRemoved++;
    } else {
      dedupMap.set(item.cso_company_name, item);
    }
  }

  const items = Array.from(dedupMap.values());

  if (items.length === 0) {
    toast({ variant: 'destructive', title: '파싱 오류', description: '유효한 매칭 데이터를 찾을 수 없습니다.' });
  } else if (dupsRemoved > 0) {
    toast({
      title: '중복 제거',
      description: `파일 내 동일 항목 ${dupsRemoved}건이 제거되었습니다. (${rawItems.length}건 → ${items.length}건)`,
    });
  }

  return { items, rawCount: rawItems.length, dupsRemoved };
}

// ── CSO Matching API helpers ──

export async function upsertCSOMatching(csoName: string, businessNumber: string) {
  const res = await fetch(API_ROUTES.ADMIN.CSO_MATCHING.UPSERT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ cso_company_name: csoName, business_number: businessNumber }] }),
  });
  return res.json();
}

export async function deleteCSOMatching(csoName: string) {
  return fetch(API_ROUTES.ADMIN.CSO_MATCHING.UPSERT, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cso_company_name: csoName }),
  });
}

// ── Upload success handler ──

export function handleUploadSuccess(
  result: { data: { inserted: number; skipped: number; conflicts?: string[] } },
  toast: ToastFn,
) {
  const { inserted, skipped, conflicts } = result.data;
  const parts: string[] = [];
  if (inserted > 0) parts.push(`신규 ${inserted}건 추가`);
  if (skipped > 0) parts.push(`동일 ${skipped}건 스킵`);

  toast({ title: '업로드 완료', description: parts.join(', ') || '변경 사항이 없습니다.' });

  if (conflicts && conflicts.length > 0) {
    toast({
      variant: 'destructive',
      title: `사업자번호 불일치 ${conflicts.length}건`,
      description: `다음 CSO명은 기존과 다른 사업자번호로 등록 시도되어 스킵됩니다 (삭제 후 재등록 필요): ${conflicts.slice(0, 5).join(', ')}${conflicts.length > 5 ? ` 외 ${conflicts.length - 5}건` : ''}`,
    });
  }
}

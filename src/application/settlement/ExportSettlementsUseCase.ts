// ============================================
// Export Settlements Use Case
// ============================================

import { getSettlementRepository, getCSOMatchingRepository, getColumnSettingRepository } from '@/infrastructure/supabase';
import { exportToExcel } from '@/infrastructure/excel';
import type { Settlement } from '@/domain/settlement';

interface ExportParams {
  businessNumber?: string;
  isAdmin: boolean;
  settlementMonth?: string;
}

export async function exportSettlements(params: ExportParams): Promise<{
  buffer: Uint8Array;
  filename: string;
}> {
  const settlementRepo = getSettlementRepository();
  const csoMatchingRepo = getCSOMatchingRepository();
  const columnSettingRepo = getColumnSettingRepository();

  // 표시할 컬럼 조회
  const allColumns = await columnSettingRepo.findAll();
  const visibleColumns = allColumns
    .filter(c => c.is_visible)
    .sort((a, b) => a.display_order - b.display_order)
    .map(c => ({ key: c.column_key, name: c.column_name }));

  let settlements: Settlement[];

  if (params.isAdmin) {
    settlements = await settlementRepo.findAll(params.settlementMonth);
  } else if (params.businessNumber) {
    const matchedNames = await csoMatchingRepo.getMatchedCompanyNames(params.businessNumber);
    if (matchedNames.length === 0) {
      settlements = [];
    } else {
      settlements = await settlementRepo.findByCSOMatching(matchedNames, params.settlementMonth);
    }
  } else {
    settlements = [];
  }

  const buffer = exportToExcel(settlements, visibleColumns);
  const filename = `정산서_${params.settlementMonth || 'all'}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return { buffer, filename };
}

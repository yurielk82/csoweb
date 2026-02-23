// ============================================
// Upload Settlements Use Case
// ============================================

import { getSettlementRepository } from '@/infrastructure/supabase';
import type { Settlement, InsertSettlementsResult } from '@/domain/settlement';

export async function uploadSettlements(data: Partial<Settlement>[]): Promise<InsertSettlementsResult> {
  const settlementRepo = getSettlementRepository();
  return settlementRepo.insert(data);
}

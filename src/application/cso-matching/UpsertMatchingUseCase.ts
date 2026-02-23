// ============================================
// Upsert CSO Matching Use Case
// ============================================

import { getCSOMatchingRepository } from '@/infrastructure/supabase';
import type { CSOMatching } from '@/domain/cso-matching';

export async function upsertMatching(items: CSOMatching[]): Promise<void> {
  const csoMatchingRepo = getCSOMatchingRepository();
  return csoMatchingRepo.upsert(items);
}

export async function getAllMatching(): Promise<CSOMatching[]> {
  const csoMatchingRepo = getCSOMatchingRepository();
  return csoMatchingRepo.findAll();
}

export async function deleteMatching(csoCompanyName: string): Promise<boolean> {
  const csoMatchingRepo = getCSOMatchingRepository();
  return csoMatchingRepo.delete(csoCompanyName);
}

export async function deleteAllMatching(): Promise<boolean> {
  const csoMatchingRepo = getCSOMatchingRepository();
  return csoMatchingRepo.deleteAll();
}

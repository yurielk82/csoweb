// ============================================
// CSO Matching Repository Interface
// ============================================

import type { CSOMatching } from './types';

export interface CSOMatchingRepository {
  getMatchedCompanyNames(businessNumber: string): Promise<string[]>;
  findAll(): Promise<CSOMatching[]>;
  upsert(items: CSOMatching[]): Promise<void>;
  delete(csoCompanyName: string): Promise<boolean>;
  deleteAll(): Promise<boolean>;
}

// ============================================
// Company Repository Interface
// ============================================

import type { CompanyInfo } from './types';

export interface CompanyRepository {
  get(): Promise<CompanyInfo>;
  update(data: Partial<CompanyInfo>): Promise<void>;
}

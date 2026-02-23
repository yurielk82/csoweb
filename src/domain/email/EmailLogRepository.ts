// ============================================
// Email Log Repository Interface
// ============================================

import type { EmailLog, EmailStats, CreateEmailLogData, UpdateEmailLogData, EmailLogFilter } from './types';

export interface EmailLogRepository {
  create(data: CreateEmailLogData): Promise<EmailLog>;
  update(id: string, data: UpdateEmailLogData): Promise<void>;
  findAll(filter?: EmailLogFilter): Promise<EmailLog[]>;
  getStats(): Promise<EmailStats>;
}

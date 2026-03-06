// ============================================
// Email Log Repository Interface
// ============================================

import type { EmailLog, EmailStats, EmailMonthlyStat, CreateEmailLogData, UpdateEmailLogData, EmailLogFilter } from './types';

export interface EmailLogRepository {
  create(data: CreateEmailLogData): Promise<EmailLog>;
  update(id: string, data: UpdateEmailLogData): Promise<void>;
  findAll(filter?: EmailLogFilter): Promise<EmailLog[]>;
  getStats(filter?: EmailLogFilter): Promise<EmailStats>;
  /** 월별 발송 완료 건수 (YYYY-MM 그룹핑) */
  getMonthlyStats(): Promise<EmailMonthlyStat[]>;
}

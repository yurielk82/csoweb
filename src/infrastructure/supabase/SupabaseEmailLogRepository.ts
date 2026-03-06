// ============================================
// Supabase Email Log Repository Implementation
// ============================================

import { supabase } from './client';
import type { EmailLogRepository } from '@/domain/email/EmailLogRepository';
import type { EmailLog, EmailStats, EmailMonthlyStat, CreateEmailLogData, UpdateEmailLogData, EmailLogFilter } from '@/domain/email/types';

export class SupabaseEmailLogRepository implements EmailLogRepository {
  async create(data: CreateEmailLogData): Promise<EmailLog> {
    const { data: log, error } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: data.recipient_email,
        subject: data.subject,
        template_type: data.template_type,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return log as EmailLog;
  }

  async update(id: string, data: UpdateEmailLogData): Promise<void> {
    const updateData: Record<string, unknown> = { status: data.status };

    if (data.status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }
    if (data.error_message) {
      updateData.error_message = data.error_message;
    }

    await supabase
      .from('email_logs')
      .update(updateData)
      .eq('id', id);
  }

  async findAll(filter?: EmailLogFilter): Promise<EmailLog[]> {
    let query = supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter?.template_type) {
      query = query.eq('template_type', filter.template_type);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.start_date) {
      query = query.gte('created_at', filter.start_date);
    }
    if (filter?.end_date) {
      query = query.lte('created_at', filter.end_date);
    }
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;

    if (error || !data) return [];
    return data as EmailLog[];
  }

  async getMonthlyStats(): Promise<EmailMonthlyStat[]> {
    const { data, error } = await supabase
      .from('email_logs')
      .select('created_at')
      .eq('status', 'sent');

    if (error || !data) return [];

    const monthCounts = new Map<string, number>();
    for (const log of data) {
      const month = (log.created_at as string).substring(0, 7);
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    }

    return Array.from(monthCounts.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getStats(filter?: EmailLogFilter): Promise<EmailStats> {
    let query = supabase
      .from('email_logs')
      .select('status');

    if (filter?.start_date) {
      query = query.gte('created_at', filter.start_date);
    }
    if (filter?.end_date) {
      query = query.lte('created_at', filter.end_date);
    }

    const { data, error } = await query;

    if (error || !data) {
      return { total: 0, sent: 0, failed: 0, pending: 0 };
    }

    return {
      total: data.length,
      sent: data.filter(l => l.status === 'sent').length,
      failed: data.filter(l => l.status === 'failed').length,
      pending: data.filter(l => l.status === 'pending').length,
    };
  }
}

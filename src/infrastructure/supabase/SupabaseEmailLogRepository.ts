// ============================================
// Supabase Email Log Repository Implementation
// ============================================

import { supabase } from './client';
import type { EmailLogRepository } from '@/domain/email/EmailLogRepository';
import type { EmailLog, EmailStats, CreateEmailLogData, UpdateEmailLogData, EmailLogFilter } from '@/domain/email/types';

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
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;

    if (error || !data) return [];
    return data as EmailLog[];
  }

  async getStats(): Promise<EmailStats> {
    const { data, error } = await supabase
      .from('email_logs')
      .select('status');

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

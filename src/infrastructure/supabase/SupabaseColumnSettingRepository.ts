// ============================================
// Supabase Column Setting Repository Implementation
// ============================================

import { supabase } from './client';
import type { ColumnSettingRepository } from '@/domain/column-setting/ColumnSettingRepository';
import type { ColumnSetting, ColumnSettingDefaults } from '@/domain/column-setting/types';

export class SupabaseColumnSettingRepository implements ColumnSettingRepository {
  async initialize(defaults: ColumnSettingDefaults[]): Promise<void> {
    const { data: existing } = await supabase
      .from('column_settings')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) return;

    const settings = defaults.map(s => ({
      column_key: s.column_key,
      column_name: s.column_name,
      is_visible: s.is_visible,
      is_required: s.is_required,
      is_summary: s.is_summary || false,
      display_order: s.display_order,
    }));

    await supabase.from('column_settings').insert(settings);
  }

  async findAll(): Promise<ColumnSetting[]> {
    const { data, error } = await supabase
      .from('column_settings')
      .select('*')
      .order('display_order', { ascending: true });

    if (error || !data) return [];
    return data as ColumnSetting[];
  }

  async findSummaryColumns(): Promise<ColumnSetting[]> {
    const { data } = await supabase
      .from('column_settings')
      .select('*')
      .eq('is_summary', true)
      .order('display_order', { ascending: true });

    return (data || []) as ColumnSetting[];
  }

  async update(settings: Partial<ColumnSetting>[]): Promise<void> {
    for (const setting of settings) {
      if (setting.column_key) {
        await supabase
          .from('column_settings')
          .update({
            column_name: setting.column_name,
            is_visible: setting.is_visible,
            is_required: setting.is_required,
            is_summary: setting.is_summary ?? false,
            display_order: setting.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq('column_key', setting.column_key);
      }
    }
  }

  async resetToDefaults(defaults: ColumnSettingDefaults[]): Promise<void> {
    // 기존 설정 전체 삭제
    await supabase
      .from('column_settings')
      .delete()
      .neq('id', '');

    // 기본값으로 재삽입
    const settings = defaults.map(s => ({
      column_key: s.column_key,
      column_name: s.column_name,
      is_visible: s.is_visible,
      is_required: s.is_required,
      is_summary: s.is_summary || false,
      display_order: s.display_order,
    }));

    await supabase.from('column_settings').insert(settings);
  }
}

// ============================================
// Column Setting Domain Types
// ============================================

export interface ColumnSetting {
  id: string;
  column_key: string;
  column_name: string;
  display_order: number;
  is_visible: boolean;
  is_required: boolean;
  is_summary: boolean;
  created_at: string;
  updated_at: string;
}

export type ColumnSettingDefaults = Omit<ColumnSetting, 'id' | 'created_at' | 'updated_at'>;

// ============================================
// Column Setting Repository Interface
// ============================================

import type { ColumnSetting, ColumnSettingDefaults } from './types';

export interface ColumnSettingRepository {
  initialize(defaults: ColumnSettingDefaults[]): Promise<void>;
  findAll(): Promise<ColumnSetting[]>;
  findSummaryColumns(): Promise<ColumnSetting[]>;
  update(settings: Partial<ColumnSetting>[]): Promise<void>;
  resetToDefaults(defaults: ColumnSettingDefaults[]): Promise<void>;
}

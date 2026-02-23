// ============================================
// Supabase Client (Infrastructure)
// ============================================
// 기존 lib/supabase.ts에서 클라이언트 로직만 재export

export { getSupabase, isSupabaseConfigured, supabase } from '@/lib/supabase';
export type {
  DbUser,
  DbSettlement,
  DbColumnSetting,
  DbEmailLog,
  DbCompanySettings,
  DbPasswordResetToken,
} from '@/lib/supabase';

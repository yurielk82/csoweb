// ============================================
// Supabase CSO Matching Repository Implementation
// ============================================

import { supabase } from './client';
import type { CSOMatchingRepository } from '@/domain/cso-matching/CSOMatchingRepository';
import type { CSOMatching } from '@/domain/cso-matching/types';
import { TEST_CSO_PREFIX } from '@/constants/defaults';

export class SupabaseCSOMatchingRepository implements CSOMatchingRepository {
  async getMatchedCompanyNames(businessNumber: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('cso_matching')
      .select('cso_company_name')
      .eq('business_number', businessNumber);

    if (error) {
      console.error('Get matched CSO names error:', error);
      return [];
    }

    // 테스트 계정의 [TEST] 접두사를 제거하여 실제 CSO명으로 반환
    return (data || []).map(d =>
      d.cso_company_name.startsWith(TEST_CSO_PREFIX)
        ? d.cso_company_name.slice(TEST_CSO_PREFIX.length)
        : d.cso_company_name
    );
  }

  async findAll(): Promise<CSOMatching[]> {
    const { data, error } = await supabase
      .from('cso_matching')
      .select('*')
      .order('cso_company_name', { ascending: true });

    if (error || !data) return [];
    return data as CSOMatching[];
  }

  async upsert(items: CSOMatching[]): Promise<void> {
    const { error } = await supabase
      .from('cso_matching')
      .upsert(
        items.map(item => ({
          cso_company_name: item.cso_company_name,
          business_number: item.business_number,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'cso_company_name' }
      );

    if (error) {
      console.error('CSO matching upsert error:', error);
      throw new Error(error.message);
    }
  }

  async delete(csoCompanyName: string): Promise<boolean> {
    const { error } = await supabase
      .from('cso_matching')
      .delete()
      .eq('cso_company_name', csoCompanyName);

    return !error;
  }

  async deleteAll(): Promise<boolean> {
    const { error } = await supabase
      .from('cso_matching')
      .delete()
      .neq('cso_company_name', '');

    return !error;
  }
}

// ============================================
// Supabase Password Reset Token Repository Implementation
// ============================================

import { supabase } from './client';
import type { PasswordResetTokenRepository } from '@/domain/password-reset-token/PasswordResetTokenRepository';
import type { PasswordResetToken } from '@/domain/password-reset-token/types';
import type { DbPasswordResetToken } from './client';
import { TOKEN_EXPIRY_MINUTES } from '@/constants/defaults';

function mapDbTokenToToken(dbToken: DbPasswordResetToken): PasswordResetToken {
  return {
    id: dbToken.id,
    user_id: dbToken.user_id,
    business_number: dbToken.business_number,
    email: dbToken.email,
    token: dbToken.token,
    expires_at: dbToken.expires_at,
    used_at: dbToken.used_at,
    created_at: dbToken.created_at,
  };
}

export class SupabasePasswordResetTokenRepository implements PasswordResetTokenRepository {
  async create(userId: string, businessNumber: string, email: string): Promise<PasswordResetToken> {
    // 기존 미사용 토큰 무효화 (삭제)
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', userId)
      .is('used_at', null);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        business_number: businessNumber,
        email: email.toLowerCase().trim(),
        token,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Create password reset token error:', error);
      throw new Error('토큰 생성에 실패했습니다.');
    }

    return mapDbTokenToToken(data);
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) return null;
    return mapDbTokenToToken(data);
  }

  async markAsUsed(token: string): Promise<boolean> {
    const { error } = await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    return !error;
  }

  async cleanupExpired(): Promise<number> {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) return 0;
    return data?.length || 0;
  }
}

// ============================================
// Password Reset Token Domain Types
// ============================================

export interface PasswordResetToken {
  id: string;
  user_id: string;
  business_number: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface TokenValidationResult {
  valid: boolean;
  token?: PasswordResetToken;
  error?: string;
}

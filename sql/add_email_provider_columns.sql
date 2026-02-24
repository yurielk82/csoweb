-- ============================================
-- 이메일 듀얼 프로바이더 설정 컬럼 추가
-- company_settings 테이블 확장
-- ============================================

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS email_provider TEXT NOT NULL DEFAULT 'resend'
    CHECK (email_provider IN ('resend', 'smtp')),
  ADD COLUMN IF NOT EXISTS smtp_host TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 465,
  ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_password TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_from_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS smtp_from_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_send_delay_ms INTEGER NOT NULL DEFAULT 6000
    CHECK (email_send_delay_ms >= 500 AND email_send_delay_ms <= 30000);

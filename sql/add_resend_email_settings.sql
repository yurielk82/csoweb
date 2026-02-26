-- Resend 발신 이메일 및 테스트 수신자 이메일 설정 컬럼 추가
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS resend_from_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS test_recipient_email TEXT DEFAULT '';

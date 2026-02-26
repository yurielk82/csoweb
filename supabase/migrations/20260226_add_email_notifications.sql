-- 이메일 알림 유형별 ON/OFF 설정 컬럼 추가
-- JSONB 타입으로 저장, 기본값은 모두 활성화
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS email_notifications jsonb
DEFAULT '{"registration_request": true, "approval_complete": true, "approval_rejected": true, "settlement_uploaded": true, "password_reset": true}'::jsonb;

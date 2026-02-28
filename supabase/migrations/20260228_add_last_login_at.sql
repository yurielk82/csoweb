-- 사용자 마지막 로그인 시간 추적 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;

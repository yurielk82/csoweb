-- 계정 잠금 기능을 위한 컬럼 추가
-- failed_login_attempts: 연속 로그인 실패 횟수 (15회 초과 시 잠금)
-- locked_at: 계정 잠금 시각 (NULL이면 잠금 아님)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL;

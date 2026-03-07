-- 엑셀 다운로드 로그 (일반 회원 일일 횟수 제한용)
CREATE TABLE IF NOT EXISTS export_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_number TEXT NOT NULL,
  settlement_month TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_bn_date
  ON export_logs (business_number, created_at);

COMMENT ON TABLE export_logs IS '엑셀 다운로드 이력 (일반 회원 일일 횟수 제한)';
COMMENT ON COLUMN export_logs.business_number IS '다운로드한 사업자번호';
COMMENT ON COLUMN export_logs.settlement_month IS '다운로드한 정산월 (YYYY-MM)';
COMMENT ON COLUMN export_logs.created_at IS '다운로드 시각';

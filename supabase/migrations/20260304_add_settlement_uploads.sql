-- 정산서 업로드 이력 + 접속업체 스냅샷 테이블
CREATE TABLE IF NOT EXISTS settlement_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_month VARCHAR(7) NOT NULL UNIQUE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  row_count INTEGER NOT NULL DEFAULT 0,
  cso_business_numbers TEXT[] NOT NULL DEFAULT '{}',
  accessed_business_numbers TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_uploads_month
  ON settlement_uploads (settlement_month);

COMMENT ON TABLE settlement_uploads IS '정산서 업로드 이력 및 접속업체 스냅샷';
COMMENT ON COLUMN settlement_uploads.settlement_month IS '정산월 (YYYY-MM 형식, UNIQUE)';
COMMENT ON COLUMN settlement_uploads.uploaded_at IS '업로드 시각';
COMMENT ON COLUMN settlement_uploads.row_count IS '업로드된 정산 건수';
COMMENT ON COLUMN settlement_uploads.cso_business_numbers IS '해당 월 CSO 사업자번호 목록 (관리자 제외)';
COMMENT ON COLUMN settlement_uploads.accessed_business_numbers IS '업로드 시점까지 접속한 사업자번호 목록';

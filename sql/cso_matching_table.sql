-- ===========================================
-- CSO Matching Table Migration
-- ===========================================
-- 이 테이블은 정산서의 [CSO관리업체명]을 회원의 [사업자번호]와 매핑합니다.
-- 관리자가 업로드한 매칭 데이터를 저장합니다.

-- 테이블 생성
CREATE TABLE IF NOT EXISTS cso_matching (
  -- CSO관리업체명 (PK): 정산서에 기재된 업체 이름
  cso_company_name TEXT PRIMARY KEY NOT NULL,
  
  -- 사업자등록번호: 해당 업체의 실제 사업자번호 (10자리)
  business_number VARCHAR(10) NOT NULL,
  
  -- 생성일시
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 수정일시
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성: 사업자번호로 빠른 조회
CREATE INDEX IF NOT EXISTS idx_cso_matching_business_number 
  ON cso_matching(business_number);

-- RLS (Row Level Security) 설정 (필요시)
-- ALTER TABLE cso_matching ENABLE ROW LEVEL SECURITY;

-- 관리자만 접근 가능하도록 정책 설정 (필요시)
-- CREATE POLICY "Admin only" ON cso_matching
--   USING (auth.jwt() ->> 'role' = 'admin');

-- 코멘트 추가
COMMENT ON TABLE cso_matching IS '정산서 CSO관리업체명과 회원 사업자번호 매칭 테이블';
COMMENT ON COLUMN cso_matching.cso_company_name IS '정산서에 기재된 CSO 관리업체명 (정규화 전 원본)';
COMMENT ON COLUMN cso_matching.business_number IS '해당 업체의 사업자등록번호 (10자리)';

-- ===========================================
-- 샘플 데이터 (테스트용, 필요시 사용)
-- ===========================================
-- INSERT INTO cso_matching (cso_company_name, business_number)
-- VALUES 
--   ('테스트업체1', '1234567890'),
--   ('테스트업체2', '0987654321')
-- ON CONFLICT (cso_company_name) DO UPDATE SET
--   business_number = EXCLUDED.business_number,
--   updated_at = NOW();

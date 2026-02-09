-- =====================================================
-- hospital_master 테이블 DDL
-- 건강보험심사평가원 병원정보서비스 데이터 저장용
-- =====================================================

-- 기존 테이블 삭제 (주의: 데이터 손실)
DROP TABLE IF EXISTS hospital_master CASCADE;

-- 테이블 생성
CREATE TABLE hospital_master (
    -- 기본 식별 정보
    ykiho VARCHAR(100) PRIMARY KEY,  -- 암호화요양기호 (PK)
    yadm_nm VARCHAR(200),            -- 요양기관명
    
    -- 종별 정보
    cl_cd VARCHAR(10),               -- 종별코드
    cl_cd_nm VARCHAR(50),            -- 종별코드명
    
    -- 지역 정보
    sido_cd VARCHAR(10),             -- 시도코드
    sido_cd_nm VARCHAR(50),          -- 시도코드명
    sggu_cd VARCHAR(10),             -- 시군구코드
    sggu_cd_nm VARCHAR(50),          -- 시군구코드명
    emdong_nm VARCHAR(50),           -- 읍면동
    post_no VARCHAR(10),             -- 우편번호
    addr TEXT,                       -- 주소
    
    -- 연락처 정보
    telno VARCHAR(50),               -- 전화번호
    hosp_url VARCHAR(500),           -- 병원홈페이지
    
    -- 개설 정보
    estb_dd VARCHAR(20),             -- 개설일자
    
    -- 의사 인원 정보
    dr_tot_cnt INTEGER DEFAULT 0,    -- 총의사수
    mdept_gdr_cnt INTEGER DEFAULT 0, -- 의과일반의 인원수
    mdept_intn_cnt INTEGER DEFAULT 0, -- 의과인턴 인원수
    mdept_resdnt_cnt INTEGER DEFAULT 0, -- 의과레지던트 인원수
    mdept_sdr_cnt INTEGER DEFAULT 0, -- 의과전문의 인원수
    
    -- 치과 인원 정보
    dety_gdr_cnt INTEGER DEFAULT 0,  -- 치과일반의 인원수
    dety_intn_cnt INTEGER DEFAULT 0, -- 치과인턴 인원수
    dety_resdnt_cnt INTEGER DEFAULT 0, -- 치과레지던트 인원수
    dety_sdr_cnt INTEGER DEFAULT 0,  -- 치과전문의 인원수
    
    -- 한방 인원 정보
    cmdc_gdr_cnt INTEGER DEFAULT 0,  -- 한방일반의 인원수
    cmdc_intn_cnt INTEGER DEFAULT 0, -- 한방인턴 인원수
    cmdc_resdnt_cnt INTEGER DEFAULT 0, -- 한방레지던트 인원수
    cmdc_sdr_cnt INTEGER DEFAULT 0,  -- 한방전문의 인원수
    
    -- 조산사 정보
    midwife_cnt INTEGER DEFAULT 0,   -- 조산사 인원수
    
    -- 좌표 정보
    xpos NUMERIC(12, 7),             -- 좌표(X) - 경도
    ypos NUMERIC(12, 7),             -- 좌표(Y) - 위도
    
    -- 메타 정보
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- API 동기화 시점
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 컬럼 주석 추가
COMMENT ON TABLE hospital_master IS '건강보험심사평가원 병원정보 마스터 테이블';
COMMENT ON COLUMN hospital_master.ykiho IS '암호화요양기호';
COMMENT ON COLUMN hospital_master.yadm_nm IS '요양기관명';
COMMENT ON COLUMN hospital_master.cl_cd IS '종별코드';
COMMENT ON COLUMN hospital_master.cl_cd_nm IS '종별코드명';
COMMENT ON COLUMN hospital_master.sido_cd IS '시도코드';
COMMENT ON COLUMN hospital_master.sido_cd_nm IS '시도코드명';
COMMENT ON COLUMN hospital_master.sggu_cd IS '시군구코드';
COMMENT ON COLUMN hospital_master.sggu_cd_nm IS '시군구코드명';
COMMENT ON COLUMN hospital_master.emdong_nm IS '읍면동';
COMMENT ON COLUMN hospital_master.post_no IS '우편번호';
COMMENT ON COLUMN hospital_master.addr IS '주소';
COMMENT ON COLUMN hospital_master.telno IS '전화번호';
COMMENT ON COLUMN hospital_master.hosp_url IS '병원홈페이지';
COMMENT ON COLUMN hospital_master.estb_dd IS '개설일자';
COMMENT ON COLUMN hospital_master.dr_tot_cnt IS '총의사수';
COMMENT ON COLUMN hospital_master.mdept_gdr_cnt IS '의과일반의 인원수';
COMMENT ON COLUMN hospital_master.mdept_intn_cnt IS '의과인턴 인원수';
COMMENT ON COLUMN hospital_master.mdept_resdnt_cnt IS '의과레지던트 인원수';
COMMENT ON COLUMN hospital_master.mdept_sdr_cnt IS '의과전문의 인원수';
COMMENT ON COLUMN hospital_master.dety_gdr_cnt IS '치과일반의 인원수';
COMMENT ON COLUMN hospital_master.dety_intn_cnt IS '치과인턴 인원수';
COMMENT ON COLUMN hospital_master.dety_resdnt_cnt IS '치과레지던트 인원수';
COMMENT ON COLUMN hospital_master.dety_sdr_cnt IS '치과전문의 인원수';
COMMENT ON COLUMN hospital_master.cmdc_gdr_cnt IS '한방일반의 인원수';
COMMENT ON COLUMN hospital_master.cmdc_intn_cnt IS '한방인턴 인원수';
COMMENT ON COLUMN hospital_master.cmdc_resdnt_cnt IS '한방레지던트 인원수';
COMMENT ON COLUMN hospital_master.cmdc_sdr_cnt IS '한방전문의 인원수';
COMMENT ON COLUMN hospital_master.midwife_cnt IS '조산사 인원수';
COMMENT ON COLUMN hospital_master.xpos IS '좌표(X) - 경도';
COMMENT ON COLUMN hospital_master.ypos IS '좌표(Y) - 위도';
COMMENT ON COLUMN hospital_master.last_synced_at IS 'API 동기화 시점';

-- 인덱스 생성
CREATE INDEX idx_hospital_master_coords ON hospital_master (xpos, ypos);
CREATE INDEX idx_hospital_master_sido ON hospital_master (sido_cd);
CREATE INDEX idx_hospital_master_sggu ON hospital_master (sggu_cd);
CREATE INDEX idx_hospital_master_cl_cd ON hospital_master (cl_cd);
CREATE INDEX idx_hospital_master_yadm_nm ON hospital_master (yadm_nm);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_hospital_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hospital_master_updated_at
    BEFORE UPDATE ON hospital_master
    FOR EACH ROW
    EXECUTE FUNCTION update_hospital_master_updated_at();

-- RLS 정책 (필요 시 활성화)
-- ALTER TABLE hospital_master ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read access" ON hospital_master FOR SELECT USING (true);

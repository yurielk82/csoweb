/**
 * 공공데이터 API 상수 정의
 * 건강보험심사평가원 병원정보서비스
 */

// API 엔드포인트
export const API_ENDPOINT = 'https://apis.data.go.kr/B551182/hospInfoServicev2';

// 인증키 (디코딩된 상태로 저장, 호출 시 인코딩)
export const API_SERVICE_KEY = '3f6de41241fa52e5707165b1367ed8ae949d04ad6906f0015b0f596538f8a832';

// API 설정
export const API_CONFIG = {
  numOfRows: 1000,      // 한 페이지당 데이터 수
  maxRetries: 3,        // 최대 재시도 횟수
  retryDelay: 2000,     // 재시도 대기 시간 (ms)
  batchSize: 500,       // DB upsert 배치 크기
  requestDelay: 500,    // API 호출 간 딜레이 (ms) - Rate Limit 방어
};

// 서비스 목록 (병원 정보 조회용)
export const SERVICES = {
  getHospBasisList: 'getHospBasisList',  // 병원 기본 정보 목록
};

// XML 응답 필드 -> DB 컬럼 매핑
export const FIELD_MAPPING: Record<string, string> = {
  'ykiho': 'ykiho',
  'yadmNm': 'yadm_nm',
  'clCd': 'cl_cd',
  'clCdNm': 'cl_cd_nm',
  'sidoCd': 'sido_cd',
  'sidoCdNm': 'sido_cd_nm',
  'sgguCd': 'sggu_cd',
  'sgguCdNm': 'sggu_cd_nm',
  'emdongNm': 'emdong_nm',
  'postNo': 'post_no',
  'addr': 'addr',
  'telno': 'telno',
  'hospUrl': 'hosp_url',
  'estbDd': 'estb_dd',
  'drTotCnt': 'dr_tot_cnt',
  'mdeptGdrCnt': 'mdept_gdr_cnt',
  'mdeptIntnCnt': 'mdept_intn_cnt',
  'mdeptResdntCnt': 'mdept_resdnt_cnt',
  'mdeptSdrCnt': 'mdept_sdr_cnt',
  'detyGdrCnt': 'dety_gdr_cnt',
  'detyIntnCnt': 'dety_intn_cnt',
  'detyResdntCnt': 'dety_resdnt_cnt',
  'detySdrCnt': 'dety_sdr_cnt',
  'cmdcGdrCnt': 'cmdc_gdr_cnt',
  'cmdcIntnCnt': 'cmdc_intn_cnt',
  'cmdcResdntCnt': 'cmdc_resdnt_cnt',
  'cmdcSdrCnt': 'cmdc_sdr_cnt',
  'midwifeCnt': 'midwife_cnt',
  'XPos': 'xpos',
  'YPos': 'ypos',
};

// 숫자 필드 목록 (파싱 시 변환 필요)
export const INTEGER_FIELDS = [
  'dr_tot_cnt', 'mdept_gdr_cnt', 'mdept_intn_cnt', 'mdept_resdnt_cnt', 'mdept_sdr_cnt',
  'dety_gdr_cnt', 'dety_intn_cnt', 'dety_resdnt_cnt', 'dety_sdr_cnt',
  'cmdc_gdr_cnt', 'cmdc_intn_cnt', 'cmdc_resdnt_cnt', 'cmdc_sdr_cnt', 'midwife_cnt'
];

export const NUMERIC_FIELDS = ['xpos', 'ypos'];

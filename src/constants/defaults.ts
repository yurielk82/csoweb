// ============================================
// 공유 기본값 상수 (매직 넘버/중복 상수 제거)
// ============================================

import type { CompanyInfo } from '@/domain/company/types';
import { DEFAULT_EMAIL_NOTIFICATIONS } from '@/domain/company/types';

// ── 페이지네이션 ──
/** 클라이언트 UI 페이지 크기 (대시보드, 마스터 조회, 정산 API) */
export const DEFAULT_PAGE_SIZE = 50;

/** 일반 회원(CSO) 전체 데이터 조회용 — 페이지네이션 비활성 */
export const CSO_FULL_PAGE_SIZE = 10000;

/** Supabase 내부 전체 조회용 페이지 크기 (fetchAllPaginated) */
export const SUPABASE_PAGE_SIZE = 1000;

/** DB 배치 삽입 크기 */
export const SUPABASE_BATCH_SIZE = 500;

// ── 이메일 ──
/** 이메일 발송 간격 기본값 (ms) — company_settings.email_send_delay_ms 미설정 시 */
export const DEFAULT_EMAIL_SEND_DELAY_MS = 6000;

/** 배치 승인 이메일 간 Rate Limit 방지 딜레이 (ms) */
export const BATCH_EMAIL_DELAY_MS = 200;

/** 이메일 설정 인메모리 캐시 TTL (ms) */
export const EMAIL_CACHE_TTL_MS = 30_000;

/** 이메일 로그 기본 조회 수 */
export const EMAIL_LOG_DEFAULT_LIMIT = 100;

// ── SMTP ──
/** SMTP 기본 포트 (SSL) */
export const DEFAULT_SMTP_PORT = 465;

// ── 인증/보안 ──
/** 세션(JWT + 쿠키) 만료 시간 (시간 단위) */
export const SESSION_EXPIRY_HOURS = 24;

/** 비밀번호 재설정 토큰 만료 시간 (분) */
export const TOKEN_EXPIRY_MINUTES = 30;

/** 로그인 실패 허용 횟수 (초과 시 계정 잠금) */
export const MAX_FAILED_LOGIN_ATTEMPTS = 15;

/** bcrypt 해싱 라운드 */
export const BCRYPT_SALT_ROUNDS = 12;

/** 일반 회원 엑셀 다운로드 일일 제한 횟수 */
export const MAX_DAILY_EXPORTS = 5;

// ── 정산 ──
/** 합계/검색/그룹핑에 항상 필요한 컬럼 (DB 쿼리 select에 항상 포함) */
export const ALWAYS_NEEDED_COLUMNS = [
  'id', 'business_number', '정산월', 'CSO관리업체',
  '제품명', '거래처명', '영업사원',
  '수량', '금액', '제약수수료_합계', '담당수수료_합계',
];

// ── 공지사항 ──
/** Notice 기본 내용 (company_settings.notice_content 미설정 시) */
export const DEFAULT_NOTICE_CONTENT = `1. 세금계산서 작성일자: {{정산월}} 29일 이내
2. 세금계산서 취합 마감일: {{정산월}} 29일 (기간내 미발행 할 경우 무통보 이월)
3. 세금계산서 메일 주소: unioncsosale@ukp.co.kr
4. 품목명: "마케팅 용역 수수료" 또는 "판매대행 수수료" ('00월'표기 금지)
5. 대표자: {{대표자명}}
6. 다음달 EDI 입력 마감일: {{정산월+1}} 11일 (수)까지 (설 연휴 등으로 일자변경 가능)`;

// ── CompanyInfo 기본값 ──
/** company_settings 테이블 기본값 (DB 미조회/에러 시 폴백) */
export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  company_name: '',
  ceo_name: '',
  business_number: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  website: '',
  copyright: '',
  additional_info: '',
  notice_content: DEFAULT_NOTICE_CONTENT,
  email_provider: 'resend',
  smtp_host: '',
  smtp_port: DEFAULT_SMTP_PORT,
  smtp_secure: true,
  smtp_user: '',
  smtp_password: '',
  smtp_from_name: '',
  smtp_from_email: '',
  resend_from_email: '',
  test_recipient_email: '',
  email_send_delay_ms: DEFAULT_EMAIL_SEND_DELAY_MS,
  email_notifications: { ...DEFAULT_EMAIL_NOTIFICATIONS },
};

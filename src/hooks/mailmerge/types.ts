// ============================================
// 메일머지 타입 + 상수
// ============================================

export type SectionId = 'notice' | 'dashboard' | 'table' | 'body';

export interface EmailSection {
  id: SectionId;
  label: string;
  enabled: boolean;
}

export interface ProgressEvent {
  type: 'start' | 'progress' | 'complete';
  current?: number;
  total: number;
  sent?: number;
  failed?: number;
  company_name?: string;
  status?: 'sent' | 'failed' | 'skipped';
  error?: string;
  delay?: number;
  row_count?: number;
}

export interface SendLog {
  company_name: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  row_count?: number;
}

export interface SendResult {
  sent: number;
  failed: number;
  total: number;
}

export interface SendProgress {
  current: number;
  total: number;
  sent: number;
  failed: number;
  delay: number;
}

export interface PreviewData {
  subject: string;
  contentHtml?: string;
  hasSettlementData?: boolean;
}

export interface TestCompany {
  business_number: string;
  company_name: string;
}

export const AVAILABLE_VARIABLES = [
  { key: '업체명', description: '업체명' },
  { key: '사업자번호', description: '사업자번호' },
  { key: '이메일', description: '이메일 주소' },
  { key: '대표자명', description: '회사 대표자 이름' },
  { key: '정산월', description: '정산 년월 (예: 2026년 01월)' },
  { key: '정산월+1', description: '정산 다음월 (예: 2월)' },
  { key: '총_금액', description: '총 금액 (= 전체 금액 합계)' },
  { key: '총_수수료', description: '제약수수료 합계 (= 세금계산서 발행 금액)' },
  { key: '제약수수료_합계', description: '제약수수료 합계 (상세)' },
  { key: '담당수수료_합계', description: '담당수수료 합계' },
  { key: '총_수량', description: '총 수량 합계' },
  { key: '데이터_건수', description: '정산 데이터 행 개수' },
] as const;

export const DEFAULT_SECTIONS: EmailSection[] = [
  { id: 'notice', label: 'Notice (공지사항)', enabled: true },
  { id: 'dashboard', label: '대시보드 (합계 요약)', enabled: true },
  { id: 'table', label: '정산서 테이블', enabled: true },
  { id: 'body', label: '메일 내용', enabled: true },
];

// ── 유틸리티 ──

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
}

export function getSectionsPayload(sections: EmailSection[]) {
  return sections.map(s => ({ id: s.id, enabled: s.enabled }));
}

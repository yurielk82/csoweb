// ============================================
// Database Operations (In-Memory for Demo)
// In production, replace with Supabase queries
// ============================================

import type { 
  User, 
  Settlement, 
  ColumnSetting, 
  EmailLog,
  EmailTemplateType,
  EmailStatus,
  DEFAULT_COLUMN_SETTINGS
} from '@/types';
import { hashPassword } from './auth';

// In-memory storage (replace with Supabase in production)
const users: Map<string, User> = new Map();
const settlements: Settlement[] = [];
const columnSettings: Map<string, ColumnSetting> = new Map();
const emailLogs: EmailLog[] = [];

// Initialize with default admins
async function initializeAdmin() {
  if (users.size === 0) {
    const now = new Date().toISOString();
    const passwordHash = await hashPassword('admin123');
    
    // 기본 관리자
    const adminUser: User = {
      id: 'admin-001',
      business_number: '0000000000',
      company_name: '관리자',
      email: 'admin@cso-portal.com',
      email_verified: true,
      password_hash: passwordHash,
      is_admin: true,
      is_approved: true,
      created_at: now,
      updated_at: now,
    };
    users.set(adminUser.business_number, adminUser);
    
    // 한국유니온제약 관리자
    const unionAdmin: User = {
      id: 'admin-002',
      business_number: '6078121765',
      company_name: '한국유니온제약',
      email: 'admin@kup.co.kr',
      email_verified: true,
      password_hash: passwordHash,
      is_admin: true,
      is_approved: true,
      created_at: now,
      updated_at: now,
    };
    users.set(unionAdmin.business_number, unionAdmin);
  }
}

// Initialize admin on module load
initializeAdmin();

// ============================================
// User Operations
// ============================================

export async function createUser(data: {
  business_number: string;
  company_name: string;
  email: string;
  password_hash: string;
}): Promise<User> {
  const now = new Date().toISOString();
  const user: User = {
    id: `user-${Date.now()}`,
    business_number: data.business_number,
    company_name: data.company_name,
    email: data.email,
    email_verified: false,
    password_hash: data.password_hash,
    is_admin: false,
    is_approved: false,
    created_at: now,
    updated_at: now,
  };
  
  users.set(user.business_number, user);
  return user;
}

export async function getUserByBusinessNumber(businessNumber: string): Promise<User | null> {
  await initializeAdmin();
  return users.get(businessNumber) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await initializeAdmin();
  for (const user of users.values()) {
    if (user.email === email) return user;
  }
  return null;
}

export async function getUserById(id: string): Promise<User | null> {
  await initializeAdmin();
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return null;
}

export async function getAllUsers(): Promise<User[]> {
  await initializeAdmin();
  return Array.from(users.values());
}

export async function getPendingUsers(): Promise<User[]> {
  await initializeAdmin();
  return Array.from(users.values()).filter(u => !u.is_approved && !u.is_admin);
}

export async function approveUser(businessNumber: string): Promise<User | null> {
  const user = users.get(businessNumber);
  if (user) {
    user.is_approved = true;
    user.updated_at = new Date().toISOString();
    return user;
  }
  return null;
}

export async function rejectUser(businessNumber: string): Promise<boolean> {
  return users.delete(businessNumber);
}

export async function updateUserPassword(businessNumber: string, passwordHash: string): Promise<boolean> {
  const user = users.get(businessNumber);
  if (user) {
    user.password_hash = passwordHash;
    user.updated_at = new Date().toISOString();
    return true;
  }
  return false;
}

export async function updateUserEmail(businessNumber: string, email: string): Promise<boolean> {
  const user = users.get(businessNumber);
  if (user) {
    user.email = email;
    user.updated_at = new Date().toISOString();
    return true;
  }
  return false;
}

export async function updateUser(businessNumber: string, data: {
  email?: string;
  is_admin?: boolean;
  is_approved?: boolean;
}): Promise<boolean> {
  const user = users.get(businessNumber);
  if (user) {
    if (data.email !== undefined) user.email = data.email;
    if (data.is_admin !== undefined) user.is_admin = data.is_admin;
    if (data.is_approved !== undefined) user.is_approved = data.is_approved;
    user.updated_at = new Date().toISOString();
    return true;
  }
  return false;
}

export async function deleteUser(businessNumber: string): Promise<boolean> {
  return users.delete(businessNumber);
}

// ============================================
// Settlement Operations (정산월 기준)
// ============================================

export async function insertSettlements(data: Partial<Settlement>[]): Promise<{
  rowCount: number;
  settlementMonths: string[];
}> {
  // 업로드 데이터에서 정산월 추출
  const settlementMonthsSet = new Set<string>();
  for (const row of data) {
    if (row.정산월) {
      settlementMonthsSet.add(row.정산월);
    }
  }
  const settlementMonths = Array.from(settlementMonthsSet).sort().reverse();
  
  // 해당 정산월의 기존 데이터 삭제
  for (const month of settlementMonths) {
    const filtered = settlements.filter(s => s.정산월 !== month);
    settlements.length = 0;
    settlements.push(...filtered);
  }
  
  const now = new Date().toISOString();
  let id = settlements.length > 0 ? Math.max(...settlements.map(s => s.id)) + 1 : 1;
  
  for (const row of data) {
    if (!row.정산월) continue; // 정산월이 없는 데이터는 무시
    
    settlements.push({
      id: id++,
      business_number: row.business_number || '',
      처방월: row.처방월 || '',
      정산월: row.정산월 || '',
      웹코드: row.웹코드 || null,
      거래처명: row.거래처명 || null,
      자체코드: row.자체코드 || null,
      CSO관리업체: row.CSO관리업체 || null,
      CSO관리업체2: row.CSO관리업체2 || null,
      부서1: row.부서1 || null,
      부서2: row.부서2 || null,
      부서3: row.부서3 || null,
      영업사원: row.영업사원 || null,
      제조사: row.제조사 || null,
      보험코드: row.보험코드 || null,
      제품명: row.제품명 || null,
      수량: row.수량 ?? null,
      단가: row.단가 ?? null,
      금액: row.금액 ?? null,
      제약수수료_제한금액: row.제약수수료_제한금액 ?? null,
      제약_수수료율: row.제약_수수료율 ?? null,
      추가수수료율_제약: row.추가수수료율_제약 ?? null,
      제약수수료율_통합: row.제약수수료율_통합 ?? null,
      제약_수수료: row.제약_수수료 ?? null,
      거래처제품_인센티브율_제약: row.거래처제품_인센티브율_제약 ?? null,
      거래처제품_제약: row.거래처제품_제약 ?? null,
      관리업체_인센티브율_제약: row.관리업체_인센티브율_제약 ?? null,
      관리업체_제약: row.관리업체_제약 ?? null,
      제약수수료_합계: row.제약수수료_합계 ?? null,
      담당_수수료율: row.담당_수수료율 ?? null,
      추가수수료율_담당: row.추가수수료율_담당 ?? null,
      담당수수료율_통합: row.담당수수료율_통합 ?? null,
      담당_수수료: row.담당_수수료 ?? null,
      거래처제품_인센티브율_담당: row.거래처제품_인센티브율_담당 ?? null,
      거래처제품_담당: row.거래처제품_담당 ?? null,
      관리업체_인센티브율_담당: row.관리업체_인센티브율_담당 ?? null,
      관리업체_담당: row.관리업체_담당 ?? null,
      담당수수료_합계: row.담당수수료_합계 ?? null,
      처방전_비고: row.처방전_비고 || null,
      처방전_상세_비고: row.처방전_상세_비고 || null,
      제품_비고: row.제품_비고 || null,
      제품_비고_2: row.제품_비고_2 || null,
      수정일시: row.수정일시 || null,
      수정자: row.수정자 || null,
      upload_date: now,
    } as Settlement);
  }
  
  return {
    rowCount: data.filter(d => d.정산월).length,
    settlementMonths,
  };
}

export async function getSettlementsByBusinessNumber(
  businessNumber: string,
  settlementMonth?: string
): Promise<Settlement[]> {
  let result = settlements.filter(s => s.business_number === businessNumber);
  if (settlementMonth) {
    result = result.filter(s => s.정산월 === settlementMonth);
  }
  return result;
}

export async function getAllSettlements(settlementMonth?: string): Promise<Settlement[]> {
  if (settlementMonth) {
    return settlements.filter(s => s.정산월 === settlementMonth);
  }
  return [...settlements];
}

// 정산월 목록 조회 (엑셀 데이터의 정산월 컬럼 기준)
export async function getAvailableSettlementMonths(): Promise<string[]> {
  const months = new Set(settlements.map(s => s.정산월).filter(Boolean));
  return Array.from(months).sort().reverse();
}

// 특정 정산월의 사업자번호 목록
export async function getBusinessNumbersForSettlementMonth(settlementMonth: string): Promise<string[]> {
  const businessNumbers = new Set(
    settlements
      .filter(s => s.정산월 === settlementMonth)
      .map(s => s.business_number)
  );
  return Array.from(businessNumbers);
}

export async function getSettlementSummary(businessNumber: string, settlementMonth: string): Promise<{
  총_금액: number;
  총_수수료: number;
  데이터_건수: number;
}> {
  const data = settlements.filter(
    s => s.business_number === businessNumber && s.정산월 === settlementMonth
  );
  
  return {
    총_금액: data.reduce((sum, s) => sum + (s.금액 || 0), 0),
    총_수수료: data.reduce((sum, s) => sum + (s.제약수수료_합계 || 0) + (s.담당수수료_합계 || 0), 0),
    데이터_건수: data.length,
  };
}

// 정산월별 통계
export async function getSettlementStats(): Promise<{
  totalRows: number;
  settlementMonths: { month: string; count: number }[];
  businessCount: number;
}> {
  const monthCounts = new Map<string, number>();
  const businessNumbers = new Set<string>();
  
  for (const s of settlements) {
    if (s.정산월) {
      monthCounts.set(s.정산월, (monthCounts.get(s.정산월) || 0) + 1);
    }
    businessNumbers.add(s.business_number);
  }
  
  const settlementMonths = Array.from(monthCounts.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month));
  
  return {
    totalRows: settlements.length,
    settlementMonths,
    businessCount: businessNumbers.size,
  };
}

// 정산월별 상세 통계 (데이터 관리 페이지용)
export async function getSettlementStatsByMonth(): Promise<{
  totalRows: number;
  totalBusinesses: number;
  months: { month: string; count: number; businessCount: number; totalAmount: number }[];
}> {
  const monthData = new Map<string, { count: number; businesses: Set<string>; amount: number }>();
  const allBusinesses = new Set<string>();
  
  for (const s of settlements) {
    if (s.정산월) {
      const existing = monthData.get(s.정산월) || { count: 0, businesses: new Set<string>(), amount: 0 };
      existing.count++;
      existing.businesses.add(s.business_number);
      existing.amount += s.금액 || 0;
      monthData.set(s.정산월, existing);
    }
    allBusinesses.add(s.business_number);
  }
  
  const months = Array.from(monthData.entries())
    .map(([month, data]) => ({
      month,
      count: data.count,
      businessCount: data.businesses.size,
      totalAmount: data.amount,
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
  
  return {
    totalRows: settlements.length,
    totalBusinesses: allBusinesses.size,
    months,
  };
}

// 특정 정산월 데이터 삭제
export async function deleteSettlementsByMonth(month: string): Promise<number> {
  const beforeCount = settlements.length;
  const filtered = settlements.filter(s => s.정산월 !== month);
  settlements.length = 0;
  settlements.push(...filtered);
  return beforeCount - settlements.length;
}

// ============================================
// Column Settings Operations
// ============================================

export async function initializeColumnSettings(defaults: typeof DEFAULT_COLUMN_SETTINGS): Promise<void> {
  if (columnSettings.size === 0) {
    const now = new Date().toISOString();
    for (const setting of defaults) {
      const id = `col-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      columnSettings.set(setting.column_key, {
        id,
        ...setting,
        created_at: now,
        updated_at: now,
      });
    }
  }
}

export async function getColumnSettings(): Promise<ColumnSetting[]> {
  return Array.from(columnSettings.values()).sort((a, b) => a.display_order - b.display_order);
}

export async function updateColumnSettings(settings: Partial<ColumnSetting>[]): Promise<void> {
  const now = new Date().toISOString();
  for (const setting of settings) {
    if (setting.column_key) {
      const existing = columnSettings.get(setting.column_key);
      if (existing) {
        columnSettings.set(setting.column_key, {
          ...existing,
          ...setting,
          updated_at: now,
        });
      }
    }
  }
}

// ============================================
// Email Log Operations
// ============================================

export async function createEmailLog(data: {
  recipient_email: string;
  subject: string;
  template_type: EmailTemplateType;
}): Promise<EmailLog> {
  const log: EmailLog = {
    id: `email-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    recipient_email: data.recipient_email,
    subject: data.subject,
    template_type: data.template_type,
    status: 'pending',
    error_message: null,
    sent_at: null,
    created_at: new Date().toISOString(),
  };
  
  emailLogs.push(log);
  return log;
}

export async function updateEmailLog(id: string, data: {
  status: EmailStatus;
  error_message?: string;
}): Promise<void> {
  const log = emailLogs.find(l => l.id === id);
  if (log) {
    log.status = data.status;
    if (data.status === 'sent') {
      log.sent_at = new Date().toISOString();
    }
    if (data.error_message) {
      log.error_message = data.error_message;
    }
  }
}

export async function getEmailLogs(filter?: {
  template_type?: EmailTemplateType;
  status?: EmailStatus;
  limit?: number;
}): Promise<EmailLog[]> {
  let result = [...emailLogs];
  
  if (filter?.template_type) {
    result = result.filter(l => l.template_type === filter.template_type);
  }
  if (filter?.status) {
    result = result.filter(l => l.status === filter.status);
  }
  
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  if (filter?.limit) {
    result = result.slice(0, filter.limit);
  }
  
  return result;
}

export async function getEmailStats(): Promise<{
  total: number;
  sent: number;
  failed: number;
  pending: number;
}> {
  return {
    total: emailLogs.length,
    sent: emailLogs.filter(l => l.status === 'sent').length,
    failed: emailLogs.filter(l => l.status === 'failed').length,
    pending: emailLogs.filter(l => l.status === 'pending').length,
  };
}

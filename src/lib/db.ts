// ============================================
// Database Operations (Supabase)
// ============================================

import { supabase, DbUser, DbPasswordResetToken } from './supabase';
import type { 
  User, 
  Settlement, 
  ColumnSetting, 
  EmailLog,
  EmailTemplateType,
  EmailStatus,
  DEFAULT_COLUMN_SETTINGS
} from '@/types';

// ============================================
// User Operations
// ============================================

export async function createUser(data: {
  business_number: string;
  company_name: string;
  ceo_name: string;
  zipcode: string;
  address1: string;
  address2?: string;
  phone1: string;
  phone2?: string;
  email: string;
  email2?: string;
  password_hash: string;
}): Promise<User> {
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      business_number: data.business_number,
      company_name: data.company_name,
      ceo_name: data.ceo_name,
      zipcode: data.zipcode,
      address1: data.address1,
      address2: data.address2 || null,
      phone1: data.phone1,
      phone2: data.phone2 || null,
      email: data.email,
      email2: data.email2 || null,
      password_hash: data.password_hash,
      is_admin: false,
      is_approved: false,
      email_verified: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapDbUserToUser(user);
}

export async function getUserByBusinessNumber(businessNumber: string): Promise<User | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('business_number', businessNumber)
    .single();

  if (error || !user) return null;
  return mapDbUserToUser(user);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) return null;
  return mapDbUserToUser(user);
}

export async function getUserById(id: string): Promise<User | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) return null;
  return mapDbUserToUser(user);
}

export async function getAllUsers(): Promise<User[]> {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !users) return [];
  return users.map(mapDbUserToUser);
}

export async function getPendingUsers(): Promise<User[]> {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_approved', false)
    .eq('is_admin', false)
    .order('created_at', { ascending: false });

  if (error || !users) return [];
  return users.map(mapDbUserToUser);
}

export async function approveUser(businessNumber: string): Promise<User | null> {
  const { data: user, error } = await supabase
    .from('users')
    .update({ is_approved: true, updated_at: new Date().toISOString() })
    .eq('business_number', businessNumber)
    .select()
    .single();

  if (error || !user) return null;
  return mapDbUserToUser(user);
}

export async function rejectUser(businessNumber: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('business_number', businessNumber);

  return !error;
}

export async function updateUserPassword(businessNumber: string, passwordHash: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq('business_number', businessNumber);

  return !error;
}

export async function updateUserEmail(businessNumber: string, email: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ email, updated_at: new Date().toISOString() })
    .eq('business_number', businessNumber);

  return !error;
}

export async function updateUser(businessNumber: string, data: {
  company_name?: string;
  ceo_name?: string;
  zipcode?: string;
  address1?: string;
  address2?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  email2?: string;
  is_admin?: boolean;
  is_approved?: boolean;
}): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('business_number', businessNumber);

  return !error;
}

export async function deleteUser(businessNumber: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('business_number', businessNumber);

  return !error;
}

function mapDbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    business_number: dbUser.business_number,
    company_name: dbUser.company_name,
    ceo_name: dbUser.ceo_name || '',
    zipcode: dbUser.zipcode || '',
    address1: dbUser.address1 || '',
    address2: dbUser.address2 || undefined,
    phone1: dbUser.phone1 || '',
    phone2: dbUser.phone2 || undefined,
    email: dbUser.email,
    email2: dbUser.email2 || undefined,
    email_verified: dbUser.email_verified,
    password_hash: dbUser.password_hash,
    is_admin: dbUser.is_admin,
    is_approved: dbUser.is_approved,
    must_change_password: dbUser.must_change_password || false,
    password_changed_at: dbUser.password_changed_at || undefined,
    created_at: dbUser.created_at,
    updated_at: dbUser.updated_at,
  };
}

// 비밀번호 초기화 (u + 사업자번호)
export async function resetPasswordToDefault(businessNumber: string, passwordHash: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ 
      password_hash: passwordHash,
      must_change_password: true,
      updated_at: new Date().toISOString()
    })
    .eq('business_number', businessNumber);

  return !error;
}

// 비밀번호 변경 완료 처리
export async function completePasswordChange(businessNumber: string, passwordHash: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ 
      password_hash: passwordHash,
      must_change_password: false,
      password_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('business_number', businessNumber);

  return !error;
}

// 사업자번호 + 이메일로 사용자 조회
export async function getUserByBusinessNumberAndEmail(businessNumber: string, email: string): Promise<User | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('business_number', businessNumber)
    .eq('email', email)
    .single();

  if (error || !user) return null;
  return mapDbUserToUser(user);
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
    await supabase
      .from('settlements')
      .delete()
      .eq('정산월', month);
  }

  // 새 데이터 삽입 (배치로 처리)
  const validData = data.filter(d => d.정산월);
  const batchSize = 500;
  
  for (let i = 0; i < validData.length; i += batchSize) {
    const batch = validData.slice(i, i + batchSize).map(row => ({
      business_number: row.business_number || '',
      처방월: row.처방월 || null,
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
    }));

    const { error } = await supabase.from('settlements').insert(batch);
    if (error) {
      console.error('Settlement insert error:', error);
      throw new Error(error.message);
    }
  }

  return {
    rowCount: validData.length,
    settlementMonths,
  };
}

export async function getSettlementsByBusinessNumber(
  businessNumber: string,
  settlementMonth?: string
): Promise<Settlement[]> {
  // 모든 데이터 페이지네이션으로 가져오기
  const allRows: Settlement[] = [];
  const pageSize = 1000;
  let page = 0;
  
  while (true) {
    let query = supabase
      .from('settlements')
      .select('*')
      .eq('business_number', businessNumber);

    if (settlementMonth) {
      query = query.eq('정산월', settlementMonth);
    }

    const { data, error } = await query
      .order('id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    allRows.push(...(data as Settlement[]));
    if (data.length < pageSize) break;
    page++;
  }
  
  return allRows;
}

export async function getAllSettlements(settlementMonth?: string): Promise<Settlement[]> {
  // 모든 데이터 페이지네이션으로 가져오기
  const allRows: Settlement[] = [];
  const pageSize = 1000;
  let page = 0;
  
  while (true) {
    let query = supabase.from('settlements').select('*');
    
    if (settlementMonth) {
      query = query.eq('정산월', settlementMonth);
    }
    
    const { data, error } = await query
      .order('id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    allRows.push(...(data as Settlement[]));
    if (data.length < pageSize) break;
    page++;
  }
  
  return allRows;
}

// 정산월 목록 조회
export async function getAvailableSettlementMonths(): Promise<string[]> {
  // 모든 정산월 페이지네이션으로 가져오기
  const allMonths: string[] = [];
  const pageSize = 1000;
  let page = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('settlements')
      .select('정산월')
      .not('정산월', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    const rows = data as unknown as { 정산월: string }[];
    allMonths.push(...rows.map(d => d.정산월));
    if (data.length < pageSize) break;
    page++;
  }
  
  const months = [...new Set(allMonths)].filter(Boolean);
  return months.sort().reverse();
}

// 특정 정산월의 사업자번호 목록
export async function getBusinessNumbersForSettlementMonth(settlementMonth: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('business_number')
    .eq('정산월', settlementMonth);

  if (error || !data) return [];
  
  return [...new Set(data.map(d => d.business_number))];
}

export async function getSettlementSummary(businessNumber: string, settlementMonth: string): Promise<{
  총_금액: number;
  총_수수료: number;
  제약수수료_합계: number;
  담당수수료_합계: number;
  데이터_건수: number;
  총_수량: number;
}> {
  const { data, error } = await supabase
    .from('settlements')
    .select('금액, 수량, 제약수수료_합계, 담당수수료_합계')
    .eq('business_number', businessNumber)
    .eq('정산월', settlementMonth);

  if (error || !data) {
    return { 총_금액: 0, 총_수수료: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 데이터_건수: 0, 총_수량: 0 };
  }

  type SummaryRow = { 금액: number | null; 수량: number | null; 제약수수료_합계: number | null; 담당수수료_합계: number | null };
  const rows = data as unknown as SummaryRow[];
  
  const 제약수수료_합계 = rows.reduce((sum, s) => sum + (Number(s.제약수수료_합계) || 0), 0);
  const 담당수수료_합계 = rows.reduce((sum, s) => sum + (Number(s.담당수수료_합계) || 0), 0);
  
  return {
    총_금액: rows.reduce((sum, s) => sum + (Number(s.금액) || 0), 0),
    총_수수료: 제약수수료_합계, // 제약수수료 합계 = 세금계산서 발행 금액
    제약수수료_합계,
    담당수수료_합계,
    데이터_건수: data.length,
    총_수량: rows.reduce((sum, s) => sum + (Number(s.수량) || 0), 0),
  };
}

// 정산월별 통계
export async function getSettlementStats(): Promise<{
  totalRows: number;
  settlementMonths: { month: string; count: number }[];
  businessCount: number;
}> {
  // 전체 개수 먼저 조회
  const { count: totalCount } = await supabase
    .from('settlements')
    .select('*', { count: 'exact', head: true });

  // 모든 데이터 페이지네이션으로 가져오기
  const allRows: { 정산월: string | null; business_number: string }[] = [];
  const pageSize = 1000;
  let page = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('settlements')
      .select('정산월, business_number')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    const rows = data as unknown as { 정산월: string | null; business_number: string }[];
    allRows.push(...rows);
    if (data.length < pageSize) break;
    page++;
  }

  const monthCounts = new Map<string, number>();
  const businessNumbers = new Set<string>();

  for (const s of allRows) {
    if (s.정산월) {
      monthCounts.set(s.정산월, (monthCounts.get(s.정산월) || 0) + 1);
    }
    businessNumbers.add(s.business_number);
  }

  const settlementMonths = Array.from(monthCounts.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month));

  return {
    totalRows: totalCount || allRows.length,
    settlementMonths,
    businessCount: businessNumbers.size,
  };
}

// 정산월별 상세 통계 (데이터 관리 페이지용)
export async function getSettlementStatsByMonth(): Promise<{
  totalRows: number;
  totalBusinesses: number;
  months: { 
    month: string; 
    prescriptionMonth: string;
    count: number; 
    csoCount: number;
    totalQuantity: number;
    totalAmount: number;
    totalCommission: number;
  }[];
}> {
  // 전체 개수 먼저 조회
  const { count: totalCount } = await supabase
    .from('settlements')
    .select('*', { count: 'exact', head: true });

  // 모든 데이터 페이지네이션으로 가져오기
  type MonthRow = { 
    정산월: string | null; 
    처방월: string | null;
    business_number: string; 
    CSO관리업체: string | null;
    수량: number | null;
    금액: number | null;
    제약수수료_합계: number | null;
  };
  const allRows: MonthRow[] = [];
  const pageSize = 1000;
  let page = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('settlements')
      .select('정산월, 처방월, business_number, CSO관리업체, 수량, 금액, 제약수수료_합계')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    const rows = data as unknown as MonthRow[];
    allRows.push(...rows);
    if (data.length < pageSize) break;
    page++;
  }

  const monthData = new Map<string, { 
    prescriptionMonth: string;
    count: number; 
    csoSet: Set<string>; 
    quantity: number;
    amount: number;
    commission: number;
  }>();
  const allBusinesses = new Set<string>();

  for (const s of allRows) {
    if (s.정산월) {
      const existing = monthData.get(s.정산월) || { 
        prescriptionMonth: s.처방월 || '',
        count: 0, 
        csoSet: new Set<string>(), 
        quantity: 0,
        amount: 0,
        commission: 0
      };
      existing.count++;
      if (s.CSO관리업체) {
        existing.csoSet.add(s.CSO관리업체);
      }
      existing.quantity += Number(s.수량) || 0;
      existing.amount += Number(s.금액) || 0;
      existing.commission += Number(s.제약수수료_합계) || 0;
      // 처방월이 비어있으면 업데이트
      if (!existing.prescriptionMonth && s.처방월) {
        existing.prescriptionMonth = s.처방월;
      }
      monthData.set(s.정산월, existing);
    }
    allBusinesses.add(s.business_number);
  }

  const months = Array.from(monthData.entries())
    .map(([month, d]) => ({
      month,
      prescriptionMonth: d.prescriptionMonth,
      count: d.count,
      csoCount: d.csoSet.size,
      totalQuantity: d.quantity,
      totalAmount: d.amount,
      totalCommission: d.commission,
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  return {
    totalRows: totalCount || allRows.length,
    totalBusinesses: allBusinesses.size,
    months,
  };
}

// 특정 정산월 데이터 삭제
export async function deleteSettlementsByMonth(month: string): Promise<number> {
  // 먼저 개수 조회
  const { count } = await supabase
    .from('settlements')
    .select('*', { count: 'exact', head: true })
    .eq('정산월', month);

  // 삭제
  const { error } = await supabase
    .from('settlements')
    .delete()
    .eq('정산월', month);

  if (error) return 0;
  return count || 0;
}

// ============================================
// Column Settings Operations
// ============================================

export async function initializeColumnSettings(defaults: typeof DEFAULT_COLUMN_SETTINGS): Promise<void> {
  // 기존 설정이 있는지 확인
  const { data: existing } = await supabase
    .from('column_settings')
    .select('id')
    .limit(1);

  if (existing && existing.length > 0) return;

  // 기본 설정 삽입
  const settings = defaults.map(s => ({
    column_key: s.column_key,
    column_name: s.column_name,
    is_visible: s.is_visible,
    is_required: s.is_required,
    is_summary: s.is_summary || false,
    display_order: s.display_order,
  }));

  await supabase.from('column_settings').insert(settings);
}

export async function getColumnSettings(): Promise<ColumnSetting[]> {
  const { data, error } = await supabase
    .from('column_settings')
    .select('*')
    .order('display_order', { ascending: true });

  if (error || !data) return [];
  return data as ColumnSetting[];
}

export async function updateColumnSettings(settings: Partial<ColumnSetting>[]): Promise<void> {
  for (const setting of settings) {
    if (setting.column_key) {
      await supabase
        .from('column_settings')
        .update({
          column_name: setting.column_name,
          is_visible: setting.is_visible,
          is_required: setting.is_required,
          is_summary: setting.is_summary ?? false,
          display_order: setting.display_order,
          updated_at: new Date().toISOString(),
        })
        .eq('column_key', setting.column_key);
    }
  }
}

// 월별 수수료 합계 조회 (is_summary가 true인 컬럼만)
export async function getMonthlySummaryByBusinessNumber(
  businessNumber: string
): Promise<{
  months: Array<{
    settlement_month: string;
    summaries: Record<string, number>;
    row_count: number;
  }>;
  summary_columns: ColumnSetting[];
}> {
  // 1. is_summary가 true인 컬럼 조회
  const { data: columnData } = await supabase
    .from('column_settings')
    .select('*')
    .eq('is_summary', true)
    .order('display_order', { ascending: true });
  
  const summaryColumns = (columnData || []) as ColumnSetting[];
  const summaryColumnKeys = summaryColumns.map(c => c.column_key);
  
  if (summaryColumnKeys.length === 0) {
    return { months: [], summary_columns: [] };
  }

  // 2. 해당 사업자의 모든 정산월 데이터 조회
  const allRows: Array<Record<string, unknown>> = [];
  const pageSize = 1000;
  let page = 0;
  
  // 동적으로 select 컬럼 구성
  const selectColumns = ['정산월', ...summaryColumnKeys].join(', ');
  
  while (true) {
    const { data, error } = await supabase
      .from('settlements')
      .select(selectColumns)
      .eq('business_number', businessNumber)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    allRows.push(...(data as unknown as Array<Record<string, unknown>>));
    if (data.length < pageSize) break;
    page++;
  }

  // 3. 정산월별로 그룹핑하여 합계 계산
  const monthlyData = new Map<string, { summaries: Record<string, number>; count: number }>();
  
  for (const row of allRows) {
    const month = row.정산월 as string;
    if (!month) continue;
    
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { 
        summaries: Object.fromEntries(summaryColumnKeys.map(k => [k, 0])),
        count: 0 
      });
    }
    
    const data = monthlyData.get(month)!;
    data.count++;
    
    for (const key of summaryColumnKeys) {
      const value = Number(row[key]) || 0;
      data.summaries[key] += value;
    }
  }

  // 4. 정산월 기준 내림차순 정렬
  const months = Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      settlement_month: month,
      summaries: data.summaries,
      row_count: data.count,
    }))
    .sort((a, b) => b.settlement_month.localeCompare(a.settlement_month));

  return { months, summary_columns: summaryColumns };
}

// ============================================
// Email Log Operations
// ============================================

export async function createEmailLog(data: {
  recipient_email: string;
  subject: string;
  template_type: EmailTemplateType;
}): Promise<EmailLog> {
  const { data: log, error } = await supabase
    .from('email_logs')
    .insert({
      recipient_email: data.recipient_email,
      subject: data.subject,
      template_type: data.template_type,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return log as EmailLog;
}

export async function updateEmailLog(id: string, data: {
  status: EmailStatus;
  error_message?: string;
}): Promise<void> {
  const updateData: Record<string, unknown> = { status: data.status };
  
  if (data.status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  }
  if (data.error_message) {
    updateData.error_message = data.error_message;
  }

  await supabase
    .from('email_logs')
    .update(updateData)
    .eq('id', id);
}

export async function getEmailLogs(filter?: {
  template_type?: EmailTemplateType;
  status?: EmailStatus;
  limit?: number;
}): Promise<EmailLog[]> {
  let query = supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter?.template_type) {
    query = query.eq('template_type', filter.template_type);
  }
  if (filter?.status) {
    query = query.eq('status', filter.status);
  }
  if (filter?.limit) {
    query = query.limit(filter.limit);
  }

  const { data, error } = await query;
  
  if (error || !data) return [];
  return data as EmailLog[];
}

export async function getEmailStats(): Promise<{
  total: number;
  sent: number;
  failed: number;
  pending: number;
}> {
  const { data, error } = await supabase
    .from('email_logs')
    .select('status');

  if (error || !data) {
    return { total: 0, sent: 0, failed: 0, pending: 0 };
  }

  return {
    total: data.length,
    sent: data.filter(l => l.status === 'sent').length,
    failed: data.filter(l => l.status === 'failed').length,
    pending: data.filter(l => l.status === 'pending').length,
  };
}

// ============================================
// Company Settings Operations
// ============================================

const DEFAULT_NOTICE_CONTENT = `1. 세금계산서 작성일자: {{정산월}} 29일 이내
2. 세금계산서 취합 마감일: {{정산월}} 29일 (기간내 미발행 할 경우 무통보 이월)
3. 세금계산서 메일 주소: unioncsosale@ukp.co.kr
4. 품목명: "마케팅 용역 수수료" 또는 "판매대행 수수료" ('00월'표기 금지)
5. 대표자: {{대표자명}}
6. 다음달 EDI 입력 마감일: {{정산월+1}} 11일 (수)까지 (설 연휴 등으로 일자변경 가능)`;

interface CompanyInfo {
  company_name: string;
  ceo_name: string;
  business_number: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  copyright: string;
  additional_info: string;
  // Notice 영역 설정 (하나의 텍스트로 통합)
  notice_content: string;
}

export async function getCompanyInfo(): Promise<CompanyInfo> {
  // .single() 대신 배열로 받아서 첫 번째 항목 사용
  const { data: rows, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1);

  if (error) {
    console.log('getCompanyInfo error:', error.message, error.code);
  }
  
  const data = rows && rows.length > 0 ? rows[0] : null;
  
  if (data) {
    console.log('getCompanyInfo raw data from DB:', JSON.stringify(data, null, 2));
  } else {
    console.log('getCompanyInfo: no data found, rows:', rows);
  }

  if (error || !data) {
    console.log('getCompanyInfo returning defaults due to error or no data');
    return {
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
    };
  }

  return {
    company_name: data.company_name || '',
    ceo_name: data.ceo_name || '',
    business_number: data.business_number || '',
    address: data.address || '',
    phone: data.phone || '',
    fax: data.fax || '',
    email: data.email || '',
    website: data.website || '',
    copyright: data.copyright || '',
    additional_info: data.additional_info || '',
    notice_content: data.notice_content || DEFAULT_NOTICE_CONTENT,
  };
}

export async function updateCompanyInfo(data: Partial<CompanyInfo>): Promise<void> {
  // 기존 설정이 있는지 확인
  const { data: existing, error: selectError } = await supabase
    .from('company_settings')
    .select('id')
    .limit(1);

  if (selectError) {
    console.error('Company settings select error:', selectError);
    throw new Error(selectError.message);
  }

  if (existing && existing.length > 0) {
    // 업데이트
    const { error: updateError } = await supabase
      .from('company_settings')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', existing[0].id);
    
    if (updateError) {
      console.error('Company settings update error:', updateError);
      throw new Error(updateError.message);
    }
  } else {
    // 새로 생성
    const { error: insertError } = await supabase
      .from('company_settings')
      .insert({ ...data });
    
    if (insertError) {
      console.error('Company settings insert error:', insertError);
      throw new Error(insertError.message);
    }
  }
}

// ============================================
// Password Reset Token Operations
// ============================================

export interface PasswordResetToken {
  id: string;
  user_id: string;
  business_number: string;
  email: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

/**
 * 비밀번호 재설정 토큰 생성
 * - UUID 기반 토큰 생성
 * - 30분 유효 기간 설정
 * - 기존 미사용 토큰은 무효화
 */
export async function createPasswordResetToken(
  userId: string,
  businessNumber: string,
  email: string
): Promise<PasswordResetToken> {
  // 기존 미사용 토큰 무효화 (삭제)
  await supabase
    .from('password_reset_tokens')
    .delete()
    .eq('user_id', userId)
    .is('used_at', null);

  // UUID 생성
  const token = crypto.randomUUID();
  
  // 30분 후 만료
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('password_reset_tokens')
    .insert({
      user_id: userId,
      business_number: businessNumber,
      email: email.toLowerCase().trim(),
      token,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('Create password reset token error:', error);
    throw new Error('토큰 생성에 실패했습니다.');
  }

  return mapDbTokenToToken(data);
}

/**
 * 토큰으로 비밀번호 재설정 정보 조회
 * - 토큰 유효성 검증 (만료 여부, 사용 여부)
 */
export async function getPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  const { data, error } = await supabase
    .from('password_reset_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbTokenToToken(data);
}

/**
 * 토큰 유효성 검증
 * - 존재 여부, 만료 여부, 사용 여부 체크
 */
export async function validatePasswordResetToken(token: string): Promise<{
  valid: boolean;
  token?: PasswordResetToken;
  error?: string;
}> {
  const tokenData = await getPasswordResetToken(token);

  if (!tokenData) {
    return { valid: false, error: '유효하지 않은 토큰입니다.' };
  }

  // 이미 사용된 토큰
  if (tokenData.used_at) {
    return { valid: false, error: '이미 사용된 토큰입니다.' };
  }

  // 만료된 토큰
  if (new Date(tokenData.expires_at) < new Date()) {
    return { valid: false, error: '만료된 토큰입니다. 비밀번호 재설정을 다시 요청해주세요.' };
  }

  return { valid: true, token: tokenData };
}

/**
 * 토큰 사용 처리 (만료)
 */
export async function markTokenAsUsed(token: string): Promise<boolean> {
  const { error } = await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token);

  return !error;
}

/**
 * 만료된 토큰 정리 (선택적 정리 작업용)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const { data, error } = await supabase
    .from('password_reset_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select();

  if (error) return 0;
  return data?.length || 0;
}

function mapDbTokenToToken(dbToken: DbPasswordResetToken): PasswordResetToken {
  return {
    id: dbToken.id,
    user_id: dbToken.user_id,
    business_number: dbToken.business_number,
    email: dbToken.email,
    token: dbToken.token,
    expires_at: dbToken.expires_at,
    used_at: dbToken.used_at,
    created_at: dbToken.created_at,
  };
}

// ============================================
// CSO Matching 기반 정산서 조회
// ============================================

/**
 * 사업자번호로 매칭된 CSO관리업체명 목록 조회
 * - cso_matching 테이블에서 해당 사업자번호와 연결된 모든 ERP 업체명 반환
 */
export async function getMatchedCSOCompanyNames(businessNumber: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('cso_matching')
    .select('cso_company_name')
    .eq('business_number', businessNumber);

  if (error) {
    console.error('Get matched CSO names error:', error);
    return [];
  }

  return (data || []).map(d => d.cso_company_name);
}

/**
 * CSO관리업체명 기반 정산서 조회 (일반 회원용)
 * - 로그인한 회원의 사업자번호로 cso_matching에서 매칭된 업체명 목록을 가져옴
 * - 해당 업체명들과 일치하는 정산 데이터만 조회
 */
export async function getSettlementsByCSOMatching(
  businessNumber: string,
  settlementMonth?: string
): Promise<Settlement[]> {
  // 1. 매칭된 CSO관리업체명 목록 조회
  const matchedNames = await getMatchedCSOCompanyNames(businessNumber);
  
  if (matchedNames.length === 0) {
    console.log(`No matched CSO names found for business_number: ${businessNumber}`);
    return [];
  }

  console.log(`Found ${matchedNames.length} matched CSO names for ${businessNumber}:`, matchedNames);

  // 2. 해당 업체명들의 정산 데이터 조회
  const allRows: Settlement[] = [];
  const pageSize = 1000;
  let page = 0;
  
  while (true) {
    let query = supabase
      .from('settlements')
      .select('*')
      .in('CSO관리업체', matchedNames);

    if (settlementMonth) {
      query = query.eq('정산월', settlementMonth);
    }

    const { data, error } = await query
      .order('id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('Get settlements by CSO matching error:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    allRows.push(...(data as Settlement[]));
    if (data.length < pageSize) break;
    page++;
  }
  
  return allRows;
}

/**
 * CSO관리업체명 기반 사용 가능한 정산월 목록 조회 (일반 회원용)
 * - 매칭된 업체명의 정산 데이터가 있는 월만 반환
 */
export async function getAvailableSettlementMonthsByCSOMatching(
  businessNumber: string
): Promise<string[]> {
  // 1. 매칭된 CSO관리업체명 목록 조회
  const matchedNames = await getMatchedCSOCompanyNames(businessNumber);
  
  if (matchedNames.length === 0) {
    return [];
  }

  // 2. 해당 업체명들의 정산월 조회
  const allMonths: string[] = [];
  const pageSize = 1000;
  let page = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('settlements')
      .select('정산월')
      .in('CSO관리업체', matchedNames)
      .not('정산월', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    const rows = data as unknown as { 정산월: string }[];
    allMonths.push(...rows.map(d => d.정산월));
    if (data.length < pageSize) break;
    page++;
  }
  
  const months = [...new Set(allMonths)].filter(Boolean);
  return months.sort().reverse();
}

/**
 * CSO관리업체명 기반 정산 요약 조회 (일반 회원용)
 */
export async function getSettlementSummaryByCSOMatching(
  businessNumber: string, 
  settlementMonth: string
): Promise<{
  총_금액: number;
  총_수수료: number;
  제약수수료_합계: number;
  담당수수료_합계: number;
  데이터_건수: number;
  총_수량: number;
}> {
  // 1. 매칭된 CSO관리업체명 목록 조회
  const matchedNames = await getMatchedCSOCompanyNames(businessNumber);
  
  if (matchedNames.length === 0) {
    return { 총_금액: 0, 총_수수료: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 데이터_건수: 0, 총_수량: 0 };
  }

  const { data, error } = await supabase
    .from('settlements')
    .select('금액, 수량, 제약수수료_합계, 담당수수료_합계')
    .in('CSO관리업체', matchedNames)
    .eq('정산월', settlementMonth);

  if (error || !data) {
    return { 총_금액: 0, 총_수수료: 0, 제약수수료_합계: 0, 담당수수료_합계: 0, 데이터_건수: 0, 총_수량: 0 };
  }

  type SummaryRow = { 금액: number | null; 수량: number | null; 제약수수료_합계: number | null; 담당수수료_합계: number | null };
  const rows = data as unknown as SummaryRow[];
  
  const 제약수수료_합계 = rows.reduce((sum, s) => sum + (Number(s.제약수수료_합계) || 0), 0);
  const 담당수수료_합계 = rows.reduce((sum, s) => sum + (Number(s.담당수수료_합계) || 0), 0);
  
  return {
    총_금액: rows.reduce((sum, s) => sum + (Number(s.금액) || 0), 0),
    총_수수료: 제약수수료_합계,
    제약수수료_합계,
    담당수수료_합계,
    데이터_건수: data.length,
    총_수량: rows.reduce((sum, s) => sum + (Number(s.수량) || 0), 0),
  };
}

/**
 * CSO관리업체명 기반 월별 수수료 합계 조회 (일반 회원용)
 * - 로그인한 회원의 사업자번호로 cso_matching에서 연결된 CSO관리업체명을 찾고
 * - 해당 업체명의 정산 데이터에서 월별 합계 계산
 */
export async function getMonthlySummaryByCSOMatching(
  businessNumber: string
): Promise<{
  months: Array<{
    settlement_month: string;
    summaries: Record<string, number>;
    row_count: number;
  }>;
  summary_columns: ColumnSetting[];
}> {
  // 1. is_summary가 true인 컬럼 조회
  const { data: columnData } = await supabase
    .from('column_settings')
    .select('*')
    .eq('is_summary', true)
    .order('display_order', { ascending: true });
  
  const summaryColumns = (columnData || []) as ColumnSetting[];
  const summaryColumnKeys = summaryColumns.map(c => c.column_key);
  
  if (summaryColumnKeys.length === 0) {
    return { months: [], summary_columns: [] };
  }

  // 2. 매칭된 CSO관리업체명 목록 조회
  const matchedNames = await getMatchedCSOCompanyNames(businessNumber);
  
  if (matchedNames.length === 0) {
    console.log(`No matched CSO names found for business_number: ${businessNumber}`);
    return { months: [], summary_columns: summaryColumns };
  }

  console.log(`Found ${matchedNames.length} matched CSO names for monthly summary:`, matchedNames);

  // 3. 해당 업체명들의 정산 데이터 조회
  const allRows: Array<Record<string, unknown>> = [];
  const pageSize = 1000;
  let page = 0;
  
  // 동적으로 select 컬럼 구성
  const selectColumns = ['정산월', ...summaryColumnKeys].join(', ');
  
  while (true) {
    const { data, error } = await supabase
      .from('settlements')
      .select(selectColumns)
      .in('CSO관리업체', matchedNames)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    allRows.push(...(data as unknown as Array<Record<string, unknown>>));
    if (data.length < pageSize) break;
    page++;
  }

  // 4. 정산월별로 그룹핑하여 합계 계산
  const monthlyData = new Map<string, { summaries: Record<string, number>; count: number }>();
  
  for (const row of allRows) {
    const month = row.정산월 as string;
    if (!month) continue;
    
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { 
        summaries: Object.fromEntries(summaryColumnKeys.map(k => [k, 0])),
        count: 0 
      });
    }
    
    const data = monthlyData.get(month)!;
    data.count++;
    
    for (const key of summaryColumnKeys) {
      const value = Number(row[key]) || 0;
      data.summaries[key] += value;
    }
  }

  // 5. 정산월 기준 내림차순 정렬
  const months = Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      settlement_month: month,
      summaries: data.summaries,
      row_count: data.count,
    }))
    .sort((a, b) => b.settlement_month.localeCompare(a.settlement_month));

  return { months, summary_columns: summaryColumns };
}

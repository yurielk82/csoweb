/**
 * 사용자 계정 일괄 생성 스크립트
 *
 * cso_matching 테이블의 사업자번호로 사용자 계정을 생성합니다.
 * company_name은 cso_company_name(CSO관리업체명)을 매핑합니다.
 *
 * - 비밀번호: 사업자번호 전체 숫자 (예: "1234567890")
 * - 이메일: {사업자번호}@temp.local (첫 로그인 시 실제 이메일 입력 강제)
 * - is_approved: true (즉시 로그인 가능)
 * - must_change_password: true (첫 로그인 시 비밀번호 변경 강제)
 *
 * 사용법:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BATCH_SIZE = 500;
const BCRYPT_ROUNDS = 12;

interface CSORecord {
  business_number: string;
  company_name: string; // cso_company_name 매핑
}

interface UserRecord {
  business_number: string;
  company_name: string;
  email: string;
  password_hash: string;
  is_approved: boolean;
  must_change_password: boolean;
  is_admin: boolean;
  email_verified: boolean;
  ceo_name: string | null;
  zipcode: string | null;
  address1: string | null;
  address2: string | null;
  phone1: string | null;
  phone2: string | null;
  email2: string | null;
  created_at: string;
  updated_at: string;
}

async function collectCSORecords(): Promise<CSORecord[]> {
  console.log('[1/4] cso_matching에서 사업자번호 + 업체명 수집 중...');

  const { data, error } = await supabase
    .from('cso_matching')
    .select('business_number, cso_company_name');

  if (error) {
    console.error('   cso_matching 조회 실패:', error.message);
    return [];
  }

  // business_number 기준 중복 제거 (첫 매핑 우선)
  const map = new Map<string, string>();
  for (const row of data || []) {
    if (row.business_number && !map.has(row.business_number)) {
      map.set(row.business_number, row.cso_company_name || row.business_number);
    }
  }

  const records = Array.from(map.entries()).map(([bn, name]) => ({
    business_number: bn,
    company_name: name,
  }));

  console.log(`   - cso_matching 전체: ${(data || []).length}건`);
  console.log(`   - 고유 사업자번호: ${records.length}건`);

  return records;
}

async function getExistingBusinessNumbers(): Promise<Set<string>> {
  console.log('[2/4] 기존 사용자 조회 중...');

  const { data, error } = await supabase
    .from('users')
    .select('business_number');

  if (error) {
    console.error('   users 조회 실패:', error.message);
    return new Set();
  }

  const existing = new Set((data || []).map(u => u.business_number));
  console.log(`   - 기존 사용자: ${existing.size}명`);
  return existing;
}

async function buildUserRecords(csoRecords: CSORecord[]): Promise<UserRecord[]> {
  console.log('[3/4] 사용자 레코드 생성 중 (bcrypt 해싱)...');

  const now = new Date().toISOString();
  const records: UserRecord[] = [];

  for (let i = 0; i < csoRecords.length; i++) {
    const { business_number: bn, company_name } = csoRecords[i];
    const digits = bn.replace(/\D/g, '');
    const password = digits;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    records.push({
      business_number: bn,
      company_name,
      email: `${digits}@temp.local`,
      password_hash: passwordHash,
      is_approved: true,
      must_change_password: true,
      is_admin: false,
      email_verified: false,
      ceo_name: null,
      zipcode: null,
      address1: null,
      address2: null,
      phone1: null,
      phone2: null,
      email2: null,
      created_at: now,
      updated_at: now,
    });

    if ((i + 1) % 50 === 0 || i === csoRecords.length - 1) {
      console.log(`   - 해싱 진행: ${i + 1}/${csoRecords.length}`);
    }
  }

  return records;
}

async function batchUpsert(records: UserRecord[]): Promise<{ success: number; fail: number }> {
  console.log('[4/4] Supabase에 업로드 중...');

  const totalBatches = Math.ceil(records.length / BATCH_SIZE);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
    const batch = records.slice(i, i + BATCH_SIZE);

    console.log(`   [${batchIndex}/${totalBatches}] ${i + 1}~${Math.min(i + BATCH_SIZE, records.length)}번째 처리 중...`);

    const { error } = await supabase
      .from('users')
      .upsert(batch, {
        onConflict: 'business_number',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`   배치 ${batchIndex} 실패:`, error.message);
      failCount += batch.length;
    } else {
      successCount += batch.length;
    }
  }

  return { success: successCount, fail: failCount };
}

async function main() {
  console.log('========================================');
  console.log('사용자 계정 일괄 생성 (cso_matching 기반)');
  console.log('========================================');

  const startTime = Date.now();

  // 1. cso_matching에서 사업자번호 + 업체명 수집
  const csoRecords = await collectCSORecords();
  if (csoRecords.length === 0) {
    console.log('생성할 사업자번호가 없습니다.');
    process.exit(0);
  }

  // 2. 기존 사용자 제외
  const existing = await getExistingBusinessNumbers();
  const newRecords = csoRecords.filter(r => !existing.has(r.business_number));
  console.log(`   - 신규 생성 대상: ${newRecords.length}건`);

  if (newRecords.length === 0) {
    console.log('\n모든 사업자번호가 이미 등록되어 있습니다.');
    process.exit(0);
  }

  // 3. 레코드 생성 (bcrypt 해싱 포함)
  const userRecords = await buildUserRecords(newRecords);

  // 4. 배치 upsert
  const { success, fail } = await batchUpsert(userRecords);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n========================================');
  console.log('완료');
  console.log('========================================');
  console.log(`대상: ${newRecords.length}건`);
  console.log(`성공: ${success}건`);
  console.log(`실패: ${fail}건`);
  console.log(`소요 시간: ${duration}초`);
  console.log('========================================');
  console.log('\n계정 정보:');
  console.log('  - 아이디: 사업자번호');
  console.log('  - 비밀번호: 사업자번호 전체 (숫자 10자리)');
  console.log('  - 업체명: CSO관리업체명(cso_company_name) 매핑');
  console.log('  - 첫 로그인 시 이메일 입력 + 비밀번호 변경 필요');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('실행 중 오류:', err);
    process.exit(1);
  });

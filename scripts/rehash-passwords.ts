/**
 * 기존 seed 사용자 비밀번호 재해싱 스크립트
 *
 * 비밀번호를 "뒤 5자리" → "사업자번호 전체(10자리)"로 변경합니다.
 * 대상: @temp.local 이메일 + must_change_password=true 사용자
 *
 * 사용법:
 *   npx ts-node --project tsconfig.scripts.json scripts/rehash-passwords.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BCRYPT_ROUNDS = 12;
const BATCH_SIZE = 50;

async function main() {
  console.log('========================================');
  console.log('비밀번호 재해싱 (뒤5자리 → 전체 사업자번호)');
  console.log('========================================');

  const startTime = Date.now();

  // @temp.local + must_change_password=true 사용자 조회
  const { data: users, error } = await supabase
    .from('users')
    .select('business_number, email')
    .like('email', '%@temp.local')
    .eq('must_change_password', true);

  if (error) {
    console.error('조회 실패:', error.message);
    process.exit(1);
  }

  console.log(`대상: ${(users || []).length}건\n`);

  if (!users || users.length === 0) {
    console.log('업데이트 대상이 없습니다.');
    process.exit(0);
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(users.length / BATCH_SIZE);

    console.log(`[${batchNum}/${totalBatches}] ${i + 1}~${Math.min(i + BATCH_SIZE, users.length)} 처리 중...`);

    for (const user of batch) {
      const digits = user.business_number.replace(/\D/g, '');
      const passwordHash = await bcrypt.hash(digits, BCRYPT_ROUNDS);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString(),
        })
        .eq('business_number', user.business_number);

      if (updateError) {
        console.error(`  실패 [${user.business_number}]:`, updateError.message);
        failCount++;
      } else {
        successCount++;
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n========================================');
  console.log('완료');
  console.log('========================================');
  console.log(`성공: ${successCount}건`);
  console.log(`실패: ${failCount}건`);
  console.log(`소요 시간: ${duration}초`);
  console.log('========================================');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('실행 중 오류:', err);
    process.exit(1);
  });

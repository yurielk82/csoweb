/**
 * 병원 마스터 데이터 벌크 업로드 스크립트
 * 
 * 사용법:
 * 1. .env.local에 Supabase 설정이 되어 있어야 함
 * 2. npx ts-node --project tsconfig.scripts.json scripts/upload_hospital_data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// 환경 변수 로드
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CSV 컬럼명 -> DB 컬럼명 매핑
const COLUMN_MAP: Record<string, string> = {
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
  'hosp_url': 'hosp_url',
  'estb_dd': 'estb_dd',
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
  'Xpos': 'xpos',
  'Ypos': 'ypos',
};

// 정수 필드 목록
const INTEGER_FIELDS = [
  'dr_tot_cnt', 'mdept_gdr_cnt', 'mdept_intn_cnt', 'mdept_resdnt_cnt', 'mdept_sdr_cnt',
  'dety_gdr_cnt', 'dety_intn_cnt', 'dety_resdnt_cnt', 'dety_sdr_cnt',
  'cmdc_gdr_cnt', 'cmdc_intn_cnt', 'cmdc_resdnt_cnt', 'cmdc_sdr_cnt', 'midwife_cnt'
];

// 숫자 필드 목록 (좌표)
const NUMERIC_FIELDS = ['xpos', 'ypos'];

interface HospitalRecord {
  [key: string]: string | number | null;
}

function transformRow(row: Record<string, string>): HospitalRecord {
  const result: HospitalRecord = {};
  
  for (const [csvCol, dbCol] of Object.entries(COLUMN_MAP)) {
    let value: string | number | null = row[csvCol] ?? null;
    
    if (value === '' || value === null) {
      // 정수/숫자 필드는 null 대신 기본값
      if (INTEGER_FIELDS.includes(dbCol)) {
        value = 0;
      } else if (NUMERIC_FIELDS.includes(dbCol)) {
        value = null;
      } else {
        value = null;
      }
    } else if (INTEGER_FIELDS.includes(dbCol)) {
      value = parseInt(value as string, 10) || 0;
    } else if (NUMERIC_FIELDS.includes(dbCol)) {
      value = parseFloat(value as string) || null;
    }
    
    result[dbCol] = value;
  }
  
  // 동기화 시점 추가
  result['last_synced_at'] = new Date().toISOString();
  
  return result;
}

async function uploadData(csvPath: string) {
  console.log('========================================');
  console.log('병원 마스터 데이터 업로드 시작');
  console.log('========================================');
  
  const startTime = Date.now();
  
  // CSV 파일 읽기
  console.log(`\n[1/4] CSV 파일 로딩: ${csvPath}`);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  
  // CSV 파싱 (1행: 영문 헤더, 2행: 한글 헤더 - 2행 스킵)
  console.log('[2/4] CSV 파싱 중...');
  const allRows = parse(fileContent, {
    columns: true,  // 첫 번째 행을 헤더로 사용
    skip_empty_lines: true,
    relax_column_count: true,
  });
  
  // 2행 (한글 헤더) 스킵 - 첫 번째 데이터 행의 ykiho가 한글이면 스킵
  const records: Record<string, string>[] = (allRows as Record<string, string>[]).filter((row) => {
    // 한글 헤더 행 스킵 (암호화요양기호가 한글이면 스킵)
    return row.ykiho && !row.ykiho.includes('암호화');
  });
  
  console.log(`   - 총 ${records.length}건 데이터 감지됨`);
  
  // 데이터 변환
  console.log('[3/4] 데이터 변환 중...');
  const transformedData = records.map(transformRow);
  
  // Chunking 업로드
  console.log('[4/4] Supabase에 업로드 중...');
  const CHUNK_SIZE = 1000;
  const totalChunks = Math.ceil(transformedData.length / CHUNK_SIZE);
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < transformedData.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
    const chunk = transformedData.slice(i, i + CHUNK_SIZE);
    
    console.log(`   현재 [${chunkIndex}/${totalChunks}] 청크 처리 중... (${i + 1} ~ ${Math.min(i + CHUNK_SIZE, transformedData.length)}번째 데이터)`);
    
    const { data, error } = await supabase
      .from('hospital_master')
      .upsert(chunk, { 
        onConflict: 'ykiho',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`   ❌ 청크 ${chunkIndex} 실패:`, error.message);
      errorCount += chunk.length;
    } else {
      successCount += chunk.length;
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n========================================');
  console.log('업로드 완료!');
  console.log('========================================');
  console.log(`✅ 성공: ${successCount.toLocaleString()}건`);
  console.log(`❌ 실패: ${errorCount.toLocaleString()}건`);
  console.log(`⏱️ 소요 시간: ${duration}초`);
  console.log('========================================');
  
  return { successCount, errorCount, duration };
}

// 실행
const csvPath = process.argv[2] || '/home/user/uploaded_files/hospitals_20251231.csv';

if (!fs.existsSync(csvPath)) {
  console.error(`Error: CSV 파일을 찾을 수 없습니다: ${csvPath}`);
  process.exit(1);
}

uploadData(csvPath)
  .then((result) => {
    console.log('\n완료:', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('업로드 중 오류 발생:', err);
    process.exit(1);
  });

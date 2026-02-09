/**
 * Supabase Edge Function: 공공데이터 병원정보 동기화
 * 
 * 기능:
 * - 건강보험심사평가원 병원정보서비스 API에서 전체 데이터 수집
 * - hospital_master 테이블에 upsert
 * - pg_cron으로 매일 새벽 자동 실행
 * 
 * 특징:
 * - 페이지네이션으로 전수 조사 (약 8만건)
 * - 배치 처리로 메모리 효율화
 * - Rate Limit 및 타임아웃 방어
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  API_ENDPOINT,
  API_SERVICE_KEY,
  API_CONFIG,
  SERVICES,
  FIELD_MAPPING,
  INTEGER_FIELDS,
  NUMERIC_FIELDS,
} from './constants.ts';

// Supabase 클라이언트 초기화
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// XML 파싱 유틸리티
// ============================================

/**
 * 간단한 XML 파싱 (태그 값 추출)
 */
function extractXmlValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * XML에서 item 목록 추출
 */
function extractItems(xml: string): string[] {
  const items: string[] = [];
  const regex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

/**
 * XML item을 DB 레코드로 변환
 */
function parseItemToRecord(itemXml: string): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  
  for (const [xmlField, dbField] of Object.entries(FIELD_MAPPING)) {
    let value: unknown = extractXmlValue(itemXml, xmlField);
    
    if (value === null || value === '') {
      if (INTEGER_FIELDS.includes(dbField)) {
        value = 0;
      } else if (NUMERIC_FIELDS.includes(dbField)) {
        value = null;
      } else {
        value = null;
      }
    } else if (INTEGER_FIELDS.includes(dbField)) {
      value = parseInt(value as string, 10) || 0;
    } else if (NUMERIC_FIELDS.includes(dbField)) {
      value = parseFloat(value as string) || null;
    }
    
    record[dbField] = value;
  }
  
  // 동기화 시점 추가
  record['last_synced_at'] = new Date().toISOString();
  
  return record;
}

// ============================================
// API 호출 함수
// ============================================

/**
 * 인증키 인코딩 (특수문자 처리)
 */
function encodeServiceKey(key: string): string {
  // 이미 인코딩된 경우 그대로 사용
  if (key.includes('%')) {
    return key;
  }
  // 디코딩된 키는 인코딩
  return encodeURIComponent(key);
}

/**
 * API 호출 (재시도 로직 포함)
 */
async function fetchPage(pageNo: number): Promise<{ items: Record<string, unknown>[]; totalCount: number }> {
  const encodedKey = encodeServiceKey(API_SERVICE_KEY);
  const url = `${API_ENDPOINT}/${SERVICES.getHospBasisList}?serviceKey=${encodedKey}&numOfRows=${API_CONFIG.numOfRows}&pageNo=${pageNo}`;
  
  let lastError: Error | null = null;
  
  for (let retry = 0; retry < API_CONFIG.maxRetries; retry++) {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const xml = await response.text();
      
      // 에러 응답 체크
      const resultCode = extractXmlValue(xml, 'resultCode');
      if (resultCode && resultCode !== '00') {
        const resultMsg = extractXmlValue(xml, 'resultMsg') || 'Unknown error';
        throw new Error(`API Error [${resultCode}]: ${resultMsg}`);
      }
      
      // 전체 건수 추출
      const totalCountStr = extractXmlValue(xml, 'totalCount');
      const totalCount = totalCountStr ? parseInt(totalCountStr, 10) : 0;
      
      // 아이템 추출 및 파싱
      const itemsXml = extractItems(xml);
      const items = itemsXml.map(parseItemToRecord);
      
      return { items, totalCount };
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Page ${pageNo} fetch failed (attempt ${retry + 1}/${API_CONFIG.maxRetries}):`, error);
      
      if (retry < API_CONFIG.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
      }
    }
  }
  
  throw lastError || new Error('Unknown fetch error');
}

/**
 * 딜레이 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// DB 저장 함수
// ============================================

/**
 * 배치 upsert
 */
async function upsertBatch(records: Record<string, unknown>[]): Promise<number> {
  if (records.length === 0) return 0;
  
  const { error } = await supabase
    .from('hospital_master')
    .upsert(records, { 
      onConflict: 'ykiho',
      ignoreDuplicates: false 
    });
  
  if (error) {
    console.error('Upsert error:', error);
    throw error;
  }
  
  return records.length;
}

// ============================================
// 메인 동기화 로직
// ============================================

async function syncHospitals(): Promise<{ success: boolean; message: string; stats: Record<string, number> }> {
  const startTime = Date.now();
  const stats = {
    totalPages: 0,
    totalFetched: 0,
    totalUpserted: 0,
    errors: 0,
  };
  
  console.log('========================================');
  console.log('병원 정보 동기화 시작:', new Date().toISOString());
  console.log('========================================');
  
  try {
    // 첫 페이지로 전체 건수 확인
    console.log('1단계: 전체 건수 확인 중...');
    const firstPage = await fetchPage(1);
    const totalCount = firstPage.totalCount;
    const totalPages = Math.ceil(totalCount / API_CONFIG.numOfRows);
    
    console.log(`   - 전체 데이터: ${totalCount.toLocaleString()}건`);
    console.log(`   - 총 페이지: ${totalPages}페이지`);
    stats.totalPages = totalPages;
    
    // 첫 페이지 데이터 저장
    let buffer: Record<string, unknown>[] = [...firstPage.items];
    stats.totalFetched += firstPage.items.length;
    
    // 2페이지부터 순차 처리
    console.log('\n2단계: 데이터 수집 및 저장 중...');
    
    for (let pageNo = 2; pageNo <= totalPages; pageNo++) {
      try {
        // API 호출
        const { items } = await fetchPage(pageNo);
        buffer.push(...items);
        stats.totalFetched += items.length;
        
        // 배치 크기 도달 시 DB 저장
        if (buffer.length >= API_CONFIG.batchSize) {
          const toUpsert = buffer.splice(0, API_CONFIG.batchSize);
          const upserted = await upsertBatch(toUpsert);
          stats.totalUpserted += upserted;
          console.log(`   [${pageNo}/${totalPages}] 페이지 처리 완료 - 누적: ${stats.totalUpserted.toLocaleString()}건`);
        }
        
        // Rate Limit 방어
        await delay(API_CONFIG.requestDelay);
        
      } catch (error) {
        console.error(`   [${pageNo}/${totalPages}] 페이지 처리 실패:`, error);
        stats.errors++;
        // 에러 발생해도 계속 진행
        await delay(API_CONFIG.retryDelay);
      }
    }
    
    // 남은 버퍼 저장
    if (buffer.length > 0) {
      const upserted = await upsertBatch(buffer);
      stats.totalUpserted += upserted;
      console.log(`   마지막 배치 저장 완료 - 총: ${stats.totalUpserted.toLocaleString()}건`);
    }
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    
    console.log('\n========================================');
    console.log('동기화 완료!');
    console.log('========================================');
    console.log(`✅ 수집: ${stats.totalFetched.toLocaleString()}건`);
    console.log(`✅ 저장: ${stats.totalUpserted.toLocaleString()}건`);
    console.log(`❌ 오류: ${stats.errors}건`);
    console.log(`⏱️ 소요시간: ${duration}분`);
    
    return {
      success: true,
      message: `동기화 완료: ${stats.totalUpserted.toLocaleString()}건 저장 (${duration}분 소요)`,
      stats,
    };
    
  } catch (error) {
    console.error('동기화 실패:', error);
    return {
      success: false,
      message: `동기화 실패: ${(error as Error).message}`,
      stats,
    };
  }
}

// ============================================
// Edge Function 핸들러
// ============================================

serve(async (req: Request) => {
  // CORS 헤더
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }
  
  // 인증 확인 (선택적 - 내부 호출 시에도 보안을 위해)
  const authHeader = req.headers.get('Authorization');
  const expectedToken = Deno.env.get('SYNC_SECRET_TOKEN');
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    // 내부 pg_cron 호출 시에는 토큰 없이도 허용
    const isCronCall = req.headers.get('X-Cron-Job') === 'true';
    if (!isCronCall && authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers }
      );
    }
  }
  
  // 동기화 실행
  const result = await syncHospitals();
  
  return new Response(
    JSON.stringify(result),
    { 
      status: result.success ? 200 : 500, 
      headers 
    }
  );
});

-- =====================================================
-- 병원 정보 자동 동기화 크론 설정
-- Supabase pg_cron + pg_net을 이용한 Edge Function 자동 호출
-- =====================================================

-- =====================================================
-- 1단계: 확장 기능 활성화
-- =====================================================

-- pg_cron 활성화 (스케줄러)
-- Supabase 대시보드 > Database > Extensions 에서 활성화 필요
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- pg_net 활성화 (HTTP 요청)
-- Supabase 대시보드 > Database > Extensions 에서 활성화 필요
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- cron 스키마에 대한 권한 부여
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- =====================================================
-- 2단계: 동기화 로그 테이블 생성
-- =====================================================

CREATE TABLE IF NOT EXISTS hospital_sync_logs (
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'running', -- running, success, failed
    total_fetched INTEGER DEFAULT 0,
    total_upserted INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    error_message TEXT,
    duration_seconds NUMERIC(10, 2)
);

COMMENT ON TABLE hospital_sync_logs IS '병원 정보 동기화 실행 로그';

-- =====================================================
-- 3단계: 크론 작업 등록 (매일 새벽 4시 KST = UTC 19:00)
-- =====================================================

-- 기존 작업이 있으면 삭제
SELECT cron.unschedule('sync-hospitals-daily') 
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-hospitals-daily'
);

-- 새 크론 작업 등록
-- KST 04:00 = UTC 19:00 (전날)
-- cron 표현식: 분 시 일 월 요일
-- '0 19 * * *' = 매일 UTC 19:00 (KST 04:00)
SELECT cron.schedule(
    'sync-hospitals-daily',  -- 작업 이름
    '0 19 * * *',            -- 매일 UTC 19:00 (KST 04:00)
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-hospitals',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
            'X-Cron-Job', 'true'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- =====================================================
-- 4단계: 대안 - 직접 URL 지정 방식 (설정 변수 미사용)
-- =====================================================
-- 위 방식이 작동하지 않을 경우 아래를 사용

/*
-- 기존 작업 삭제
SELECT cron.unschedule('sync-hospitals-daily');

-- 직접 URL 지정 (YOUR_PROJECT_REF를 실제 값으로 교체)
SELECT cron.schedule(
    'sync-hospitals-daily',
    '0 19 * * *',
    $$
    SELECT net.http_post(
        url := 'https://hvnncluumfrkbjbwrdvk.supabase.co/functions/v1/sync-hospitals',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bm5jbHV1bWZya2JqYndyZHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU4MzMzNiwiZXhwIjoyMDg1MTU5MzM2fQ.9ChuplIZa-JykJfGRNhizImScEs460l1KfbpXp5Fbmc',
            'X-Cron-Job', 'true'
        ),
        body := '{}'::jsonb
    );
    $$
);
*/

-- =====================================================
-- 5단계: 크론 작업 확인 쿼리
-- =====================================================

-- 등록된 크론 작업 목록 확인
-- SELECT * FROM cron.job;

-- 크론 실행 이력 확인
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- =====================================================
-- 6단계: 수동 실행 함수 (테스트용)
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_hospital_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    -- 로그 시작
    INSERT INTO hospital_sync_logs (status) VALUES ('running');
    
    -- Edge Function 호출
    SELECT net.http_post(
        url := 'https://hvnncluumfrkbjbwrdvk.supabase.co/functions/v1/sync-hospitals',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bm5jbHV1bWZya2JqYndyZHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU4MzMzNiwiZXhwIjoyMDg1MTU5MzM2fQ.9ChuplIZa-JykJfGRNhizImScEs460l1KfbpXp5Fbmc'
        ),
        body := '{}'::jsonb
    ) INTO result;
    
    RETURN result;
END;
$$;

COMMENT ON FUNCTION trigger_hospital_sync IS '병원 정보 동기화 수동 트리거 (테스트용)';

-- =====================================================
-- 7단계: 동기화 상태 확인 뷰
-- =====================================================

CREATE OR REPLACE VIEW hospital_sync_status AS
SELECT 
    (SELECT COUNT(*) FROM hospital_master) as total_hospitals,
    (SELECT MAX(last_synced_at) FROM hospital_master) as last_sync_time,
    (SELECT COUNT(*) FROM hospital_master WHERE last_synced_at > NOW() - INTERVAL '1 day') as synced_today,
    (SELECT status FROM hospital_sync_logs ORDER BY started_at DESC LIMIT 1) as last_job_status,
    (SELECT started_at FROM hospital_sync_logs ORDER BY started_at DESC LIMIT 1) as last_job_time;

COMMENT ON VIEW hospital_sync_status IS '병원 정보 동기화 상태 요약';

-- Fix: Auth RLS Initialization Plan performance warning
-- Replace auth.<function>() with (select auth.<function>()) to prevent per-row re-evaluation
-- Affected tables: company_settings, hospital_master, hospital_sync_logs, password_reset_tokens
-- Applied: 2026-02-18

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'company_settings',
    'hospital_master',
    'hospital_sync_logs',
    'password_reset_tokens'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Service role full access" ON public.%I', t
    );
    EXECUTE format(
      'CREATE POLICY "Service role full access" ON public.%I
       USING ((select auth.role()) = ''service_role'')',
      t
    );
  END LOOP;
END $$;

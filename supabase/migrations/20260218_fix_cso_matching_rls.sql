-- Fix: cso_matching table has RLS enabled but no policies exist
-- All app queries use service_role key, so add service_role full access policy
-- Uses (select auth.role()) pattern for performance (prevents per-row re-evaluation)

CREATE POLICY "Service role full access" ON public.cso_matching
  USING ((select auth.role()) = 'service_role')
  WITH CHECK ((select auth.role()) = 'service_role');

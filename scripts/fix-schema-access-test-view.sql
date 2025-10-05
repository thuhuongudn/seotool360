-- ============================================
-- FIX SCHEMA ACCESS TEST VIEW
-- ============================================
-- The original view runs with definer privileges (postgres)
-- This creates a SECURITY INVOKER view that runs with caller privileges
-- ============================================

-- Drop old view
DROP VIEW IF EXISTS public.schema_access_test;

-- Create new view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.schema_access_test
WITH (security_invoker = true)
AS
SELECT
  current_user as current_role,
  session_user as session_role,
  -- This will return 0 for anon/authenticated if schema is blocked
  (
    SELECT count(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
  ) as visible_tables,
  NOW() as tested_at;

-- Grant access
GRANT SELECT ON public.schema_access_test TO authenticated, anon;

-- Verify
DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '=== Testing with SECURITY INVOKER ===';

  SELECT * INTO test_result FROM public.schema_access_test;

  RAISE NOTICE 'Current role: %', test_result.current_role;
  RAISE NOTICE 'Visible tables: %', test_result.visible_tables;

  IF test_result.visible_tables = 0 THEN
    RAISE NOTICE '✅ View correctly shows 0 tables (blocked)';
  ELSE
    RAISE NOTICE '⚠️ View shows % tables (you are admin)', test_result.visible_tables;
  END IF;
END $$;

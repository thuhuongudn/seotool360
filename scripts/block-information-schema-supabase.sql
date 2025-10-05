-- ============================================
-- BLOCK INFORMATION_SCHEMA ACCESS (Supabase Compatible)
-- ============================================
-- Optimized for Supabase managed environment
-- Prevents schema introspection from anon/authenticated users
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================

-- Step 1: Revoke information_schema access
-- Note: In Supabase, you may not have full REVOKE privileges
-- This will work for most cases
DO $$
BEGIN
  -- Try to revoke information_schema access
  BEGIN
    EXECUTE 'REVOKE SELECT ON ALL TABLES IN SCHEMA information_schema FROM anon, authenticated';
    RAISE NOTICE '✅ Revoked SELECT on information_schema tables';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not revoke SELECT: %', SQLERRM;
  END;

  -- Try to revoke schema usage
  BEGIN
    EXECUTE 'REVOKE USAGE ON SCHEMA information_schema FROM anon, authenticated';
    RAISE NOTICE '✅ Revoked USAGE on information_schema';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not revoke USAGE: %', SQLERRM;
  END;
END $$;

-- Step 2: Revoke pg_catalog access
DO $$
BEGIN
  BEGIN
    EXECUTE 'REVOKE SELECT ON ALL TABLES IN SCHEMA pg_catalog FROM anon, authenticated';
    RAISE NOTICE '✅ Revoked SELECT on pg_catalog tables';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not revoke pg_catalog SELECT: %', SQLERRM;
  END;

  BEGIN
    EXECUTE 'REVOKE USAGE ON SCHEMA pg_catalog FROM anon, authenticated';
    RAISE NOTICE '✅ Revoked USAGE on pg_catalog';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not revoke pg_catalog USAGE: %', SQLERRM;
  END;
END $$;

-- Step 3: Create security view to test schema visibility
CREATE OR REPLACE VIEW public.schema_access_test AS
SELECT
  current_user as current_role,
  session_user as session_role,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as visible_tables,
  NOW() as tested_at;

-- Allow authenticated users to test their access level
GRANT SELECT ON public.schema_access_test TO authenticated, anon;

-- Step 4: Verification query
DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '=== Schema Access Verification ===';

  -- Test as current user
  SELECT * INTO test_result FROM public.schema_access_test;

  RAISE NOTICE 'Current role: %', test_result.current_role;
  RAISE NOTICE 'Visible tables: %', test_result.visible_tables;

  IF test_result.visible_tables = 0 THEN
    RAISE NOTICE '✅ SUCCESS: Schema is blocked for current user!';
  ELSE
    RAISE WARNING '⚠️ Current user can still see % tables', test_result.visible_tables;
  END IF;
END $$;

-- ============================================
-- TESTING INSTRUCTIONS
-- ============================================
-- After running this script, test from client:
--
-- const { data, error } = await supabase
--   .from('schema_access_test')
--   .select('*')
--   .single();
--
-- Expected result:
-- - visible_tables should be 0 for anon/authenticated
-- - visible_tables > 0 for service_role (admin)
-- ============================================

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- GRANT USAGE ON SCHEMA information_schema TO authenticated;
-- GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO authenticated;
-- DROP VIEW IF EXISTS public.schema_access_test;
-- ============================================

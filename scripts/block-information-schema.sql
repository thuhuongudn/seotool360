-- ============================================
-- BLOCK INFORMATION_SCHEMA ACCESS
-- ============================================
-- This script prevents schema introspection from non-admin users
-- Blocks access to information_schema and pg_catalog system tables
--
-- WARNING: This will prevent client-side schema inspection
-- Only service_role and postgres user can access schema info
--
-- Run this in Supabase SQL Editor with caution!
-- ============================================

-- Revoke information_schema access from public roles
REVOKE SELECT ON ALL TABLES IN SCHEMA information_schema FROM anon, authenticated;
REVOKE USAGE ON SCHEMA information_schema FROM anon, authenticated;

-- Revoke pg_catalog access from public roles
REVOKE SELECT ON ALL TABLES IN SCHEMA pg_catalog FROM anon, authenticated;
REVOKE USAGE ON SCHEMA pg_catalog FROM anon, authenticated;

-- Create logging function for schema access attempts
CREATE OR REPLACE FUNCTION log_schema_introspection_attempt()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log attempts to access information_schema
  IF TG_TAG = 'SELECT' THEN
    INSERT INTO admin_audit_log (
      user_id,
      action,
      details,
      created_at
    ) VALUES (
      COALESCE(auth.uid()::text, 'anonymous'),
      'SCHEMA_INTROSPECTION_ATTEMPT',
      jsonb_build_object(
        'schema', current_schema(),
        'command', TG_TAG,
        'timestamp', NOW()
      ),
      NOW()
    );
  END IF;
END;
$$;

-- Note: Event triggers require superuser privileges
-- This may not work in Supabase's managed environment
-- Comment: Create event trigger for schema access monitoring
-- CREATE EVENT TRIGGER log_schema_access
-- ON ddl_command_end
-- EXECUTE FUNCTION log_schema_introspection_attempt();

-- Verify current permissions
DO $$
DECLARE
  anon_has_access BOOLEAN;
  auth_has_access BOOLEAN;
BEGIN
  -- Check if anon role has access to information_schema
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_privileges
    WHERE grantee = 'anon'
    AND table_schema = 'information_schema'
  ) INTO anon_has_access;

  -- Check if authenticated role has access
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_privileges
    WHERE grantee = 'authenticated'
    AND table_schema = 'information_schema'
  ) INTO auth_has_access;

  RAISE NOTICE '=== Information Schema Access Status ===';
  RAISE NOTICE 'anon role has access: %', anon_has_access;
  RAISE NOTICE 'authenticated role has access: %', auth_has_access;

  IF NOT anon_has_access AND NOT auth_has_access THEN
    RAISE NOTICE '✅ SUCCESS: Schema introspection blocked!';
  ELSE
    RAISE WARNING '⚠️ WARNING: Some roles still have schema access!';
  END IF;
END $$;

-- ============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================
-- To restore access (for debugging):
--
-- GRANT USAGE ON SCHEMA information_schema TO authenticated;
-- GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO authenticated;
--
-- WARNING: This will re-expose your database schema!
-- ============================================

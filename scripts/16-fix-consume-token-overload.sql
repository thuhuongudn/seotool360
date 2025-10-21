-- ============================================
-- MIGRATION 16: Fix consume_token Function Overload
-- ============================================
-- This migration removes the old 2-parameter version of consume_token
-- to resolve PostgREST function overloading conflict (PGRST203).
--
-- Issue: Two versions existed:
-- 1. consume_token(p_user_id text, p_tokens_to_consume integer) - OLD
-- 2. consume_token(p_user_id text, p_tool_id uuid, p_tokens_to_consume integer) - CURRENT
--
-- PostgREST cannot disambiguate between these two, causing RPC calls to fail.

-- ============================================
-- DROP ALL OLD VERSIONS
-- ============================================

DO $$
DECLARE
    func_count integer;
BEGIN
    RAISE NOTICE 'Checking for existing consume_token functions...';

    -- Count all versions
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname = 'consume_token';

    RAISE NOTICE 'Found % consume_token function(s)', func_count;

    -- List all existing versions before dropping
    IF func_count > 0 THEN
        RAISE NOTICE 'Existing versions:';
        FOR func_count IN
            SELECT oid::regprocedure::text
            FROM pg_proc
            WHERE proname = 'consume_token'
        LOOP
            RAISE NOTICE '  - %', func_count;
        END LOOP;
    END IF;

    -- Drop ALL possible versions
    RAISE NOTICE '';
    RAISE NOTICE 'Dropping all consume_token function versions...';

    -- 2-parameter version
    DROP FUNCTION IF EXISTS public.consume_token(text, integer);
    RAISE NOTICE '  ✓ Dropped: consume_token(text, integer)';

    -- 3-parameter version with VARCHAR
    DROP FUNCTION IF EXISTS public.consume_token(text, character varying, integer);
    RAISE NOTICE '  ✓ Dropped: consume_token(text, character varying, integer)';

    -- 3-parameter version with UUID (we'll recreate this)
    DROP FUNCTION IF EXISTS public.consume_token(text, uuid, integer);
    RAISE NOTICE '  ✓ Dropped: consume_token(text, uuid, integer)';

    RAISE NOTICE '';
    RAISE NOTICE 'All old versions removed. Ready to create the correct version.';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    function_count integer;
    function_signature text;
BEGIN
    -- Count consume_token functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname = 'consume_token';

    IF function_count = 0 THEN
        RAISE WARNING '❌ No consume_token function found!';
    ELSIF function_count = 1 THEN
        -- Get the signature of the remaining function
        SELECT pg_get_function_identity_arguments(oid) INTO function_signature
        FROM pg_proc
        WHERE proname = 'consume_token';

        RAISE NOTICE '';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'MIGRATION 16 VERIFICATION';
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ Only ONE consume_token function exists';
        RAISE NOTICE 'Signature: consume_token(%)', function_signature;
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING '❌ Multiple consume_token functions still exist (count: %). PostgREST may still have issues.', function_count;

        -- List all versions
        RAISE NOTICE 'Existing consume_token functions:';
        FOR function_signature IN
            SELECT pg_get_function_identity_arguments(oid)
            FROM pg_proc
            WHERE proname = 'consume_token'
        LOOP
            RAISE NOTICE '  - consume_token(%)', function_signature;
        END LOOP;
    END IF;
END $$;

-- ============================================
-- GRANT PERMISSIONS (if needed)
-- ============================================

-- Ensure the remaining function has proper permissions
GRANT EXECUTE ON FUNCTION public.consume_token(text, uuid, integer) TO authenticated;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'NEXT STEPS';
RAISE NOTICE '========================================';
RAISE NOTICE '1. Test the function by calling from your app';
RAISE NOTICE '2. Verify no PGRST203 errors occur';
RAISE NOTICE '3. If errors persist, check:';
RAISE NOTICE '   - Run: SELECT * FROM pg_proc WHERE proname = ''consume_token'';';
RAISE NOTICE '   - Ensure only ONE function exists';
RAISE NOTICE '========================================';

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
-- DROP OLD 2-PARAMETER VERSION
-- ============================================

DO $$
BEGIN
    -- Check if the old 2-parameter version exists
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'consume_token'
        AND pronargs = 2
        AND pg_get_function_identity_arguments(oid) = 'p_user_id text, p_tokens_to_consume integer'
    ) THEN
        DROP FUNCTION public.consume_token(text, integer);
        RAISE NOTICE 'Dropped old 2-parameter consume_token function';
    ELSE
        RAISE NOTICE 'Old 2-parameter consume_token function not found (already removed)';
    END IF;

    -- Verify only the 3-parameter version remains
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'consume_token'
        AND pronargs = 3
    ) THEN
        RAISE NOTICE '✓ 3-parameter consume_token function exists (correct version)';
    ELSE
        RAISE WARNING '⚠ 3-parameter consume_token function NOT found! You may need to run 11-update-consume-token-with-logging.sql';
    END IF;
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

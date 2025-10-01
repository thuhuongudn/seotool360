-- ============================================
-- CHECK TOKEN_USAGE_LOGS TABLE STATUS
-- ============================================
-- Run this to check if token_usage_logs table exists in Supabase

DO $$
DECLARE
    v_table_exists boolean;
    v_column_count integer;
    v_index_count integer;
    v_function_count integer;
    v_rls_enabled boolean;
    v_policy_count integer;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECKING TOKEN_USAGE_LOGS TABLE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- 1. Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'token_usage_logs'
    ) INTO v_table_exists;

    RAISE NOTICE '1. TABLE EXISTS: %', v_table_exists;

    IF NOT v_table_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '❌ token_usage_logs table does NOT exist!';
        RAISE NOTICE '';
        RAISE NOTICE 'ACTION REQUIRED:';
        RAISE NOTICE '  Run: scripts/RUN_ALL_TOKEN_LOGS_MIGRATIONS_FIXED.sql';
        RAISE NOTICE '';
        RETURN;
    END IF;

    -- 2. Check columns
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'token_usage_logs';

    RAISE NOTICE '2. COLUMNS: % columns found', v_column_count;

    -- List columns
    RAISE NOTICE '';
    RAISE NOTICE '   Column details:';
    FOR v_column_count IN
        SELECT column_name || ' (' || data_type || ')' as col
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'token_usage_logs'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '     • %', v_column_count;
    END LOOP;

    -- 3. Check indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'token_usage_logs';

    RAISE NOTICE '';
    RAISE NOTICE '3. INDEXES: % indexes found', v_index_count;

    -- 4. Check functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_token_usage_logs',
        'get_token_usage_stats',
        'cleanup_token_usage_logs'
    );

    RAISE NOTICE '4. FUNCTIONS: % / 3 required functions found', v_function_count;

    -- List functions
    IF v_function_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '   Functions found:';
        FOR v_function_count IN
            SELECT p.proname as func_name
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname IN (
                'get_token_usage_logs',
                'get_token_usage_stats',
                'cleanup_token_usage_logs'
            )
        LOOP
            RAISE NOTICE '     • %', v_function_count;
        END LOOP;
    END IF;

    -- 5. Check RLS
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE oid = 'public.token_usage_logs'::regclass;

    RAISE NOTICE '';
    RAISE NOTICE '5. RLS ENABLED: %', v_rls_enabled;

    -- 6. Check policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'token_usage_logs';

    RAISE NOTICE '6. RLS POLICIES: % policies found', v_policy_count;

    -- 7. Check record count
    EXECUTE 'SELECT COUNT(*) FROM public.token_usage_logs' INTO v_column_count;

    RAISE NOTICE '';
    RAISE NOTICE '7. RECORDS: % log records in table', v_column_count;

    -- 8. Summary
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY';
    RAISE NOTICE '========================================';

    IF v_table_exists AND v_function_count >= 2 THEN
        RAISE NOTICE '✅ token_usage_logs table is set up correctly';
        RAISE NOTICE '';
        RAISE NOTICE 'Next: Check why /admin/token-logs returns 403';
        RAISE NOTICE '  1. Check server logs';
        RAISE NOTICE '  2. Verify user is admin in profiles table';
        RAISE NOTICE '  3. Run: SELECT * FROM profiles WHERE role = ''admin'';';
    ELSE
        RAISE NOTICE '❌ Setup incomplete';
        RAISE NOTICE '';
        RAISE NOTICE 'Missing:';
        IF NOT v_table_exists THEN
            RAISE NOTICE '  • token_usage_logs table';
        END IF;
        IF v_function_count < 2 THEN
            RAISE NOTICE '  • % required functions', 3 - v_function_count;
        END IF;
    END IF;

    RAISE NOTICE '';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE '';
END $$;

-- Check admin users
SELECT
    user_id,
    username,
    role,
    status,
    plan
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at DESC
LIMIT 5;

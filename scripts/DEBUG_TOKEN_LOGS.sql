-- ============================================
-- DEBUG TOKEN USAGE LOGS SYSTEM
-- ============================================

-- 1. Check if table exists and structure
SELECT
    'TABLE EXISTS' as check_type,
    EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'token_usage_logs'
    ) as result;

-- 2. Check columns
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'token_usage_logs'
ORDER BY ordinal_position;

-- 3. Check indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'token_usage_logs';

-- 4. Check if consume_token function signature is correct
SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'consume_token';

-- 5. Count records in token_usage_logs
SELECT
    COUNT(*) as total_logs,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT tool_id) as unique_tools,
    MIN(created_at) as oldest_log,
    MAX(created_at) as newest_log
FROM public.token_usage_logs;

-- 6. Show recent logs (if any)
SELECT
    l.id,
    l.user_id,
    p.username,
    l.tool_id,
    t.name as tool_name,
    l.consumed,
    l.created_at
FROM public.token_usage_logs l
LEFT JOIN public.profiles p ON p.user_id = l.user_id
LEFT JOIN public.seo_tools t ON t.id = l.tool_id
ORDER BY l.created_at DESC
LIMIT 10;

-- 7. Check consume_token function source to see if it has INSERT statement
SELECT
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'consume_token'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 1;

-- 8. Manual test: Try to insert a log manually
DO $$
DECLARE
    v_test_user_id text;
    v_test_tool_id character varying;
BEGIN
    -- Get first active user
    SELECT user_id INTO v_test_user_id
    FROM public.profiles
    WHERE status = 'active'
    LIMIT 1;

    -- Get first tool
    SELECT id INTO v_test_tool_id
    FROM public.seo_tools
    LIMIT 1;

    IF v_test_user_id IS NOT NULL AND v_test_tool_id IS NOT NULL THEN
        -- Try manual insert
        BEGIN
            INSERT INTO public.token_usage_logs (user_id, tool_id, consumed)
            VALUES (v_test_user_id, v_test_tool_id, 999);

            RAISE NOTICE '✅ Manual INSERT successful!';
            RAISE NOTICE 'Test user: %', v_test_user_id;
            RAISE NOTICE 'Test tool: %', v_test_tool_id;

            -- Delete test record
            DELETE FROM public.token_usage_logs
            WHERE user_id = v_test_user_id
            AND tool_id = v_test_tool_id
            AND consumed = 999;

            RAISE NOTICE '✅ Test record deleted';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Manual INSERT failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️  No test data available (user: %, tool: %)', v_test_user_id, v_test_tool_id;
    END IF;
END $$;

-- 9. Test consume_token function directly
DO $$
DECLARE
    v_test_user_id text;
    v_test_tool_id character varying;
    v_result json;
    v_log_count_before integer;
    v_log_count_after integer;
BEGIN
    -- Get test data
    SELECT user_id INTO v_test_user_id
    FROM public.profiles
    WHERE status = 'active'
    LIMIT 1;

    SELECT id INTO v_test_tool_id
    FROM public.seo_tools
    LIMIT 1;

    IF v_test_user_id IS NULL OR v_test_tool_id IS NULL THEN
        RAISE NOTICE '⚠️  Cannot test: no active user or tool found';
        RETURN;
    END IF;

    -- Count logs before
    SELECT COUNT(*) INTO v_log_count_before
    FROM public.token_usage_logs
    WHERE user_id = v_test_user_id;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TESTING consume_token() FUNCTION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User: %', v_test_user_id;
    RAISE NOTICE 'Tool: %', v_test_tool_id;
    RAISE NOTICE 'Logs before: %', v_log_count_before;
    RAISE NOTICE '';

    -- Call consume_token
    BEGIN
        SELECT public.consume_token(v_test_user_id, v_test_tool_id, 1)
        INTO v_result;

        RAISE NOTICE 'Result: %', v_result::text;

        -- Count logs after
        SELECT COUNT(*) INTO v_log_count_after
        FROM public.token_usage_logs
        WHERE user_id = v_test_user_id;

        RAISE NOTICE 'Logs after: %', v_log_count_after;
        RAISE NOTICE '';

        IF v_log_count_after > v_log_count_before THEN
            RAISE NOTICE '✅ Log entry was created!';
            RAISE NOTICE 'New logs: %', v_log_count_after - v_log_count_before;
        ELSE
            RAISE NOTICE '❌ No log entry created!';
            RAISE NOTICE 'Check if consume_token() has INSERT statement';
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ consume_token() failed: %', SQLERRM;
    END;

    RAISE NOTICE '';
END $$;

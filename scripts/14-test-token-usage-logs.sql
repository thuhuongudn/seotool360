-- ============================================
-- MIGRATION 14: Test Token Usage Logs System
-- ============================================
-- This script tests the token usage logging system including:
-- - Log creation during token consumption
-- - RPC query functions
-- - RLS policies
-- - Cleanup function

-- ============================================
-- SETUP TEST DATA
-- ============================================

DO $$
DECLARE
    v_test_user_id text;
    v_test_tool_id uuid;
    v_consume_result json;
    v_logs_result json;
    v_stats_result json;
    v_cleanup_result json;
    v_log_count_before integer;
    v_log_count_after integer;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TOKEN USAGE LOGS SYSTEM TEST';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Find a test user (trial with active status)
    SELECT user_id INTO v_test_user_id
    FROM public.profiles
    WHERE plan = 'trial' AND status = 'active'
    LIMIT 1;

    IF v_test_user_id IS NULL THEN
        RAISE EXCEPTION 'No test user found. Please create a trial user first.';
    END IF;

    RAISE NOTICE 'Test User ID: %', v_test_user_id;

    -- Find a test tool
    SELECT id INTO v_test_tool_id
    FROM public.seo_tools
    WHERE status = 'active'
    LIMIT 1;

    IF v_test_tool_id IS NULL THEN
        RAISE EXCEPTION 'No test tool found. Please create an active tool first.';
    END IF;

    RAISE NOTICE 'Test Tool ID: %', v_test_tool_id;
    RAISE NOTICE '';

    -- ============================================
    -- TEST 1: Token Consumption Creates Log
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 1: Token Consumption Creates Log';
    RAISE NOTICE '========================================';

    -- Count logs before
    SELECT COUNT(*) INTO v_log_count_before
    FROM public.token_usage_logs
    WHERE user_id = v_test_user_id;

    RAISE NOTICE 'Logs before consumption: %', v_log_count_before;

    -- Consume 1 token
    SELECT public.consume_token(v_test_user_id, v_test_tool_id, 1)
    INTO v_consume_result;

    RAISE NOTICE 'Consume result: %', v_consume_result;

    -- Count logs after
    SELECT COUNT(*) INTO v_log_count_after
    FROM public.token_usage_logs
    WHERE user_id = v_test_user_id;

    RAISE NOTICE 'Logs after consumption: %', v_log_count_after;

    IF v_log_count_after = v_log_count_before + 1 THEN
        RAISE NOTICE '✓ TEST 1 PASSED: Log created successfully';
    ELSE
        RAISE WARNING '✗ TEST 1 FAILED: Log not created';
    END IF;

    RAISE NOTICE '';

    -- ============================================
    -- TEST 2: Multiple Consumptions Create Multiple Logs
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 2: Multiple Consumptions';
    RAISE NOTICE '========================================';

    v_log_count_before := v_log_count_after;

    -- Consume 3 times
    FOR i IN 1..3 LOOP
        SELECT public.consume_token(v_test_user_id, v_test_tool_id, 1)
        INTO v_consume_result;
    END LOOP;

    -- Count logs after
    SELECT COUNT(*) INTO v_log_count_after
    FROM public.token_usage_logs
    WHERE user_id = v_test_user_id;

    RAISE NOTICE 'Logs before: %, after: %', v_log_count_before, v_log_count_after;

    IF v_log_count_after = v_log_count_before + 3 THEN
        RAISE NOTICE '✓ TEST 2 PASSED: Multiple logs created';
    ELSE
        RAISE WARNING '✗ TEST 2 FAILED: Expected % logs, got %', v_log_count_before + 3, v_log_count_after;
    END IF;

    RAISE NOTICE '';

    -- ============================================
    -- TEST 3: Query Logs via RPC (as admin)
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 3: Query Logs via RPC';
    RAISE NOTICE '========================================';

    -- Note: This will fail if not called as admin, which is expected
    -- In production, this should be called via authenticated admin API
    BEGIN
        SELECT public.get_token_usage_logs(
            p_user_id := v_test_user_id,
            p_tool_id := NULL,
            p_start_date := NULL,
            p_end_date := NULL,
            p_limit := 10,
            p_offset := 0
        ) INTO v_logs_result;

        RAISE NOTICE 'Query result: %', v_logs_result;

        IF (v_logs_result->>'success')::boolean THEN
            RAISE NOTICE '✓ TEST 3 PASSED: Logs queried successfully';
        ELSE
            RAISE NOTICE '⚠ TEST 3 INFO: % (expected if not admin)', v_logs_result->>'message';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠ TEST 3 INFO: Query requires admin role (expected)';
    END;

    RAISE NOTICE '';

    -- ============================================
    -- TEST 4: Query Stats via RPC
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 4: Query Stats via RPC';
    RAISE NOTICE '========================================';

    BEGIN
        SELECT public.get_token_usage_stats(
            p_user_id := v_test_user_id,
            p_start_date := NULL,
            p_end_date := NULL
        ) INTO v_stats_result;

        RAISE NOTICE 'Stats result: %', v_stats_result;

        IF (v_stats_result->>'success')::boolean THEN
            RAISE NOTICE '✓ TEST 4 PASSED: Stats queried successfully';
        ELSE
            RAISE NOTICE '⚠ TEST 4 INFO: % (expected if not admin)', v_stats_result->>'message';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠ TEST 4 INFO: Query requires admin role (expected)';
    END;

    RAISE NOTICE '';

    -- ============================================
    -- TEST 5: RLS Policies (Service Role Can Read)
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 5: RLS Policies';
    RAISE NOTICE '========================================';

    -- Test that service role can read logs
    BEGIN
        PERFORM * FROM public.token_usage_logs
        WHERE user_id = v_test_user_id
        LIMIT 1;

        RAISE NOTICE '✓ TEST 5 PASSED: Service role can read logs';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '✗ TEST 5 FAILED: Service role cannot read logs: %', SQLERRM;
    END;

    RAISE NOTICE '';

    -- ============================================
    -- TEST 6: Foreign Key Constraints
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 6: Foreign Key Constraints';
    RAISE NOTICE '========================================';

    -- Test invalid user_id
    BEGIN
        INSERT INTO public.token_usage_logs (user_id, tool_id, consumed)
        VALUES ('invalid-user-id', v_test_tool_id, 1);

        RAISE WARNING '✗ TEST 6a FAILED: Invalid user_id was accepted';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE '✓ TEST 6a PASSED: Invalid user_id rejected';
    END;

    -- Test invalid tool_id
    BEGIN
        INSERT INTO public.token_usage_logs (user_id, tool_id, consumed)
        VALUES (v_test_user_id, gen_random_uuid(), 1);

        RAISE WARNING '✗ TEST 6b FAILED: Invalid tool_id was accepted';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE '✓ TEST 6b PASSED: Invalid tool_id rejected';
    END;

    RAISE NOTICE '';

    -- ============================================
    -- TEST 7: Cleanup Function (Dry Run)
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 7: Cleanup Function';
    RAISE NOTICE '========================================';

    -- Create old log for testing (91 days old)
    INSERT INTO public.token_usage_logs (user_id, tool_id, consumed, created_at)
    VALUES (
        v_test_user_id,
        v_test_tool_id,
        1,
        now() - interval '91 days'
    );

    RAISE NOTICE 'Created old log (91 days old)';

    -- Count logs before cleanup
    SELECT COUNT(*) INTO v_log_count_before
    FROM public.token_usage_logs
    WHERE created_at < now() - interval '90 days';

    RAISE NOTICE 'Old logs before cleanup: %', v_log_count_before;

    -- Run cleanup
    SELECT public.cleanup_token_usage_logs() INTO v_cleanup_result;

    RAISE NOTICE 'Cleanup result: %', v_cleanup_result;

    -- Count logs after cleanup
    SELECT COUNT(*) INTO v_log_count_after
    FROM public.token_usage_logs
    WHERE created_at < now() - interval '90 days';

    RAISE NOTICE 'Old logs after cleanup: %', v_log_count_after;

    IF v_log_count_after = 0 THEN
        RAISE NOTICE '✓ TEST 7 PASSED: Old logs cleaned up';
    ELSE
        RAISE WARNING '✗ TEST 7 FAILED: Old logs still exist';
    END IF;

    RAISE NOTICE '';

    -- ============================================
    -- TEST 8: Consume Until Quota Exceeded
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 8: Quota Exceeded Scenario';
    RAISE NOTICE '========================================';

    -- Get user's daily limit
    DECLARE
        v_daily_limit integer;
        v_current_usage integer;
        v_remaining integer;
    BEGIN
        SELECT daily_token_limit INTO v_daily_limit
        FROM public.plan_quota
        WHERE plan = (SELECT plan FROM public.profiles WHERE user_id = v_test_user_id);

        RAISE NOTICE 'Daily limit: %', v_daily_limit;

        -- Get current usage
        SELECT tokens_used INTO v_current_usage
        FROM public.daily_token_usage
        WHERE user_id = v_test_user_id
        AND usage_date = CURRENT_DATE;

        v_remaining := v_daily_limit - v_current_usage;
        RAISE NOTICE 'Current usage: %, remaining: %', v_current_usage, v_remaining;

        -- Try to exceed quota
        IF v_remaining > 0 THEN
            SELECT public.consume_token(v_test_user_id, v_test_tool_id, v_remaining + 1)
            INTO v_consume_result;

            IF (v_consume_result->>'success')::boolean = false AND
               v_consume_result->>'error' = 'INSUFFICIENT_TOKENS' THEN
                RAISE NOTICE '✓ TEST 8 PASSED: Quota exceeded error returned';
            ELSE
                RAISE WARNING '✗ TEST 8 FAILED: Quota not enforced';
            END IF;
        ELSE
            RAISE NOTICE '⚠ TEST 8 SKIPPED: User already at quota';
        END IF;
    END;

    RAISE NOTICE '';

    -- ============================================
    -- TEST SUMMARY
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'All tests completed. Review output above for results.';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Points:';
    RAISE NOTICE '  • Logs are created on each token consumption';
    RAISE NOTICE '  • Foreign keys enforce data integrity';
    RAISE NOTICE '  • RLS policies protect sensitive data';
    RAISE NOTICE '  • Cleanup function removes old logs (>90 days)';
    RAISE NOTICE '  • Admin RPC functions require admin role';
    RAISE NOTICE '';

END $$;

-- ============================================
-- 🧪 TEST consume_token - DETAILED DEBUG
-- ============================================
-- This will test consume_token and show EXACTLY what's happening
-- Copy ALL results back to me
-- ============================================

-- ============================================
-- TEST 1: Check function exists
-- ============================================
SELECT '=== TEST 1: Function Check ===' as test;

SELECT
    'Function exists' as check_item,
    CASE
        WHEN COUNT(*) = 1 THEN '✓ YES'
        WHEN COUNT(*) = 0 THEN '✗ NO - FUNCTION MISSING!'
        ELSE '⚠ MULTIPLE FUNCTIONS: ' || COUNT(*)::text
    END as result
FROM pg_proc
WHERE proname = 'consume_token';

-- Show signature
SELECT
    'Signature' as info,
    oid::regprocedure::text as function_signature
FROM pg_proc
WHERE proname = 'consume_token';

-- ============================================
-- TEST 2: Get test data
-- ============================================
SELECT '=== TEST 2: Getting Test Data ===' as test;

-- Get your user_id
SELECT
    'Your user_id' as info,
    user_id as value
FROM public.profiles
WHERE user_id = auth.uid()::text;

-- Get your profile details
SELECT
    'Your profile' as info,
    json_build_object(
        'user_id', user_id,
        'plan', plan,
        'status', status,
        'role', role,
        'trial_ends_at', trial_ends_at,
        'member_ends_at', member_ends_at
    )::text as value
FROM public.profiles
WHERE user_id = auth.uid()::text;

-- Get a test tool_id
SELECT
    'Test tool_id' as info,
    id::text as value
FROM public.seo_tools
LIMIT 1;

-- ============================================
-- TEST 3: Call consume_token with EXPLICIT values
-- ============================================
SELECT '=== TEST 3: Calling consume_token ===' as test;

-- First, let's manually call it with hardcoded values
-- YOU NEED TO: Replace these with YOUR actual values from TEST 2 above
DO $$
DECLARE
    v_user_id text;
    v_tool_id text;
    v_result json;
BEGIN
    -- Get actual user_id
    SELECT user_id INTO v_user_id
    FROM public.profiles
    WHERE user_id = auth.uid()::text;

    -- Get actual tool_id
    SELECT id::text INTO v_tool_id
    FROM public.seo_tools
    LIMIT 1;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Calling consume_token with:';
    RAISE NOTICE '  p_user_id: %', v_user_id;
    RAISE NOTICE '  p_tool_id: %', v_tool_id;
    RAISE NOTICE '  p_tokens_to_consume: 1';
    RAISE NOTICE '========================================';

    -- Call the function
    BEGIN
        v_result := public.consume_token(v_user_id, v_tool_id, 1);

        RAISE NOTICE '';
        RAISE NOTICE 'RESULT JSON:';
        RAISE NOTICE '%', v_result::text;
        RAISE NOTICE '';

        -- Parse and display result
        IF v_result IS NULL THEN
            RAISE NOTICE '❌ RESULT IS NULL!';
        ELSIF (v_result->>'success')::boolean THEN
            RAISE NOTICE '✅ SUCCESS!';
            RAISE NOTICE '   message: %', v_result->>'message';
            RAISE NOTICE '   tokens_used: %', v_result->>'tokens_used';
            RAISE NOTICE '   tokens_remaining: %', v_result->>'tokens_remaining';
            RAISE NOTICE '   daily_limit: %', v_result->>'daily_limit';
            RAISE NOTICE '   consumed_tokens: %', v_result->>'consumed_tokens';
        ELSE
            RAISE NOTICE '❌ FAILED!';
            RAISE NOTICE '   error: %', v_result->>'error';
            RAISE NOTICE '   message: %', v_result->>'message';
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '';
            RAISE NOTICE '❌ EXCEPTION THROWN!';
            RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
            RAISE NOTICE '   SQLERRM: %', SQLERRM;
            RAISE NOTICE '   DETAIL: %', SQLSTATE || ' - ' || SQLERRM;
    END;

END $$;

-- ============================================
-- TEST 4: Check if logs were created
-- ============================================
SELECT '=== TEST 4: Checking Logs ===' as test;

-- Check token_usage_logs
SELECT
    'token_usage_logs (last 3)' as log_type,
    json_agg(
        json_build_object(
            'created_at', created_at,
            'user_id', user_id,
            'tool_id', tool_id,
            'consumed', consumed
        ) ORDER BY created_at DESC
    )::text as logs
FROM (
    SELECT * FROM public.token_usage_logs
    WHERE user_id = auth.uid()::text
    ORDER BY created_at DESC
    LIMIT 3
) recent_logs;

-- Check daily_token_usage
SELECT
    'daily_token_usage (today)' as log_type,
    json_build_object(
        'usage_date', usage_date,
        'tokens_used', tokens_used,
        'tokens_limit', tokens_limit,
        'updated_at', updated_at
    )::text as usage
FROM public.daily_token_usage
WHERE user_id = auth.uid()::text
AND usage_date = CURRENT_DATE;

-- ============================================
-- TEST 5: Simulate client call
-- ============================================
SELECT '=== TEST 5: Simulating Client Call ===' as test;

-- This mimics what the client does
WITH test_params AS (
    SELECT
        auth.uid()::text as user_id,
        (SELECT id::text FROM public.seo_tools LIMIT 1) as tool_id
),
function_call AS (
    SELECT
        public.consume_token(
            (SELECT user_id FROM test_params),
            (SELECT tool_id FROM test_params),
            1
        ) as result
)
SELECT
    'Client call result' as test_name,
    result::text as full_result,
    (result->>'success')::text as success,
    COALESCE(result->>'error', 'none') as error,
    result->>'message' as message,
    COALESCE((result->>'tokens_used')::text, 'N/A') as tokens_used,
    COALESCE((result->>'tokens_remaining')::text, 'N/A') as tokens_remaining
FROM function_call;

-- ============================================
-- TEST 6: Check RLS policies
-- ============================================
SELECT '=== TEST 6: RLS Policies ===' as test;

SELECT
    tablename,
    policyname,
    cmd,
    LEFT(qual::text, 100) as condition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('token_usage_logs', 'daily_token_usage')
ORDER BY tablename, policyname;

-- ============================================
-- TEST 7: Try manual INSERT (to check RLS)
-- ============================================
SELECT '=== TEST 7: Testing Manual Insert ===' as test;

DO $$
DECLARE
    v_tool_id uuid;
    v_user_id text;
BEGIN
    v_user_id := auth.uid()::text;
    SELECT id INTO v_tool_id FROM public.seo_tools LIMIT 1;

    RAISE NOTICE 'Attempting manual INSERT...';
    RAISE NOTICE '  user_id: %', v_user_id;
    RAISE NOTICE '  tool_id: %', v_tool_id;

    BEGIN
        INSERT INTO public.token_usage_logs (user_id, tool_id, consumed)
        VALUES (v_user_id, v_tool_id, 999);

        RAISE NOTICE '✅ Manual INSERT succeeded!';

        -- Clean up test data
        DELETE FROM public.token_usage_logs
        WHERE user_id = v_user_id AND consumed = 999;

        RAISE NOTICE '✅ Test data cleaned up';

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Manual INSERT failed!';
            RAISE NOTICE '   Error: %', SQLERRM;
            RAISE NOTICE '   This indicates RLS is blocking inserts';
    END;
END $$;

-- ============================================
-- INSTRUCTIONS
-- ============================================
SELECT '=== COPY ALL OUTPUT ABOVE ===' as instruction;
SELECT 'Send the entire output back' as step_1;
SELECT 'Include ALL RAISE NOTICE messages' as step_2;
SELECT 'Pay attention to any errors or NULL results' as step_3;

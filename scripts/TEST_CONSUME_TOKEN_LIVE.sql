-- ============================================
-- LIVE TEST consume_token FUNCTION
-- ============================================
-- This script will actually CALL consume_token and show the result

-- Step 1: Get your user_id
DO $$
DECLARE
    v_user_id text;
    v_tool_id uuid;
    v_result json;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid()::text;
    RAISE NOTICE '=== YOUR USER INFO ===';
    RAISE NOTICE 'User ID: %', v_user_id;

    -- Show user profile
    FOR v_result IN
        SELECT row_to_json(t) FROM (
            SELECT user_id, plan, status, role, trial_ends_at, member_ends_at
            FROM public.profiles
            WHERE user_id = v_user_id
        ) t
    LOOP
        RAISE NOTICE 'Profile: %', v_result;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '=== AVAILABLE TOOLS ===';

    -- Get first available tool
    SELECT id INTO v_tool_id
    FROM public.seo_tools
    LIMIT 1;

    RAISE NOTICE 'Selected tool_id: %', v_tool_id;

    RAISE NOTICE '';
    RAISE NOTICE '=== CALLING consume_token ===';
    RAISE NOTICE 'Parameters:';
    RAISE NOTICE '  p_user_id: %', v_user_id;
    RAISE NOTICE '  p_tool_id: %', v_tool_id;
    RAISE NOTICE '  p_tokens_to_consume: 1';
    RAISE NOTICE '';

    -- Call the function
    BEGIN
        v_result := public.consume_token(v_user_id, v_tool_id, 1);
        RAISE NOTICE 'RESULT: %', v_result;
        RAISE NOTICE '';

        -- Parse result
        IF (v_result->>'success')::boolean THEN
            RAISE NOTICE '✅ SUCCESS!';
            RAISE NOTICE '   tokens_used: %', v_result->>'tokens_used';
            RAISE NOTICE '   tokens_remaining: %', v_result->>'tokens_remaining';
            RAISE NOTICE '   daily_limit: %', v_result->>'daily_limit';
        ELSE
            RAISE NOTICE '❌ FAILED!';
            RAISE NOTICE '   error: %', v_result->>'error';
            RAISE NOTICE '   message: %', v_result->>'message';
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ EXCEPTION OCCURRED!';
            RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
            RAISE NOTICE '   SQLERRM: %', SQLERRM;
    END;

    RAISE NOTICE '';
    RAISE NOTICE '=== CHECKING token_usage_logs ===';

    -- Check if log was created
    FOR v_result IN
        SELECT row_to_json(t) FROM (
            SELECT created_at, user_id, tool_id, consumed
            FROM public.token_usage_logs
            WHERE user_id = v_user_id
            ORDER BY created_at DESC
            LIMIT 3
        ) t
    LOOP
        RAISE NOTICE 'Log: %', v_result;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '=== CHECKING daily_token_usage ===';

    -- Check daily usage
    FOR v_result IN
        SELECT row_to_json(t) FROM (
            SELECT usage_date, tokens_used, tokens_limit, updated_at
            FROM public.daily_token_usage
            WHERE user_id = v_user_id
            AND usage_date = CURRENT_DATE
        ) t
    LOOP
        RAISE NOTICE 'Usage: %', v_result;
    END LOOP;

END $$;

-- ============================================
-- SIMPLER VERSION - Returns table
-- ============================================
WITH test_data AS (
    SELECT
        auth.uid()::text as user_id,
        (SELECT id FROM public.seo_tools LIMIT 1) as tool_id
),
function_result AS (
    SELECT
        public.consume_token(
            (SELECT user_id FROM test_data),
            (SELECT tool_id FROM test_data),
            1
        ) as result
)
SELECT
    'Function Result' as type,
    result::text
FROM function_result
UNION ALL
SELECT
    'Success',
    (result->>'success')::text
FROM function_result
UNION ALL
SELECT
    'Error',
    COALESCE(result->>'error', 'none')
FROM function_result
UNION ALL
SELECT
    'Message',
    result->>'message'
FROM function_result
UNION ALL
SELECT
    'Tokens Used',
    COALESCE((result->>'tokens_used')::text, 'N/A')
FROM function_result
UNION ALL
SELECT
    'Tokens Remaining',
    COALESCE((result->>'tokens_remaining')::text, 'N/A')
FROM function_result;

-- ============================================
-- DEBUG SCRIPT FOR consume_token ISSUE
-- ============================================
-- Run this to diagnose why consume_token returns 200 but doesn't execute
-- Copy the results and send back for analysis

-- ============================================
-- 1. CHECK ALL consume_token FUNCTIONS
-- ============================================
SELECT
    '=== ALL consume_token FUNCTIONS ===' as step,
    NULL::text as detail
UNION ALL
SELECT
    'Function ' || (ROW_NUMBER() OVER ())::text,
    pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'consume_token'
ORDER BY 1;

-- ============================================
-- 2. CHECK FUNCTION SIGNATURES
-- ============================================
SELECT
    '=== FUNCTION SIGNATURES ===' as step,
    NULL::text as signature
UNION ALL
SELECT
    oid::regprocedure::text as step,
    pg_get_function_identity_arguments(oid) as signature
FROM pg_proc
WHERE proname = 'consume_token'
ORDER BY 1;

-- ============================================
-- 3. CHECK FUNCTION PERMISSIONS
-- ============================================
SELECT
    '=== FUNCTION PERMISSIONS ===' as info,
    NULL::text as detail
UNION ALL
SELECT
    p.proname as info,
    array_to_string(p.proacl, ', ') as detail
FROM pg_proc p
WHERE p.proname = 'consume_token';

-- ============================================
-- 4. TEST consume_token WITH YOUR USER ID
-- ============================================
-- Replace 'YOUR_USER_ID' with your actual user_id
-- Replace 'YOUR_TOOL_ID' with a valid tool UUID

SELECT '=== TESTING consume_token ===' as test;

-- First, get a valid tool_id
SELECT
    'Available tools:' as info,
    id::text || ' - ' || name as tool_info
FROM public.seo_tools
LIMIT 5;

-- Get your user info
SELECT
    'Your profile:' as info,
    user_id || ' | ' ||
    'plan=' || plan || ' | ' ||
    'status=' || status || ' | ' ||
    'role=' || role as profile_info
FROM public.profiles
WHERE user_id = auth.uid()::text;

-- Test the function (replace UUIDs with real values from above)
-- SELECT public.consume_token(
--     'YOUR_USER_ID',  -- from profile query above
--     'YOUR_TOOL_ID'::uuid,  -- from tools query above
--     1
-- ) as function_result;

-- ============================================
-- 5. CHECK token_usage_logs TABLE
-- ============================================
SELECT
    '=== token_usage_logs TABLE CHECK ===' as check_type,
    NULL::text as result
UNION ALL
SELECT
    'Table exists',
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = 'token_usage_logs'
        ) THEN 'YES ✓'
        ELSE 'NO ✗ - THIS IS THE PROBLEM!'
    END
UNION ALL
SELECT
    'Table structure',
    string_agg(column_name || ' ' || data_type, ', ')
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'token_usage_logs'
GROUP BY table_name;

-- Check if there are any logs
SELECT
    '=== RECENT token_usage_logs ===' as info,
    NULL::text as detail
UNION ALL
SELECT
    'Total logs',
    COUNT(*)::text
FROM public.token_usage_logs
UNION ALL
SELECT
    'Recent log (last 5)',
    created_at::text || ' | user=' || user_id || ' | consumed=' || consumed::text
FROM public.token_usage_logs
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 6. CHECK daily_token_usage TABLE
-- ============================================
SELECT
    '=== daily_token_usage CHECK ===' as info,
    NULL::text as detail
UNION ALL
SELECT
    'Today usage for current user',
    'used=' || tokens_used::text ||
    ' / limit=' || tokens_limit::text ||
    ' | date=' || usage_date::text
FROM public.daily_token_usage
WHERE user_id = auth.uid()::text
AND usage_date = CURRENT_DATE;

-- ============================================
-- 7. CHECK RLS POLICIES
-- ============================================
SELECT
    '=== RLS POLICIES ===' as info,
    NULL::text as detail
UNION ALL
SELECT
    tablename || '.' || policyname as info,
    'cmd=' || cmd || ' | qual=' || LEFT(qual::text, 50) as detail
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('token_usage_logs', 'daily_token_usage', 'profiles')
ORDER BY tablename, policyname;

-- ============================================
-- 8. TEST MANUAL INSERT (to check if INSERT works)
-- ============================================
SELECT '=== TEST MANUAL INSERT ===' as test;

-- This will tell us if the INSERT statement in consume_token is failing
-- DO $$
-- DECLARE
--     test_tool_id uuid;
-- BEGIN
--     -- Get a valid tool_id
--     SELECT id INTO test_tool_id FROM public.seo_tools LIMIT 1;
--
--     -- Try manual insert
--     INSERT INTO public.token_usage_logs (user_id, tool_id, consumed)
--     VALUES (auth.uid()::text, test_tool_id, 1);
--
--     RAISE NOTICE 'Manual insert SUCCESS!';
-- EXCEPTION
--     WHEN OTHERS THEN
--         RAISE NOTICE 'Manual insert FAILED: %', SQLERRM;
-- END $$;

-- ============================================
-- SUMMARY
-- ============================================
SELECT
    '=== DIAGNOSTIC SUMMARY ===' as summary,
    json_build_object(
        'consume_token_functions', (SELECT COUNT(*) FROM pg_proc WHERE proname = 'consume_token'),
        'token_usage_logs_exists', EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'token_usage_logs'),
        'daily_token_usage_exists', EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'daily_token_usage'),
        'current_user', auth.uid()::text,
        'current_role', current_user
    )::text as details;

-- ============================================
-- INSTRUCTIONS
-- ============================================
SELECT '=== NEXT STEPS ===' as instructions;
SELECT 'Copy ALL output above and send to developer' as step_1;
SELECT 'Pay special attention to:' as step_2;
SELECT '  - How many consume_token functions exist?' as detail_1;
SELECT '  - Does token_usage_logs table exist?' as detail_2;
SELECT '  - What is the function result when you test it?' as detail_3;
SELECT '  - Are there any RLS policies blocking inserts?' as detail_4;

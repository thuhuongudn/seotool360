-- ============================================
-- QUICK CHECK - Run this first (30 seconds)
-- ============================================

-- 1. How many consume_token functions?
SELECT
    '1. Function Count' as check_item,
    COUNT(*)::text || ' consume_token function(s) found' as result
FROM pg_proc
WHERE proname = 'consume_token'

UNION ALL

-- 2. What are their signatures?
SELECT
    '2. Signatures',
    oid::regprocedure::text
FROM pg_proc
WHERE proname = 'consume_token'

UNION ALL

-- 3. Does token_usage_logs exist?
SELECT
    '3. token_usage_logs table',
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'token_usage_logs')
        THEN '✓ EXISTS'
        ELSE '✗ MISSING - CREATE IT!'
    END

UNION ALL

-- 4. Your user info
SELECT
    '4. Your User ID',
    COALESCE(auth.uid()::text, 'NOT LOGGED IN!')

UNION ALL

SELECT
    '5. Your Role',
    COALESCE(
        (SELECT role FROM public.profiles WHERE user_id = auth.uid()::text),
        'NO PROFILE'
    )

UNION ALL

-- 6. Can you access profiles table?
SELECT
    '6. Profiles Access',
    CASE
        WHEN EXISTS (SELECT 1 FROM public.profiles LIMIT 1)
        THEN '✓ YES'
        ELSE '✗ NO - RLS BLOCKING?'
    END

UNION ALL

-- 7. Test get_user_token_usage
SELECT
    '7. get_user_token_usage',
    CASE
        WHEN (SELECT public.get_user_token_usage(auth.uid()::text)) IS NOT NULL
        THEN '✓ WORKS'
        ELSE '✗ RETURNS NULL'
    END

UNION ALL

-- 8. Check plan_quota
SELECT
    '8. plan_quota table',
    COUNT(*)::text || ' plan(s) configured'
FROM public.plan_quota
WHERE is_active = true;

-- ============================================
-- SEND THIS OUTPUT BACK
-- ============================================

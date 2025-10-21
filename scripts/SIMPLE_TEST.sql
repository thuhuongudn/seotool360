-- ============================================
-- SIMPLE TEST - Run this if the detailed one is too long
-- ============================================

-- Step 1: Get your data
SELECT
    '1. Your user_id' as info,
    auth.uid()::text as value

UNION ALL

SELECT
    '2. A tool_id',
    (SELECT id::text FROM public.seo_tools LIMIT 1)

UNION ALL

-- Step 2: Call the function
SELECT
    '3. Function result',
    public.consume_token(
        auth.uid()::text,
        (SELECT id::text FROM public.seo_tools LIMIT 1),
        1
    )::text

UNION ALL

-- Step 3: Check if it's in the result format we expect
SELECT
    '4. Success?',
    (
        public.consume_token(
            auth.uid()::text,
            (SELECT id::text FROM public.seo_tools LIMIT 1),
            1
        )->>'success'
    )::text

UNION ALL

SELECT
    '5. Error (if any)',
    COALESCE(
        public.consume_token(
            auth.uid()::text,
            (SELECT id::text FROM public.seo_tools LIMIT 1),
            1
        )->>'error',
        'NO ERROR'
    );

-- ============================================
-- Check logs after calling
-- ============================================
SELECT
    '=== Recent Logs ===' as section,
    NULL::text as data

UNION ALL

SELECT
    'Log ' || ROW_NUMBER() OVER (ORDER BY created_at DESC),
    'user=' || user_id || ' tool=' || tool_id::text || ' consumed=' || consumed::text || ' time=' || created_at::text
FROM public.token_usage_logs
WHERE user_id = auth.uid()::text
ORDER BY created_at DESC
LIMIT 5;

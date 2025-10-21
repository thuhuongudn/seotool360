-- ============================================
-- ULTRA SIMPLE TEST - No dependencies
-- ============================================

-- 1. Get your user and tool
SELECT
    'Your user_id' as info,
    auth.uid()::text as value

UNION ALL

SELECT
    'Test tool_id',
    (SELECT id::text FROM public.seo_tools LIMIT 1);

-- 2. Call consume_token directly
SELECT
    'Function call result' as test,
    public.consume_token(
        auth.uid()::text,
        (SELECT id::text FROM public.seo_tools LIMIT 1),
        1
    )::text as result;

-- 3. Check daily usage (doesn't use created_at)
SELECT
    'Daily usage' as info,
    tokens_used || '/' || tokens_limit as usage
FROM public.daily_token_usage
WHERE user_id = auth.uid()::text
AND usage_date = CURRENT_DATE;

-- 4. Count logs (doesn't use created_at)
SELECT
    'Total logs count' as info,
    COUNT(*)::text as count
FROM public.token_usage_logs
WHERE user_id = auth.uid()::text;

-- 5. Show recent logs WITHOUT created_at
SELECT
    'Recent log ' || ROW_NUMBER() OVER () as info,
    'user=' || user_id || ' tool=' || tool_id::text || ' consumed=' || consumed::text as data
FROM public.token_usage_logs
WHERE user_id = auth.uid()::text
LIMIT 5;

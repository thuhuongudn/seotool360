-- ============================================
-- TEST WITH YOUR ACTUAL USER ID
-- ============================================
-- Replace YOUR_USER_ID with: 741d8abd-1525-4d9f-a8b1-5203276f2c4e
-- ============================================

-- 1. Test consume_token with YOUR user_id
SELECT
    'consume_token result' as test,
    public.consume_token(
        '741d8abd-1525-4d9f-a8b1-5203276f2c4e',  -- YOUR user_id
        '1ff742f6-52d2-49ef-8979-7647423438ca',  -- Tool ID from your logs
        1
    )::text as result;

-- 2. Parse the result
WITH result AS (
    SELECT public.consume_token(
        '741d8abd-1525-4d9f-a8b1-5203276f2c4e',
        '1ff742f6-52d2-49ef-8979-7647423438ca',
        1
    ) as r
)
SELECT
    'success' as field,
    (r->>'success')::text as value
FROM result

UNION ALL

SELECT
    'error',
    COALESCE(r->>'error', 'none')
FROM result

UNION ALL

SELECT
    'message',
    r->>'message'
FROM result

UNION ALL

SELECT
    'tokens_used',
    COALESCE((r->>'tokens_used')::text, 'N/A')
FROM result

UNION ALL

SELECT
    'tokens_remaining',
    COALESCE((r->>'tokens_remaining')::text, 'N/A')
FROM result

UNION ALL

SELECT
    'daily_limit',
    COALESCE((r->>'daily_limit')::text, 'N/A')
FROM result;

-- 3. Check your daily usage
SELECT
    'Your daily usage' as info,
    tokens_used || ' / ' || tokens_limit as usage
FROM public.daily_token_usage
WHERE user_id = '741d8abd-1525-4d9f-a8b1-5203276f2c4e'
AND usage_date = CURRENT_DATE;

-- 4. Check your recent logs
SELECT
    'Log ' || ROW_NUMBER() OVER (ORDER BY created_at DESC) as log_num,
    'consumed=' || consumed || ' at ' || created_at::text as details
FROM public.token_usage_logs
WHERE user_id = '741d8abd-1525-4d9f-a8b1-5203276f2c4e'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Your profile
SELECT
    'Your profile' as info,
    'plan=' || plan || ' status=' || status || ' role=' || role as details
FROM public.profiles
WHERE user_id = '741d8abd-1525-4d9f-a8b1-5203276f2c4e';

-- ============================================
-- RUN EACH QUERY ONE BY ONE
-- ============================================
-- Copy and paste EACH query separately, run it, and send me the result
-- ============================================

-- ============================================
-- QUERY 1: Test consume_token
-- ============================================
-- Copy this query, run it, send me the result

SELECT
    'consume_token result' as test,
    public.consume_token(
        '741d8abd-1525-4d9f-a8b1-5203276f2c4e',
        '1ff742f6-52d2-49ef-8979-7647423438ca',
        1
    )::text as result;

-- ============================================
-- STOP HERE - Send me the result above before continuing
-- ============================================


-- ============================================
-- QUERY 2: Parse the result
-- ============================================
-- After sending Query 1 result, copy and run this:

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

SELECT 'error', COALESCE(r->>'error', 'none') FROM result

UNION ALL

SELECT 'message', r->>'message' FROM result

UNION ALL

SELECT 'tokens_used', COALESCE((r->>'tokens_used')::text, 'N/A') FROM result

UNION ALL

SELECT 'tokens_remaining', COALESCE((r->>'tokens_remaining')::text, 'N/A') FROM result

UNION ALL

SELECT 'daily_limit', COALESCE((r->>'daily_limit')::text, 'N/A') FROM result;

-- ============================================
-- STOP HERE - Send me the result
-- ============================================


-- ============================================
-- QUERY 3: Check daily usage
-- ============================================

SELECT
    'Your daily usage' as info,
    tokens_used || ' / ' || tokens_limit as usage
FROM public.daily_token_usage
WHERE user_id = '741d8abd-1525-4d9f-a8b1-5203276f2c4e'
AND usage_date = CURRENT_DATE;

-- ============================================
-- STOP HERE - Send me the result
-- ============================================


-- ============================================
-- QUERY 4: Check recent logs
-- ============================================

SELECT
    'Log ' || ROW_NUMBER() OVER (ORDER BY created_at DESC) as log_num,
    'consumed=' || consumed || ' at ' || created_at::text as details
FROM public.token_usage_logs
WHERE user_id = '741d8abd-1525-4d9f-a8b1-5203276f2c4e'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- DONE - Send me all 4 results
-- ============================================

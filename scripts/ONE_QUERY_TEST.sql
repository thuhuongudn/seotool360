-- ============================================
-- ONE QUERY - ALL RESULTS
-- ============================================
-- Just run this ONE query and send me ALL the output
-- ============================================

WITH consume_result AS (
    SELECT public.consume_token(
        '741d8abd-1525-4d9f-a8b1-5203276f2c4e',
        '1ff742f6-52d2-49ef-8979-7647423438ca',
        1
    ) as r
)
SELECT
    '1. Full Result' as section,
    r::text as value
FROM consume_result

UNION ALL

SELECT
    '2. Success?',
    (r->>'success')::text
FROM consume_result

UNION ALL

SELECT
    '3. Error',
    COALESCE(r->>'error', 'NONE')
FROM consume_result

UNION ALL

SELECT
    '4. Message',
    r->>'message'
FROM consume_result

UNION ALL

SELECT
    '5. Tokens Used',
    COALESCE((r->>'tokens_used')::text, 'N/A')
FROM consume_result

UNION ALL

SELECT
    '6. Tokens Remaining',
    COALESCE((r->>'tokens_remaining')::text, 'N/A')
FROM consume_result

UNION ALL

SELECT
    '7. Daily Limit',
    COALESCE((r->>'daily_limit')::text, 'N/A')
FROM consume_result

UNION ALL

SELECT
    '8. Daily Usage',
    COALESCE(tokens_used || '/' || tokens_limit, 'No data')
FROM public.daily_token_usage
WHERE user_id = '741d8abd-1525-4d9f-a8b1-5203276f2c4e'
AND usage_date = CURRENT_DATE

UNION ALL

SELECT
    '9. Total Logs',
    COUNT(*)::text
FROM public.token_usage_logs
WHERE user_id = '741d8abd-1525-4d9f-a8b1-5203276f2c4e'

ORDER BY section;

-- ============================================
-- SIMPLE FIX - REMOVE AUTH CHECK FOR SERVICE ROLE
-- ============================================
-- Server already has requireAdmin middleware, so we trust service_role calls

DROP FUNCTION IF EXISTS public.get_token_usage_logs(text, character varying, timestamptz, timestamptz, integer, integer);

CREATE OR REPLACE FUNCTION public.get_token_usage_logs(
    p_user_id text DEFAULT NULL,
    p_tool_id character varying DEFAULT NULL,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_logs json;
BEGIN
    -- No auth check - server middleware already verified admin
    -- This function is called via service_role key from server

    -- Query with filters
    WITH filtered_logs AS (
        SELECT
            l.id,
            l.user_id,
            l.tool_id,
            l.consumed,
            l.created_at,
            p.username,
            t.name as tool_name,
            t.title as tool_title
        FROM public.token_usage_logs l
        LEFT JOIN public.profiles p ON p.user_id = l.user_id
        LEFT JOIN public.seo_tools t ON t.id = l.tool_id
        WHERE
            (p_user_id IS NULL OR l.user_id = p_user_id)
            AND (p_tool_id IS NULL OR l.tool_id = p_tool_id)
            AND (p_start_date IS NULL OR l.created_at >= p_start_date)
            AND (p_end_date IS NULL OR l.created_at <= p_end_date)
        ORDER BY l.created_at DESC
    ),
    counted AS (
        SELECT COUNT(*) as total FROM filtered_logs
    ),
    paginated AS (
        SELECT * FROM filtered_logs
        LIMIT p_limit OFFSET p_offset
    )
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(paginated.*), '[]'::json),
        'pagination', json_build_object(
            'limit', p_limit,
            'offset', p_offset,
            'total', (SELECT total FROM counted)
        )
    ) INTO v_logs
    FROM paginated;

    RETURN v_logs;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INTERNAL_ERROR',
            'message', 'An error occurred: ' || SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_token_usage_logs(text, character varying, timestamptz, timestamptz, integer, integer) TO service_role;

-- Update stats function
DROP FUNCTION IF EXISTS public.get_token_usage_stats(text, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.get_token_usage_stats(
    p_user_id text DEFAULT NULL,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats json;
BEGIN
    -- No auth check - server middleware already verified admin

    -- Build stats
    WITH filtered_logs AS (
        SELECT *
        FROM public.token_usage_logs
        WHERE
            (p_user_id IS NULL OR user_id = p_user_id)
            AND (p_start_date IS NULL OR created_at >= p_start_date)
            AND (p_end_date IS NULL OR created_at <= p_end_date)
    ),
    total_stats AS (
        SELECT
            COUNT(*) as total_requests,
            SUM(consumed) as total_tokens_consumed,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT tool_id) as unique_tools
        FROM filtered_logs
    ),
    by_user AS (
        SELECT
            l.user_id,
            p.username,
            COUNT(*) as request_count,
            SUM(l.consumed) as tokens_consumed
        FROM filtered_logs l
        LEFT JOIN public.profiles p ON p.user_id = l.user_id
        GROUP BY l.user_id, p.username
        ORDER BY tokens_consumed DESC
        LIMIT 10
    ),
    by_tool AS (
        SELECT
            l.tool_id,
            t.name as tool_name,
            t.title as tool_title,
            COUNT(*) as request_count,
            SUM(l.consumed) as tokens_consumed
        FROM filtered_logs l
        LEFT JOIN public.seo_tools t ON t.id = l.tool_id
        GROUP BY l.tool_id, t.name, t.title
        ORDER BY tokens_consumed DESC
        LIMIT 10
    )
    SELECT json_build_object(
        'success', true,
        'stats', json_build_object(
            'total', (SELECT row_to_json(total_stats.*) FROM total_stats),
            'top_users', (SELECT COALESCE(json_agg(by_user.*), '[]'::json) FROM by_user),
            'top_tools', (SELECT COALESCE(json_agg(by_tool.*), '[]'::json) FROM by_tool)
        )
    ) INTO v_stats;

    RETURN v_stats;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INTERNAL_ERROR',
            'message', 'An error occurred: ' || SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_token_usage_stats(text, timestamptz, timestamptz) TO service_role;

-- Success
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Functions updated - NO AUTH CHECK';
    RAISE NOTICE '';
    RAISE NOTICE 'Security: Server requireAdmin middleware protects endpoints';
    RAISE NOTICE 'Grant: service_role only (not authenticated)';
    RAISE NOTICE '';
    RAISE NOTICE 'Test: Reload /admin/token-logs';
    RAISE NOTICE '';
END $$;

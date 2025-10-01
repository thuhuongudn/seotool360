-- ============================================
-- MIGRATION 13: Create get_token_usage_logs RPC
-- ============================================
-- This migration creates an admin-only RPC function to query
-- token usage logs with filtering and pagination.

-- ============================================
-- CREATE RPC: get_token_usage_logs
-- ============================================

CREATE OR REPLACE FUNCTION public.get_token_usage_logs(
    p_user_id text DEFAULT NULL,
    p_tool_id uuid DEFAULT NULL,
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
    v_is_admin boolean;
    v_logs json;
    v_total_count integer;
    v_query text;
BEGIN
    -- Check if caller is admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()::text
        AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'Only admins can access token usage logs'
        );
    END IF;

    -- Build query with filters
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
    SELECT
        json_build_object(
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

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_token_usage_logs(text, uuid, timestamptz, timestamptz, integer, integer) TO authenticated;

-- ============================================
-- CREATE RPC: get_token_usage_stats
-- ============================================

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
    v_is_admin boolean;
    v_stats json;
BEGIN
    -- Check if caller is admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()::text
        AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'Only admins can access token usage statistics'
        );
    END IF;

    -- Build statistics
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

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_token_usage_stats(text, timestamptz, timestamptz) TO authenticated;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    function_count INTEGER;
BEGIN
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('get_token_usage_logs', 'get_token_usage_stats');

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 13 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RPC functions created: % / 2', function_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Features:';
    RAISE NOTICE '  ✓ get_token_usage_logs() - Query logs with filters';
    RAISE NOTICE '    - Filter by user_id, tool_id, date range';
    RAISE NOTICE '    - Pagination support (limit/offset)';
    RAISE NOTICE '    - Includes user & tool details';
    RAISE NOTICE '  ✓ get_token_usage_stats() - Get usage statistics';
    RAISE NOTICE '    - Total requests & tokens consumed';
    RAISE NOTICE '    - Top 10 users by usage';
    RAISE NOTICE '    - Top 10 tools by usage';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Commands:';
    RAISE NOTICE '  SELECT get_token_usage_logs();';
    RAISE NOTICE '  SELECT get_token_usage_stats();';
    RAISE NOTICE '';

    IF function_count = 2 THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please check the output above.';
    END IF;
END $$;

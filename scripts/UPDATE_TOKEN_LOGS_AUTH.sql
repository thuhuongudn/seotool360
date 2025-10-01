-- ============================================
-- UPDATE TOKEN LOGS AUTH - FIX AUTH.UID() ERROR
-- ============================================
-- Run this to fix "Failed to perform authorization check" error
-- This updates get_token_usage_logs and get_token_usage_stats functions

-- Drop and recreate get_token_usage_logs with better error handling
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
    v_is_admin boolean := false;
    v_current_user_id text;
    v_logs json;
BEGIN
    -- Get current user from auth context
    BEGIN
        v_current_user_id := auth.uid()::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'AUTH_ERROR',
            'message', 'Failed to perform authorization check. Please try again later.'
        );
    END;

    -- If no user in auth context, deny access
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'Access denied. Admin privileges required.'
        );
    END IF;

    -- Check admin role
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = v_current_user_id
        AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'Access denied. Admin privileges required.'
        );
    END IF;

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

GRANT EXECUTE ON FUNCTION public.get_token_usage_logs(text, character varying, timestamptz, timestamptz, integer, integer) TO authenticated;

-- Drop and recreate get_token_usage_stats with better error handling
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
    v_is_admin boolean := false;
    v_current_user_id text;
    v_stats json;
BEGIN
    -- Get current user from auth context
    BEGIN
        v_current_user_id := auth.uid()::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'AUTH_ERROR',
            'message', 'Failed to perform authorization check. Please try again later.'
        );
    END;

    -- If no user in auth context, deny access
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'Access denied. Admin privileges required.'
        );
    END IF;

    -- Check admin role
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = v_current_user_id
        AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'Access denied. Admin privileges required.'
        );
    END IF;

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
        'total_requests', (SELECT total_requests FROM total_stats),
        'total_tokens_consumed', (SELECT total_tokens_consumed FROM total_stats),
        'unique_users', (SELECT unique_users FROM total_stats),
        'unique_tools', (SELECT unique_tools FROM total_stats),
        'top_users', COALESCE((SELECT json_agg(by_user.*) FROM by_user), '[]'::json),
        'top_tools', COALESCE((SELECT json_agg(by_tool.*) FROM by_tool), '[]'::json)
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

GRANT EXECUTE ON FUNCTION public.get_token_usage_stats(text, timestamptz, timestamptz) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Token logs auth functions updated successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated functions:';
    RAISE NOTICE '  • get_token_usage_logs()';
    RAISE NOTICE '  • get_token_usage_stats()';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '  • Added better error handling for auth.uid()';
    RAISE NOTICE '  • Added NULL check for auth context';
    RAISE NOTICE '  • Improved error messages';
    RAISE NOTICE '';
    RAISE NOTICE 'Test your UI again at /admin/token-logs';
END $$;

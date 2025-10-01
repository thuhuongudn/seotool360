-- ============================================
-- RUN ALL TOKEN LOGS MIGRATIONS (FIXED)
-- ============================================
-- This script fixes the data type issue: tool_id should be VARCHAR not UUID

-- ============================================
-- MIGRATION 10: Create Token Usage Logs Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.token_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id text NOT NULL,
    tool_id character varying NOT NULL,  -- FIXED: Changed from uuid to varchar
    consumed integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT token_usage_logs_consumed_positive CHECK (consumed > 0),

    -- Foreign keys
    CONSTRAINT token_usage_logs_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    CONSTRAINT token_usage_logs_tool_id_fkey
        FOREIGN KEY (tool_id)
        REFERENCES public.seo_tools(id)
        ON DELETE CASCADE
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_token_logs_user_date
ON public.token_usage_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_logs_tool_date
ON public.token_usage_logs(tool_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_logs_created_at
ON public.token_usage_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_token_logs_user_tool
ON public.token_usage_logs(user_id, tool_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.token_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS token_usage_logs_service_manage ON public.token_usage_logs;
CREATE POLICY token_usage_logs_service_manage ON public.token_usage_logs
    FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS token_usage_logs_admin_view ON public.token_usage_logs;
CREATE POLICY token_usage_logs_admin_view ON public.token_usage_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
        )
    );

-- ============================================
-- MIGRATION 11: Update consume_token with logging
-- ============================================

CREATE OR REPLACE FUNCTION public.consume_token(
    p_user_id text,
    p_tool_id character varying,  -- FIXED: Changed from uuid to varchar
    p_tokens_to_consume integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_daily_limit integer;
    v_current_usage RECORD;
    v_tokens_used integer;
    v_tokens_remaining integer;
    v_result json;
BEGIN
    -- Validate input
    IF p_tokens_to_consume < 1 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_TOKEN_AMOUNT',
            'message', 'Token amount must be at least 1',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    END IF;

    -- Validate tool_id exists
    IF NOT EXISTS (SELECT 1 FROM public.seo_tools WHERE id = p_tool_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'TOOL_NOT_FOUND',
            'message', 'Tool not found',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    END IF;

    -- Get user profile with lock
    SELECT user_id, plan, status, trial_ends_at, member_ends_at
    INTO v_profile
    FROM public.profiles
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND',
            'message', 'User not found',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    END IF;

    IF v_profile.status != 'active' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_ACTIVE',
            'message', 'User account is not active',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    END IF;

    -- Check expiry
    IF v_profile.plan = 'trial' AND v_profile.trial_ends_at < now() THEN
        UPDATE public.profiles SET status = 'pending' WHERE user_id = p_user_id;
        RETURN json_build_object(
            'success', false,
            'error', 'TRIAL_EXPIRED',
            'message', 'Trial period has expired',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    END IF;

    IF v_profile.plan = 'member' AND v_profile.member_ends_at IS NOT NULL AND v_profile.member_ends_at < now() THEN
        UPDATE public.profiles SET status = 'pending' WHERE user_id = p_user_id;
        RETURN json_build_object(
            'success', false,
            'error', 'MEMBERSHIP_EXPIRED',
            'message', 'Membership has expired',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    END IF;

    -- Get daily limit
    SELECT daily_token_limit INTO v_daily_limit
    FROM public.plan_quota
    WHERE plan = v_profile.plan AND is_active = true;

    IF v_daily_limit IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'PLAN_NOT_FOUND',
            'message', 'No active quota found',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    END IF;

    -- Get or create today's usage
    SELECT id, tokens_used, tokens_limit
    INTO v_current_usage
    FROM public.daily_token_usage
    WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.daily_token_usage (user_id, usage_date, tokens_used, tokens_limit)
        VALUES (p_user_id, CURRENT_DATE, 0, v_daily_limit)
        RETURNING id, tokens_used, tokens_limit INTO v_current_usage;
    END IF;

    -- Check quota
    v_tokens_remaining := v_current_usage.tokens_limit - v_current_usage.tokens_used;

    IF v_tokens_remaining < p_tokens_to_consume THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INSUFFICIENT_TOKENS',
            'message', 'Not enough tokens remaining',
            'tokens_used', v_current_usage.tokens_used,
            'tokens_remaining', v_tokens_remaining,
            'daily_limit', v_current_usage.tokens_limit
        );
    END IF;

    -- Consume tokens
    UPDATE public.daily_token_usage
    SET tokens_used = tokens_used + p_tokens_to_consume
    WHERE id = v_current_usage.id
    RETURNING tokens_used INTO v_tokens_used;

    -- LOG TOKEN USAGE
    INSERT INTO public.token_usage_logs (user_id, tool_id, consumed)
    VALUES (p_user_id, p_tool_id, p_tokens_to_consume);

    v_tokens_remaining := v_current_usage.tokens_limit - v_tokens_used;

    RETURN json_build_object(
        'success', true,
        'message', 'Tokens consumed successfully',
        'tokens_used', v_tokens_used,
        'tokens_remaining', v_tokens_remaining,
        'daily_limit', v_current_usage.tokens_limit,
        'consumed_tokens', p_tokens_to_consume
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INTERNAL_ERROR',
            'message', 'An error occurred: ' || SQLERRM,
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_token(text, character varying, integer) TO authenticated, service_role;

-- ============================================
-- MIGRATION 12: Cleanup function
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_token_usage_logs()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count integer;
    v_cutoff_date timestamptz;
BEGIN
    v_cutoff_date := now() - interval '90 days';

    WITH deleted AS (
        DELETE FROM public.token_usage_logs
        WHERE created_at < v_cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;

    RETURN json_build_object(
        'success', true,
        'deleted_count', v_deleted_count,
        'cutoff_date', v_cutoff_date,
        'message', format('Deleted %s logs older than 90 days', v_deleted_count)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'CLEANUP_FAILED',
            'message', 'An error occurred: ' || SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_token_usage_logs() TO service_role;

-- ============================================
-- MIGRATION 13: Query functions
-- ============================================

CREATE OR REPLACE FUNCTION public.get_token_usage_logs(
    p_user_id text DEFAULT NULL,
    p_tool_id character varying DEFAULT NULL,  -- FIXED: Changed from uuid to varchar
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

GRANT EXECUTE ON FUNCTION public.get_token_usage_stats(text, timestamptz, timestamptz) TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    v_table_exists boolean;
    v_index_count integer;
    v_function_count integer;
BEGIN
    -- Check table
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'token_usage_logs'
    ) INTO v_table_exists;

    -- Count indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'token_usage_logs';

    -- Count functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'consume_token',
        'cleanup_token_usage_logs',
        'get_token_usage_logs',
        'get_token_usage_stats'
    );

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TOKEN USAGE LOGS - MIGRATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table created: %', v_table_exists;
    RAISE NOTICE 'Indexes created: %', v_index_count;
    RAISE NOTICE 'Functions created: %', v_function_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    IF v_table_exists AND v_index_count >= 4 AND v_function_count = 4 THEN
        RAISE NOTICE '✅ All migrations applied successfully!';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Refresh your app at /admin/token-logs';
        RAISE NOTICE '2. Test token consumption with tools';
        RAISE NOTICE '3. Check logs appear in admin dashboard';
    ELSE
        RAISE WARNING '⚠️  Some migrations may have failed';
        RAISE NOTICE 'Table: %, Indexes: %, Functions: %', v_table_exists, v_index_count, v_function_count;
    END IF;

    RAISE NOTICE '';
END $$;

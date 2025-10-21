-- ============================================
-- MIGRATION 03: Create Daily Token Usage System
-- ============================================
-- This migration creates the daily_token_usage table and
-- consume_token RPC function to manage token consumption.

-- ============================================
-- CREATE DAILY_TOKEN_USAGE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.daily_token_usage (
    id text DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id text NOT NULL,
    usage_date date NOT NULL DEFAULT CURRENT_DATE,
    tokens_used integer DEFAULT 0 NOT NULL,
    tokens_limit integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT daily_token_usage_tokens_used_non_negative CHECK (tokens_used >= 0),
    CONSTRAINT daily_token_usage_tokens_limit_positive CHECK (tokens_limit > 0),
    CONSTRAINT daily_token_usage_unique_user_date UNIQUE (user_id, usage_date)
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Index for querying by user and date
CREATE INDEX IF NOT EXISTS daily_token_usage_user_date_idx
ON public.daily_token_usage(user_id, usage_date DESC);

-- Index for cleanup old records
CREATE INDEX IF NOT EXISTS daily_token_usage_date_idx
ON public.daily_token_usage(usage_date);

-- ============================================
-- CREATE UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.update_daily_token_usage_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_daily_token_usage_updated_at ON public.daily_token_usage;

CREATE TRIGGER trigger_daily_token_usage_updated_at
    BEFORE UPDATE ON public.daily_token_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.update_daily_token_usage_updated_at();

-- ============================================
-- CREATE RPC: consume_token
-- ============================================
-- NOTE: This function has been DEPRECATED and replaced by the version in
-- 11-update-consume-token-with-logging.sql which includes p_tool_id parameter
-- and logging functionality. Do NOT uncomment this to avoid function overloading conflicts.
--
-- To remove the old version from database, run:
-- DROP FUNCTION IF EXISTS public.consume_token(text, integer);

-- DEPRECATED: Old 2-parameter version (kept for reference only)
/*
CREATE OR REPLACE FUNCTION public.consume_token(
    p_user_id text,
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

    -- Get user profile with lock to prevent race conditions
    SELECT user_id, plan, status, trial_ends_at, member_ends_at
    INTO v_profile
    FROM public.profiles
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if user exists
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

    -- Check if user status is active
    IF v_profile.status != 'active' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_ACTIVE',
            'message', 'User account is not active (status: ' || v_profile.status || ')',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    END IF;

    -- Check if member/trial has expired
    -- Priority: Check member_ends_at first if exists, otherwise check trial_ends_at
    IF v_profile.member_ends_at IS NOT NULL AND v_profile.member_ends_at < now() THEN
        -- Auto-update status to pending
        UPDATE public.profiles
        SET status = 'pending'
        WHERE user_id = p_user_id;

        RETURN json_build_object(
            'success', false,
            'error', 'MEMBERSHIP_EXPIRED',
            'message', 'Membership has expired',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0,
            'expired_at', v_profile.member_ends_at
        );
    END IF;

    IF v_profile.trial_ends_at IS NOT NULL AND v_profile.trial_ends_at < now() THEN
        -- Auto-update status to pending
        UPDATE public.profiles
        SET status = 'pending'
        WHERE user_id = p_user_id;

        RETURN json_build_object(
            'success', false,
            'error', 'TRIAL_EXPIRED',
            'message', 'Trial period has expired',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0,
            'expired_at', v_profile.trial_ends_at
        );
    END IF;

    -- Get daily limit for user's plan
    SELECT daily_token_limit INTO v_daily_limit
    FROM public.plan_quota
    WHERE plan = v_profile.plan
    AND is_active = true;

    IF v_daily_limit IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'PLAN_NOT_FOUND',
            'message', 'No active quota found for plan: ' || v_profile.plan,
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    END IF;

    -- Get or create today's usage record
    SELECT id, tokens_used, tokens_limit
    INTO v_current_usage
    FROM public.daily_token_usage
    WHERE user_id = p_user_id
    AND usage_date = CURRENT_DATE
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Create new record for today
        INSERT INTO public.daily_token_usage (user_id, usage_date, tokens_used, tokens_limit)
        VALUES (p_user_id, CURRENT_DATE, 0, v_daily_limit)
        RETURNING id, tokens_used, tokens_limit INTO v_current_usage;
    END IF;

    -- Check if user has enough tokens
    v_tokens_remaining := v_current_usage.tokens_limit - v_current_usage.tokens_used;

    IF v_tokens_remaining < p_tokens_to_consume THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INSUFFICIENT_TOKENS',
            'message', 'Not enough tokens remaining',
            'tokens_used', v_current_usage.tokens_used,
            'tokens_remaining', v_tokens_remaining,
            'daily_limit', v_current_usage.tokens_limit,
            'requested_tokens', p_tokens_to_consume
        );
    END IF;

    -- Consume tokens
    UPDATE public.daily_token_usage
    SET tokens_used = tokens_used + p_tokens_to_consume
    WHERE id = v_current_usage.id
    RETURNING tokens_used INTO v_tokens_used;

    v_tokens_remaining := v_current_usage.tokens_limit - v_tokens_used;

    -- Return success
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
*/

-- ============================================
-- CREATE RPC: get_user_token_usage
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_token_usage(
    p_user_id text,
    p_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_usage RECORD;
    v_daily_limit integer;
    v_result json;
BEGIN
    -- Get daily limit
    SELECT pq.daily_token_limit INTO v_daily_limit
    FROM public.profiles p
    JOIN public.plan_quota pq ON pq.plan = p.plan
    WHERE p.user_id = p_user_id
    AND pq.is_active = true;

    IF v_daily_limit IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_OR_PLAN_NOT_FOUND',
            'message', 'User or plan not found'
        );
    END IF;

    -- Get usage for specified date
    SELECT tokens_used, tokens_limit
    INTO v_usage
    FROM public.daily_token_usage
    WHERE user_id = p_user_id
    AND usage_date = p_date;

    IF NOT FOUND THEN
        -- No usage yet today
        RETURN json_build_object(
            'success', true,
            'usage_date', p_date,
            'tokens_used', 0,
            'tokens_remaining', v_daily_limit,
            'daily_limit', v_daily_limit,
            'usage_percentage', 0
        );
    END IF;

    -- Return usage data
    RETURN json_build_object(
        'success', true,
        'usage_date', p_date,
        'tokens_used', v_usage.tokens_used,
        'tokens_remaining', v_usage.tokens_limit - v_usage.tokens_used,
        'daily_limit', v_usage.tokens_limit,
        'usage_percentage', ROUND((v_usage.tokens_used::numeric / v_usage.tokens_limit::numeric) * 100, 2)
    );
END;
$$;

-- ============================================
-- CREATE RPC: reset_daily_token_usage
-- ============================================
-- Admin function to reset usage for a user

CREATE OR REPLACE FUNCTION public.reset_daily_token_usage(
    p_user_id text,
    p_date date DEFAULT CURRENT_DATE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
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
            'message', 'Only admins can reset token usage'
        );
    END IF;

    -- Reset usage
    UPDATE public.daily_token_usage
    SET tokens_used = 0
    WHERE user_id = p_user_id
    AND usage_date = p_date;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'NOT_FOUND',
            'message', 'No usage record found for this user and date'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Token usage reset successfully',
        'user_id', p_user_id,
        'date', p_date
    );
END;
$$;

-- ============================================
-- ENABLE RLS ON DAILY_TOKEN_USAGE TABLE
-- ============================================

ALTER TABLE public.daily_token_usage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Users can view their own token usage
DROP POLICY IF EXISTS daily_token_usage_own_view ON public.daily_token_usage;
CREATE POLICY daily_token_usage_own_view ON public.daily_token_usage
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Service role and RPC functions can manage token usage
DROP POLICY IF EXISTS daily_token_usage_service_manage ON public.daily_token_usage;
CREATE POLICY daily_token_usage_service_manage ON public.daily_token_usage
    FOR ALL
    USING (auth.role() = 'service_role');

-- Admins can view all token usage
DROP POLICY IF EXISTS daily_token_usage_admin_view ON public.daily_token_usage;
CREATE POLICY daily_token_usage_admin_view ON public.daily_token_usage
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
        )
    );

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.consume_token(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_token_usage(text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_token_usage(text, date) TO authenticated;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    function_count INTEGER;
    policy_count INTEGER;
    table_exists boolean;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'daily_token_usage'
    ) INTO table_exists;

    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN ('consume_token', 'get_user_token_usage', 'reset_daily_token_usage');

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'daily_token_usage';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 03 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table daily_token_usage created: %', table_exists;
    RAISE NOTICE 'RPC functions created: % / 3', function_count;
    RAISE NOTICE 'RLS policies created: % / 3', policy_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Features:';
    RAISE NOTICE '  ✓ consume_token() - Consume tokens with validation';
    RAISE NOTICE '  ✓ get_user_token_usage() - Get current usage';
    RAISE NOTICE '  ✓ reset_daily_token_usage() - Admin reset function';
    RAISE NOTICE '  ✓ Auto-expire trial/member on consume';
    RAISE NOTICE '  ✓ Race condition protection with FOR UPDATE';
    RAISE NOTICE '';

    IF table_exists AND function_count = 3 AND policy_count = 3 THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please check the output above.';
    END IF;
END $$;
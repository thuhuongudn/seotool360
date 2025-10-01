-- ============================================
-- MIGRATION 11: Update consume_token RPC to Log Usage
-- ============================================
-- This migration updates the consume_token function to insert
-- a log entry into token_usage_logs after successful consumption.

-- ============================================
-- UPDATE RPC: consume_token (with logging)
-- ============================================

CREATE OR REPLACE FUNCTION public.consume_token(
    p_user_id text,
    p_tool_id uuid,
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

    -- Check if trial/member has expired
    IF v_profile.plan = 'trial' AND v_profile.trial_ends_at < now() THEN
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

    IF v_profile.plan = 'member' AND v_profile.member_ends_at IS NOT NULL AND v_profile.member_ends_at < now() THEN
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

    -- ============================================
    -- NEW: LOG TOKEN USAGE
    -- ============================================
    INSERT INTO public.token_usage_logs (user_id, tool_id, consumed)
    VALUES (p_user_id, p_tool_id, p_tokens_to_consume);
    -- ============================================

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

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.consume_token(text, uuid, integer) TO authenticated, service_role;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    function_exists boolean;
    function_params text;
BEGIN
    -- Check if updated function exists with correct signature
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'consume_token'
        AND pg_get_function_arguments(p.oid) LIKE '%p_tool_id uuid%'
    ) INTO function_exists;

    -- Get function parameters
    SELECT pg_get_function_arguments(p.oid) INTO function_params
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'consume_token'
    LIMIT 1;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 11 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Function consume_token updated: %', function_exists;
    RAISE NOTICE 'Function signature: %', function_params;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Changes:';
    RAISE NOTICE '  ✓ Added p_tool_id uuid parameter';
    RAISE NOTICE '  ✓ Validates tool_id exists before consumption';
    RAISE NOTICE '  ✓ Inserts log entry after successful consumption';
    RAISE NOTICE '  ✓ Log includes user_id, tool_id, and consumed amount';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Update all consume_token calls to include tool_id!';
    RAISE NOTICE '';

    IF function_exists THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration failed. Function signature may be incorrect.';
    END IF;
END $$;

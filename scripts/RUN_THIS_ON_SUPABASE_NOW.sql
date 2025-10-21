-- ============================================
-- 🚨 CRITICAL FIX - RUN THIS ON SUPABASE NOW!
-- ============================================
-- This script fixes the PGRST203 error by:
-- 1. Dropping ALL versions of consume_token function
-- 2. Creating the CORRECT version with UUID parameter
-- 3. Updating expiry logic to prioritize member_ends_at
--
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Drop ALL versions of consume_token
-- ============================================

DO $$
DECLARE
    func_record RECORD;
    func_count integer := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 1: Checking existing consume_token functions';
    RAISE NOTICE '========================================';

    -- List all existing versions
    FOR func_record IN
        SELECT oid::regprocedure::text as signature
        FROM pg_proc
        WHERE proname = 'consume_token'
    LOOP
        func_count := func_count + 1;
        RAISE NOTICE '  Found: %', func_record.signature;
    END LOOP;

    IF func_count = 0 THEN
        RAISE NOTICE '  No consume_token functions found';
    ELSE
        RAISE NOTICE '  Total: % function(s) to drop', func_count;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Dropping ALL versions...';

    -- Drop ALL possible versions
    DROP FUNCTION IF EXISTS public.consume_token(text, integer) CASCADE;
    DROP FUNCTION IF EXISTS public.consume_token(text, character varying, integer) CASCADE;
    DROP FUNCTION IF EXISTS public.consume_token(text, varchar, integer) CASCADE;
    DROP FUNCTION IF EXISTS public.consume_token(text, uuid, integer) CASCADE;

    RAISE NOTICE '  ✓ All versions dropped successfully';
END $$;

-- ============================================
-- STEP 2: Create CORRECT version with UUID
-- ============================================

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'STEP 2: Creating correct consume_token function';
RAISE NOTICE '========================================';

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
    SELECT user_id, plan, status, trial_ends_at, member_ends_at, role
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

    -- Admin bypass: unlimited tokens
    IF v_profile.role = 'admin' THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Admin user - unlimited tokens',
            'tokens_used', 0,
            'tokens_remaining', 999999,
            'daily_limit', 999999,
            'consumed_tokens', 0,
            'is_admin', true
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
        UPDATE public.profiles SET status = 'pending' WHERE user_id = p_user_id;
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
        UPDATE public.profiles SET status = 'pending' WHERE user_id = p_user_id;
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
    WHERE plan = v_profile.plan AND is_active = true;

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
    WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
    FOR UPDATE;

    IF NOT FOUND THEN
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

    -- Log token usage
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

RAISE NOTICE '  ✓ Created consume_token(text, uuid, integer)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.consume_token(text, uuid, integer) TO authenticated, service_role;
RAISE NOTICE '  ✓ Granted permissions to authenticated & service_role';

-- ============================================
-- STEP 3: Update expiry scheduled job
-- ============================================

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'STEP 3: Updating expiry scheduled job';
RAISE NOTICE '========================================';

CREATE OR REPLACE FUNCTION public.expire_trial_and_member_plans()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expired_trials integer := 0;
    v_expired_members integer := 0;
    v_total_expired integer := 0;
BEGIN
    -- Expire member plans first (priority)
    UPDATE public.profiles
    SET status = 'pending'
    WHERE status = 'active'
    AND member_ends_at IS NOT NULL
    AND member_ends_at < now();

    GET DIAGNOSTICS v_expired_members = ROW_COUNT;

    -- Expire trial plans (only if no member_ends_at or member_ends_at is in future)
    UPDATE public.profiles
    SET status = 'pending'
    WHERE status = 'active'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < now()
    AND (member_ends_at IS NULL OR member_ends_at >= now());

    GET DIAGNOSTICS v_expired_trials = ROW_COUNT;

    v_total_expired := v_expired_trials + v_expired_members;

    RETURN json_build_object(
        'success', true,
        'timestamp', now(),
        'expired_trials', v_expired_trials,
        'expired_members', v_expired_members,
        'total_expired', v_total_expired
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', now()
        );
END;
$$;

RAISE NOTICE '  ✓ Updated expire_trial_and_member_plans()';

-- ============================================
-- FINAL VERIFICATION
-- ============================================

DO $$
DECLARE
    func_count integer;
    func_signature text;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '========================================';

    -- Count consume_token functions
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname = 'consume_token';

    IF func_count = 1 THEN
        SELECT pg_get_function_identity_arguments(oid) INTO func_signature
        FROM pg_proc
        WHERE proname = 'consume_token';

        RAISE NOTICE '✅ SUCCESS: Only ONE consume_token function exists';
        RAISE NOTICE '   Signature: consume_token(%)', func_signature;

        -- Verify it's the UUID version
        IF func_signature LIKE '%uuid%' THEN
            RAISE NOTICE '   ✓ Correct type: UUID';
        ELSE
            RAISE WARNING '   ⚠ Warning: Not UUID type!';
        END IF;
    ELSIF func_count = 0 THEN
        RAISE WARNING '❌ ERROR: No consume_token function found!';
    ELSE
        RAISE WARNING '❌ ERROR: Multiple consume_token functions exist: %', func_count;

        FOR func_signature IN
            SELECT pg_get_function_identity_arguments(oid)
            FROM pg_proc
            WHERE proname = 'consume_token'
        LOOP
            RAISE NOTICE '   - consume_token(%)', func_signature;
        END LOOP;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Migration completed!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test your app - try using a tool';
    RAISE NOTICE '  2. Check for PGRST203 errors in console';
    RAISE NOTICE '  3. If errors persist, contact support';
    RAISE NOTICE '';
END $$;

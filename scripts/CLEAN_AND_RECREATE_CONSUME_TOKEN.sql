-- ============================================
-- 🔥 CLEAN SLATE - DELETE ALL & RECREATE
-- ============================================
-- This REMOVES all consume_token versions and creates ONE correct version
-- that accepts VARCHAR (since client is sending VARCHAR, not UUID)
--
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: DROP ALL VERSIONS
-- ============================================

DO $$
DECLARE
    func_count integer;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 1: Dropping ALL consume_token functions';
    RAISE NOTICE '========================================';

    -- Count before
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname = 'consume_token';

    RAISE NOTICE 'Found % function(s) to drop', func_count;

    -- Drop ALL possible versions
    DROP FUNCTION IF EXISTS public.consume_token(text, integer) CASCADE;
    DROP FUNCTION IF EXISTS public.consume_token(text, character varying, integer) CASCADE;
    DROP FUNCTION IF EXISTS public.consume_token(text, varchar, integer) CASCADE;
    DROP FUNCTION IF EXISTS public.consume_token(text, uuid, integer) CASCADE;

    RAISE NOTICE '✓ All versions dropped';

    -- Verify
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname = 'consume_token';

    IF func_count = 0 THEN
        RAISE NOTICE '✓ Confirmed: No consume_token functions exist';
    ELSE
        RAISE WARNING '⚠ Still found % function(s)!', func_count;
    END IF;
END $$;

-- ============================================
-- STEP 2: Fix token_usage_logs schema (if needed)
-- ============================================

DO $$
DECLARE
    has_created_at boolean;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 2: Fixing token_usage_logs schema';
    RAISE NOTICE '========================================';

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'token_usage_logs'
        AND column_name = 'created_at'
    ) INTO has_created_at;

    IF has_created_at THEN
        RAISE NOTICE '✓ created_at column exists';
    ELSE
        RAISE NOTICE 'Adding created_at column...';

        ALTER TABLE public.token_usage_logs
        ADD COLUMN created_at timestamp without time zone DEFAULT now() NOT NULL;

        CREATE INDEX IF NOT EXISTS token_usage_logs_created_at_idx
        ON public.token_usage_logs(created_at DESC);

        RAISE NOTICE '✓ created_at column added';
    END IF;
END $$;

-- ============================================
-- STEP 3: Create SINGLE consume_token function
-- ============================================
-- This version accepts VARCHAR (what client sends)
-- and converts tool_id to UUID internally

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 3: Creating NEW consume_token function';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Signature: consume_token(text, varchar, integer)';
END $$;

CREATE OR REPLACE FUNCTION public.consume_token(
    p_user_id text,
    p_tool_id character varying,  -- Accept VARCHAR (client sends this)
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
    v_tool_id_uuid uuid;
BEGIN
    -- Validate and convert tool_id to UUID
    BEGIN
        v_tool_id_uuid := p_tool_id::uuid;
    EXCEPTION
        WHEN invalid_text_representation THEN
            RETURN json_build_object(
                'success', false,
                'error', 'INVALID_TOOL_ID',
                'message', 'tool_id must be a valid UUID: ' || p_tool_id,
                'tokens_used', 0,
                'tokens_remaining', 0,
                'daily_limit', 0
            );
    END;

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

    -- Validate tool exists
    IF NOT EXISTS (SELECT 1 FROM public.seo_tools WHERE id = v_tool_id_uuid) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'TOOL_NOT_FOUND',
            'message', 'Tool not found: ' || p_tool_id,
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    END IF;

    -- Get user profile
    SELECT user_id, plan, status, trial_ends_at, member_ends_at, role
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

    -- Admin bypass
    IF v_profile.role = 'admin' THEN
        -- Log usage even for admin
        INSERT INTO public.token_usage_logs (user_id, tool_id, consumed)
        VALUES (p_user_id, v_tool_id_uuid, 0);

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

    -- Check status
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

    -- Check expiry (member_ends_at first)
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

    -- Get daily limit
    SELECT daily_token_limit INTO v_daily_limit
    FROM public.plan_quota
    WHERE plan = v_profile.plan AND is_active = true;

    IF v_daily_limit IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'PLAN_NOT_FOUND',
            'message', 'No active quota for plan: ' || v_profile.plan,
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

    -- Check sufficient tokens
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

    -- Log usage
    INSERT INTO public.token_usage_logs (user_id, tool_id, consumed)
    VALUES (p_user_id, v_tool_id_uuid, p_tokens_to_consume);

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
            'message', 'Error: ' || SQLERRM,
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.consume_token(text, character varying, integer) TO authenticated, service_role;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

DO $$
DECLARE
    func_count integer;
    func_signature text;
    has_created_at boolean;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '========================================';

    -- Count functions
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname = 'consume_token';

    IF func_count = 1 THEN
        SELECT pg_get_function_identity_arguments(oid) INTO func_signature
        FROM pg_proc
        WHERE proname = 'consume_token';

        RAISE NOTICE '✅ SUCCESS: Exactly ONE consume_token function exists';
        RAISE NOTICE '   Signature: consume_token(%)', func_signature;
    ELSIF func_count = 0 THEN
        RAISE WARNING '❌ ERROR: No consume_token function!';
    ELSE
        RAISE WARNING '❌ ERROR: Multiple functions exist: %', func_count;
    END IF;

    -- Check created_at
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'token_usage_logs'
        AND column_name = 'created_at'
    ) INTO has_created_at;

    IF has_created_at THEN
        RAISE NOTICE '✅ token_usage_logs.created_at exists';
    ELSE
        RAISE WARNING '❌ token_usage_logs.created_at MISSING';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Function: consume_token(text, varchar, integer)';
    RAISE NOTICE 'Client can call with tool_id as string';
    RAISE NOTICE 'Function will convert to UUID internally';
    RAISE NOTICE '';
END $$;

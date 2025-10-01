-- Migration 09: Fix token reset when plan changes
-- This migration updates admin_update_user_plan to reset daily token usage when plan changes

CREATE OR REPLACE FUNCTION public.admin_update_user_plan(
    p_user_id text,
    p_plan text,
    p_trial_ends_at timestamp without time zone DEFAULT NULL,
    p_member_ends_at timestamp without time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin boolean;
    v_old_plan text;
    v_old_trial_ends_at timestamp without time zone;
    v_old_member_ends_at timestamp without time zone;
    v_new_trial_ends_at timestamp without time zone;
    v_new_member_ends_at timestamp without time zone;
    v_plan_changed boolean := false;
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
            'message', 'Only admins can update user plans'
        );
    END IF;

    -- Validate plan
    IF p_plan NOT IN ('trial', 'member') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_PLAN',
            'message', 'Plan must be either trial or member'
        );
    END IF;

    -- Get old values
    SELECT plan, trial_ends_at, member_ends_at
    INTO v_old_plan, v_old_trial_ends_at, v_old_member_ends_at
    FROM public.profiles
    WHERE user_id = p_user_id;

    IF v_old_plan IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND',
            'message', 'User not found'
        );
    END IF;

    -- Check if plan changed
    v_plan_changed := (v_old_plan != p_plan);

    -- Calculate new dates
    v_new_trial_ends_at := CASE
        WHEN p_plan = 'trial' THEN COALESCE(p_trial_ends_at, v_old_trial_ends_at, now() + INTERVAL '30 days')
        ELSE v_old_trial_ends_at
    END;

    v_new_member_ends_at := CASE
        WHEN p_plan = 'member' THEN COALESCE(p_member_ends_at, v_old_member_ends_at)
        ELSE v_old_member_ends_at
    END;

    -- Update plan
    UPDATE public.profiles
    SET
        plan = p_plan,
        trial_ends_at = v_new_trial_ends_at,
        member_ends_at = v_new_member_ends_at
    WHERE user_id = p_user_id;

    -- IMPORTANT: Reset daily token usage when plan changes
    -- This allows user to immediately get the new quota
    IF v_plan_changed THEN
        DELETE FROM public.daily_token_usage
        WHERE user_id = p_user_id
        AND usage_date = CURRENT_DATE;

        RAISE NOTICE 'Reset daily token usage for user % (plan changed from % to %)',
            p_user_id, v_old_plan, p_plan;
    END IF;

    -- Log audit event
    PERFORM public.log_audit_event(
        'update_plan',
        p_user_id,
        'profile',
        p_user_id,
        json_build_object(
            'plan', v_old_plan,
            'trial_ends_at', v_old_trial_ends_at,
            'member_ends_at', v_old_member_ends_at
        )::jsonb,
        json_build_object(
            'plan', p_plan,
            'trial_ends_at', v_new_trial_ends_at,
            'member_ends_at', v_new_member_ends_at,
            'token_reset', v_plan_changed
        )::jsonb
    );

    RETURN json_build_object(
        'success', true,
        'message', 'User plan updated successfully',
        'user_id', p_user_id,
        'old_plan', v_old_plan,
        'new_plan', p_plan,
        'token_reset', v_plan_changed
    );
END;
$$;

-- Grant execute permission to authenticated users (will be checked by SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.admin_update_user_plan TO authenticated;

COMMENT ON FUNCTION public.admin_update_user_plan IS 'Admin function to update user plan and reset daily token usage when plan changes';

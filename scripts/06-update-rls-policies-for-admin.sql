-- ============================================
-- MIGRATION 06: Update RLS Policies for Admin Management
-- ============================================
-- This migration updates RLS policies to ensure proper
-- admin management capabilities for the new plan/status fields.

-- ============================================
-- UPDATE PROFILES TABLE POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS profile_own_access ON public.profiles;
DROP POLICY IF EXISTS profile_own_read ON public.profiles;
DROP POLICY IF EXISTS profile_own_update ON public.profiles;
DROP POLICY IF EXISTS profile_admin_access ON public.profiles;
DROP POLICY IF EXISTS profile_admin_read ON public.profiles;
DROP POLICY IF EXISTS profile_admin_manage ON public.profiles;
DROP POLICY IF EXISTS profile_admin_full_access ON public.profiles;

-- Users can view their own profile
CREATE POLICY profile_own_read ON public.profiles
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Users can only update their own username (not plan, status, role, dates)
-- Note: RLS cannot directly prevent field updates, so we use a trigger for validation
CREATE POLICY profile_own_update ON public.profiles
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Admins can view all profiles
CREATE POLICY profile_admin_read ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
        )
    );

-- Admins can fully manage all profiles (including plan, status, role, etc.)
CREATE POLICY profile_admin_manage ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
        )
    );

-- ============================================
-- CREATE TRIGGER TO PREVENT USER SELF-UPDATE OF PROTECTED FIELDS
-- ============================================

-- Function to prevent non-admin users from updating protected fields
CREATE OR REPLACE FUNCTION public.prevent_protected_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
BEGIN
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()::text
        AND role = 'admin'
    ) INTO v_is_admin;

    -- If admin, allow all updates
    IF v_is_admin THEN
        RETURN NEW;
    END IF;

    -- For non-admin users, prevent changes to protected fields
    IF OLD.plan IS DISTINCT FROM NEW.plan THEN
        RAISE EXCEPTION 'Cannot update plan field';
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
        RAISE EXCEPTION 'Cannot update status field';
    END IF;

    IF OLD.role IS DISTINCT FROM NEW.role THEN
        RAISE EXCEPTION 'Cannot update role field';
    END IF;

    IF OLD.trial_ends_at IS DISTINCT FROM NEW.trial_ends_at THEN
        RAISE EXCEPTION 'Cannot update trial_ends_at field';
    END IF;

    IF OLD.member_ends_at IS DISTINCT FROM NEW.member_ends_at THEN
        RAISE EXCEPTION 'Cannot update member_ends_at field';
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_prevent_protected_field_updates ON public.profiles;

-- Create trigger
CREATE TRIGGER trigger_prevent_protected_field_updates
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_protected_field_updates();

-- ============================================
-- CREATE ADMIN HELPER FUNCTIONS
-- ============================================

-- Function: Admin update user plan
CREATE OR REPLACE FUNCTION public.admin_update_user_plan(
    p_user_id text,
    p_plan text,
    p_trial_ends_at timestamp without time zone DEFAULT NULL,
    p_member_ends_at timestamp without time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
    v_old_plan text;
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

    -- Get old plan
    SELECT plan INTO v_old_plan
    FROM public.profiles
    WHERE user_id = p_user_id;

    IF v_old_plan IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND',
            'message', 'User not found'
        );
    END IF;

    -- Update plan
    UPDATE public.profiles
    SET
        plan = p_plan,
        trial_ends_at = CASE
            WHEN p_plan = 'trial' THEN COALESCE(p_trial_ends_at, trial_ends_at, now() + INTERVAL '30 days')
            ELSE trial_ends_at
        END,
        member_ends_at = CASE
            WHEN p_plan = 'member' THEN COALESCE(p_member_ends_at, member_ends_at)
            ELSE member_ends_at
        END
    WHERE user_id = p_user_id;

    RETURN json_build_object(
        'success', true,
        'message', 'User plan updated successfully',
        'user_id', p_user_id,
        'old_plan', v_old_plan,
        'new_plan', p_plan
    );
END;
$$;

-- Function: Admin update user status
CREATE OR REPLACE FUNCTION public.admin_update_user_status(
    p_user_id text,
    p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
    v_old_status text;
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
            'message', 'Only admins can update user status'
        );
    END IF;

    -- Validate status
    IF p_status NOT IN ('active', 'pending', 'disabled') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_STATUS',
            'message', 'Status must be active, pending, or disabled'
        );
    END IF;

    -- Get old status
    SELECT status INTO v_old_status
    FROM public.profiles
    WHERE user_id = p_user_id;

    IF v_old_status IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND',
            'message', 'User not found'
        );
    END IF;

    -- Update status
    UPDATE public.profiles
    SET status = p_status
    WHERE user_id = p_user_id;

    RETURN json_build_object(
        'success', true,
        'message', 'User status updated successfully',
        'user_id', p_user_id,
        'old_status', v_old_status,
        'new_status', p_status
    );
END;
$$;

-- Function: Admin update user role
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    p_user_id text,
    p_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
    v_old_role text;
    v_admin_count integer;
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
            'message', 'Only admins can update user roles'
        );
    END IF;

    -- Validate role
    IF p_role NOT IN ('admin', 'member') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_ROLE',
            'message', 'Role must be either admin or member'
        );
    END IF;

    -- Get old role
    SELECT role INTO v_old_role
    FROM public.profiles
    WHERE user_id = p_user_id;

    IF v_old_role IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND',
            'message', 'User not found'
        );
    END IF;

    -- Prevent demoting last admin
    IF v_old_role = 'admin' AND p_role = 'member' THEN
        SELECT COUNT(*) INTO v_admin_count
        FROM public.profiles
        WHERE role = 'admin';

        IF v_admin_count <= 1 THEN
            RETURN json_build_object(
                'success', false,
                'error', 'LAST_ADMIN',
                'message', 'Cannot demote the last admin'
            );
        END IF;
    END IF;

    -- Update role
    UPDATE public.profiles
    SET role = p_role
    WHERE user_id = p_user_id;

    RETURN json_build_object(
        'success', true,
        'message', 'User role updated successfully',
        'user_id', p_user_id,
        'old_role', v_old_role,
        'new_role', p_role
    );
END;
$$;

-- Function: Get user management info (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_user_info(p_user_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
    v_user_info RECORD;
    v_tool_count integer;
    v_today_usage RECORD;
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
            'message', 'Only admins can view user management info'
        );
    END IF;

    -- Get user info
    SELECT
        p.user_id,
        p.username,
        p.role,
        p.plan,
        p.status,
        p.is_active,
        p.trial_ends_at,
        p.member_ends_at,
        p.created_at,
        pq.daily_token_limit
    INTO v_user_info
    FROM public.profiles p
    LEFT JOIN public.plan_quota pq ON pq.plan = p.plan
    WHERE p.user_id = p_user_id;

    IF v_user_info IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND',
            'message', 'User not found'
        );
    END IF;

    -- Get tool count
    SELECT COUNT(*) INTO v_tool_count
    FROM public.user_tool_access
    WHERE user_id = p_user_id;

    -- Get today's token usage
    SELECT tokens_used, tokens_limit
    INTO v_today_usage
    FROM public.daily_token_usage
    WHERE user_id = p_user_id
    AND usage_date = CURRENT_DATE;

    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'user_id', v_user_info.user_id,
            'username', v_user_info.username,
            'role', v_user_info.role,
            'plan', v_user_info.plan,
            'status', v_user_info.status,
            'is_active', v_user_info.is_active,
            'trial_ends_at', v_user_info.trial_ends_at,
            'member_ends_at', v_user_info.member_ends_at,
            'created_at', v_user_info.created_at,
            'daily_token_limit', v_user_info.daily_token_limit,
            'granted_tools_count', v_tool_count,
            'today_tokens_used', COALESCE(v_today_usage.tokens_used, 0),
            'today_tokens_remaining', COALESCE(v_today_usage.tokens_limit - v_today_usage.tokens_used, v_user_info.daily_token_limit)
        )
    );
END;
$$;

-- Function: List all users (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_users(
    p_limit integer DEFAULT 100,
    p_offset integer DEFAULT 0,
    p_filter_plan text DEFAULT NULL,
    p_filter_status text DEFAULT NULL,
    p_filter_role text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
    v_users json;
    v_total_count integer;
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
            'message', 'Only admins can list users'
        );
    END IF;

    -- Get total count
    SELECT COUNT(*) INTO v_total_count
    FROM public.profiles
    WHERE (p_filter_plan IS NULL OR plan = p_filter_plan)
    AND (p_filter_status IS NULL OR status = p_filter_status)
    AND (p_filter_role IS NULL OR role = p_filter_role);

    -- Get users
    SELECT json_agg(
        json_build_object(
            'user_id', user_id,
            'username', username,
            'role', role,
            'plan', plan,
            'status', status,
            'trial_ends_at', trial_ends_at,
            'member_ends_at', member_ends_at,
            'created_at', created_at
        )
    ) INTO v_users
    FROM (
        SELECT *
        FROM public.profiles
        WHERE (p_filter_plan IS NULL OR plan = p_filter_plan)
        AND (p_filter_status IS NULL OR status = p_filter_status)
        AND (p_filter_role IS NULL OR role = p_filter_role)
        ORDER BY created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) subquery;

    RETURN json_build_object(
        'success', true,
        'users', COALESCE(v_users, '[]'::json),
        'total_count', v_total_count,
        'limit', p_limit,
        'offset', p_offset
    );
END;
$$;

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.admin_update_user_plan(text, text, timestamp without time zone, timestamp without time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_status(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_info(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(integer, integer, text, text, text) TO authenticated;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    policy_count integer;
    function_count integer;
BEGIN
    -- Count policies on profiles
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname IN ('profile_own_read', 'profile_own_update', 'profile_admin_read', 'profile_admin_manage');

    -- Count admin functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN (
        'admin_update_user_plan',
        'admin_update_user_status',
        'admin_update_user_role',
        'admin_get_user_info',
        'admin_list_users'
    );

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 06 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS policies updated: % / 4', policy_count;
    RAISE NOTICE 'Admin functions created: % / 5', function_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated Policies:';
    RAISE NOTICE '  1. profile_own_read - Users can view their own profile';
    RAISE NOTICE '  2. profile_own_update - Users can update their own profile';
    RAISE NOTICE '     (Trigger prevents editing: plan, status, role, dates)';
    RAISE NOTICE '  3. profile_admin_read - Admins can view all profiles';
    RAISE NOTICE '  4. profile_admin_manage - Admins UPDATE all fields';
    RAISE NOTICE '';
    RAISE NOTICE 'Admin Functions:';
    RAISE NOTICE '  ✓ admin_update_user_plan() - Change user plan & dates';
    RAISE NOTICE '  ✓ admin_update_user_status() - Change user status';
    RAISE NOTICE '  ✓ admin_update_user_role() - Change user role';
    RAISE NOTICE '  ✓ admin_get_user_info() - Get full user details';
    RAISE NOTICE '  ✓ admin_list_users() - List/filter all users';
    RAISE NOTICE '';

    IF policy_count = 4 AND function_count = 5 THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please check the output above.';
    END IF;
END $$;
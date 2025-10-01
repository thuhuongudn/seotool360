-- ============================================
-- MIGRATION 07: Create Audit Log System
-- ============================================
-- This migration creates a comprehensive audit log system
-- to track admin actions and important system events.

-- ============================================
-- CREATE USER_MANAGEMENT_AUDIT_LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_management_audit_log (
    id text DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    actor_id text NOT NULL,
    action text NOT NULL,
    target_user_id text,
    resource_type text NOT NULL,
    resource_id text,
    old_values jsonb,
    new_values jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT user_management_audit_log_action_check
        CHECK (action IN (
            'create', 'update', 'delete',
            'grant_tool', 'revoke_tool',
            'update_plan', 'update_status', 'update_role',
            'reset_tokens', 'expire_plan'
        )),
    CONSTRAINT user_management_audit_log_resource_type_check
        CHECK (resource_type IN (
            'profile', 'user_tool_access', 'plan_quota',
            'daily_token_usage', 'scheduled_job'
        ))
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Index for querying by actor
CREATE INDEX IF NOT EXISTS user_management_audit_log_actor_idx
ON public.user_management_audit_log(actor_id, created_at DESC);

-- Index for querying by target user
CREATE INDEX IF NOT EXISTS user_management_audit_log_target_user_idx
ON public.user_management_audit_log(target_user_id, created_at DESC);

-- Index for querying by action
CREATE INDEX IF NOT EXISTS user_management_audit_log_action_idx
ON public.user_management_audit_log(action, created_at DESC);

-- Index for querying by resource
CREATE INDEX IF NOT EXISTS user_management_audit_log_resource_idx
ON public.user_management_audit_log(resource_type, resource_id, created_at DESC);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS user_management_audit_log_created_at_idx
ON public.user_management_audit_log(created_at DESC);

-- ============================================
-- CREATE FUNCTION: log_audit_event
-- ============================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action text,
    p_target_user_id text DEFAULT NULL,
    p_resource_type text DEFAULT 'profile',
    p_resource_id text DEFAULT NULL,
    p_old_values jsonb DEFAULT NULL,
    p_new_values jsonb DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audit_id text;
    v_actor_id text;
BEGIN
    -- Get current user ID
    v_actor_id := COALESCE(auth.uid()::text, 'system');

    -- Insert audit log
    INSERT INTO public.user_management_audit_log (
        actor_id,
        action,
        target_user_id,
        resource_type,
        resource_id,
        old_values,
        new_values,
        metadata,
        created_at
    )
    VALUES (
        v_actor_id,
        p_action,
        p_target_user_id,
        p_resource_type,
        p_resource_id,
        p_old_values,
        p_new_values,
        p_metadata,
        now()
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to log audit event: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- ============================================
-- UPDATE ADMIN FUNCTIONS TO LOG AUDIT EVENTS
-- ============================================

-- Update admin_update_user_plan to log audit
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
    v_old_trial_ends_at timestamp without time zone;
    v_old_member_ends_at timestamp without time zone;
    v_new_trial_ends_at timestamp without time zone;
    v_new_member_ends_at timestamp without time zone;
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
            'member_ends_at', v_new_member_ends_at
        )::jsonb
    );

    RETURN json_build_object(
        'success', true,
        'message', 'User plan updated successfully',
        'user_id', p_user_id,
        'old_plan', v_old_plan,
        'new_plan', p_plan
    );
END;
$$;

-- Update admin_update_user_status to log audit
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

    -- Log audit event
    PERFORM public.log_audit_event(
        'update_status',
        p_user_id,
        'profile',
        p_user_id,
        json_build_object('status', v_old_status)::jsonb,
        json_build_object('status', p_status)::jsonb
    );

    RETURN json_build_object(
        'success', true,
        'message', 'User status updated successfully',
        'user_id', p_user_id,
        'old_status', v_old_status,
        'new_status', p_status
    );
END;
$$;

-- Update admin_update_user_role to log audit
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

    -- Log audit event
    PERFORM public.log_audit_event(
        'update_role',
        p_user_id,
        'profile',
        p_user_id,
        json_build_object('role', v_old_role)::jsonb,
        json_build_object('role', p_role)::jsonb
    );

    RETURN json_build_object(
        'success', true,
        'message', 'User role updated successfully',
        'user_id', p_user_id,
        'old_role', v_old_role,
        'new_role', p_role
    );
END;
$$;

-- Update grant_tool_access to log audit
CREATE OR REPLACE FUNCTION public.grant_tool_access(
    p_user_id text,
    p_tool_id text,
    p_permission text DEFAULT 'use'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
    v_granter_id text;
    v_tool_name text;
BEGIN
    -- Check if caller is admin
    SELECT
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
        ),
        auth.uid()::text
    INTO v_is_admin, v_granter_id;

    IF NOT v_is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'Only admins can grant tool access'
        );
    END IF;

    -- Check if tool exists
    SELECT name INTO v_tool_name
    FROM public.seo_tools
    WHERE id = p_tool_id;

    IF v_tool_name IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'TOOL_NOT_FOUND',
            'message', 'Tool not found'
        );
    END IF;

    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND',
            'message', 'User not found'
        );
    END IF;

    -- Insert or update tool access
    INSERT INTO public.user_tool_access (
        user_id,
        tool_id,
        permission,
        granted_by,
        created_at
    )
    VALUES (
        p_user_id,
        p_tool_id,
        p_permission,
        v_granter_id,
        now()
    )
    ON CONFLICT (user_id, tool_id)
    DO UPDATE SET
        permission = EXCLUDED.permission,
        granted_by = EXCLUDED.granted_by;

    -- Log audit event
    PERFORM public.log_audit_event(
        'grant_tool',
        p_user_id,
        'user_tool_access',
        p_tool_id,
        NULL,
        json_build_object(
            'tool_id', p_tool_id,
            'tool_name', v_tool_name,
            'permission', p_permission
        )::jsonb
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Tool access granted successfully',
        'user_id', p_user_id,
        'tool_id', p_tool_id,
        'tool_name', v_tool_name,
        'permission', p_permission
    );
END;
$$;

-- Update revoke_tool_access to log audit
CREATE OR REPLACE FUNCTION public.revoke_tool_access(
    p_user_id text,
    p_tool_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
    v_tool_name text;
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
            'message', 'Only admins can revoke tool access'
        );
    END IF;

    -- Get tool name
    SELECT name INTO v_tool_name
    FROM public.seo_tools
    WHERE id = p_tool_id;

    -- Delete the access
    DELETE FROM public.user_tool_access
    WHERE user_id = p_user_id
    AND tool_id = p_tool_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'NOT_FOUND',
            'message', 'Tool access not found for this user'
        );
    END IF;

    -- Log audit event
    PERFORM public.log_audit_event(
        'revoke_tool',
        p_user_id,
        'user_tool_access',
        p_tool_id,
        json_build_object(
            'tool_id', p_tool_id,
            'tool_name', v_tool_name
        )::jsonb,
        NULL
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Tool access revoked successfully',
        'user_id', p_user_id,
        'tool_id', p_tool_id
    );
END;
$$;

-- ============================================
-- CREATE ADMIN AUDIT QUERY FUNCTIONS
-- ============================================

-- Function to get audit logs
CREATE OR REPLACE FUNCTION public.admin_get_audit_logs(
    p_limit integer DEFAULT 100,
    p_offset integer DEFAULT 0,
    p_actor_id text DEFAULT NULL,
    p_target_user_id text DEFAULT NULL,
    p_action text DEFAULT NULL,
    p_resource_type text DEFAULT NULL,
    p_start_date timestamp without time zone DEFAULT NULL,
    p_end_date timestamp without time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
    v_logs json;
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
            'message', 'Only admins can view audit logs'
        );
    END IF;

    -- Get total count
    SELECT COUNT(*) INTO v_total_count
    FROM public.user_management_audit_log
    WHERE (p_actor_id IS NULL OR actor_id = p_actor_id)
    AND (p_target_user_id IS NULL OR target_user_id = p_target_user_id)
    AND (p_action IS NULL OR action = p_action)
    AND (p_resource_type IS NULL OR resource_type = p_resource_type)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);

    -- Get logs
    SELECT json_agg(
        json_build_object(
            'id', id,
            'actor_id', actor_id,
            'action', action,
            'target_user_id', target_user_id,
            'resource_type', resource_type,
            'resource_id', resource_id,
            'old_values', old_values,
            'new_values', new_values,
            'metadata', metadata,
            'created_at', created_at
        )
    ) INTO v_logs
    FROM (
        SELECT *
        FROM public.user_management_audit_log
        WHERE (p_actor_id IS NULL OR actor_id = p_actor_id)
        AND (p_target_user_id IS NULL OR target_user_id = p_target_user_id)
        AND (p_action IS NULL OR action = p_action)
        AND (p_resource_type IS NULL OR resource_type = p_resource_type)
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
        ORDER BY created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) subquery;

    RETURN json_build_object(
        'success', true,
        'logs', COALESCE(v_logs, '[]'::json),
        'total_count', v_total_count,
        'limit', p_limit,
        'offset', p_offset
    );
END;
$$;

-- Function to get audit stats
CREATE OR REPLACE FUNCTION public.admin_get_audit_stats(
    p_days integer DEFAULT 7
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
            'message', 'Only admins can view audit stats'
        );
    END IF;

    -- Get stats
    SELECT json_build_object(
        'total_events', COUNT(*),
        'by_action', (
            SELECT json_object_agg(action, count)
            FROM (
                SELECT action, COUNT(*) as count
                FROM public.user_management_audit_log
                WHERE created_at >= now() - (p_days || ' days')::interval
                GROUP BY action
            ) action_counts
        ),
        'by_actor', (
            SELECT json_object_agg(actor_id, count)
            FROM (
                SELECT actor_id, COUNT(*) as count
                FROM public.user_management_audit_log
                WHERE created_at >= now() - (p_days || ' days')::interval
                GROUP BY actor_id
                ORDER BY count DESC
                LIMIT 10
            ) actor_counts
        ),
        'by_day', (
            SELECT json_object_agg(day, count)
            FROM (
                SELECT DATE(created_at) as day, COUNT(*) as count
                FROM public.user_management_audit_log
                WHERE created_at >= now() - (p_days || ' days')::interval
                GROUP BY DATE(created_at)
                ORDER BY day DESC
            ) day_counts
        )
    ) INTO v_stats
    FROM public.user_management_audit_log
    WHERE created_at >= now() - (p_days || ' days')::interval;

    RETURN json_build_object(
        'success', true,
        'period_days', p_days,
        'stats', v_stats
    );
END;
$$;

-- ============================================
-- ENABLE RLS ON AUDIT LOG TABLE
-- ============================================

ALTER TABLE public.user_management_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS user_management_audit_log_admin_view ON public.user_management_audit_log;
CREATE POLICY user_management_audit_log_admin_view ON public.user_management_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
        )
    );

-- System can insert audit logs
DROP POLICY IF EXISTS user_management_audit_log_system_insert ON public.user_management_audit_log;
CREATE POLICY user_management_audit_log_system_insert ON public.user_management_audit_log
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, text, jsonb, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_logs(integer, integer, text, text, text, text, timestamp without time zone, timestamp without time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_stats(integer) TO authenticated;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    table_exists boolean;
    function_count integer;
    policy_count integer;
    index_count integer;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'user_management_audit_log'
    ) INTO table_exists;

    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN (
        'log_audit_event',
        'admin_get_audit_logs',
        'admin_get_audit_stats'
    );

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'user_management_audit_log';

    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'user_management_audit_log';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 07 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Audit log table created: %', table_exists;
    RAISE NOTICE 'Functions created: % / 3', function_count;
    RAISE NOTICE 'RLS policies created: % / 2', policy_count;
    RAISE NOTICE 'Indexes created: % / 5', index_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Audit System Features:';
    RAISE NOTICE '  ✓ Comprehensive audit logging';
    RAISE NOTICE '  ✓ Admin functions updated with audit';
    RAISE NOTICE '  ✓ Query functions with filtering';
    RAISE NOTICE '  ✓ Audit statistics and reports';
    RAISE NOTICE '';
    RAISE NOTICE 'Tracked Actions:';
    RAISE NOTICE '  - update_plan, update_status, update_role';
    RAISE NOTICE '  - grant_tool, revoke_tool';
    RAISE NOTICE '  - reset_tokens, expire_plan';
    RAISE NOTICE '';

    IF table_exists AND function_count = 3 AND policy_count = 2 AND index_count = 5 THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please check the output above.';
    END IF;
END $$;
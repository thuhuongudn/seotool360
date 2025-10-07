-- ============================================
-- MIGRATION 04: Auto-Grant Tools for New Users
-- ============================================
-- This migration creates a trigger to automatically grant
-- specific tools to new trial users when they sign up.

-- ============================================
-- DEFINE DEFAULT TOOLS FOR TRIAL USERS
-- ============================================
-- Tools to auto-grant:
-- 1. keyword-planner: 1b2f8454-3fef-425d-bef8-b445dc54dbac
-- 2. search-intent: 1ff742f6-52d2-49ef-8979-7647423438ca
-- 3. content-optimizer: 9714610d-a597-435e-852e-036944f4daf0

-- ============================================
-- CREATE FUNCTION: auto_grant_tools_to_new_user
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_grant_tools_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_system_user_id text := '00000000-0000-0000-0000-000000000000'; -- System user ID
    v_tool_ids text[] := ARRAY[
        '1b2f8454-3fef-425d-bef8-b445dc54dbac', -- keyword-planner
        '1ff742f6-52d2-49ef-8979-7647423438ca', -- search-intent
        '9714610d-a597-435e-852e-036944f4daf0'  -- content-optimizer
    ];
    v_tool_id text;
    v_granted_count integer := 0;
BEGIN
    -- Only grant tools if user is on trial plan and status is active
    IF NEW.plan = 'trial' AND NEW.status = 'active' THEN

        -- Loop through each tool and grant access
        FOREACH v_tool_id IN ARRAY v_tool_ids
        LOOP
            BEGIN
                -- Insert tool access with ON CONFLICT to prevent duplicates
                INSERT INTO public.user_tool_access (
                    user_id,
                    tool_id,
                    permission,
                    granted_by,
                    created_at
                )
                VALUES (
                    NEW.user_id,
                    v_tool_id,
                    'use',
                    v_system_user_id,
                    now()
                )
                ON CONFLICT (user_id, tool_id) DO NOTHING;

                -- Count if insert was successful
                IF FOUND THEN
                    v_granted_count := v_granted_count + 1;
                END IF;

            EXCEPTION
                WHEN OTHERS THEN
                    -- Log error but don't fail the entire transaction
                    RAISE WARNING 'Failed to grant tool % to user %: %',
                        v_tool_id, NEW.user_id, SQLERRM;
            END;
        END LOOP;

        -- Log success
        IF v_granted_count > 0 THEN
            RAISE NOTICE 'Auto-granted % tools to new user %', v_granted_count, NEW.user_id;
        END IF;

    END IF;

    RETURN NEW;
END;
$$;

-- ============================================
-- CREATE TRIGGER FOR NEW USERS
-- ============================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_grant_tools ON public.profiles;

-- Create trigger that fires AFTER INSERT
-- (After the user profile is fully created)
CREATE TRIGGER trigger_auto_grant_tools
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_grant_tools_to_new_user();

-- ============================================
-- GRANT EXISTING TRIAL USERS ACCESS TO TOOLS
-- ============================================
-- Backfill: Grant tools to existing trial users who don't have them yet

DO $$
DECLARE
    v_system_user_id text := '00000000-0000-0000-0000-000000000000';
    v_user RECORD;
    v_tool_ids text[] := ARRAY[
        '1b2f8454-3fef-425d-bef8-b445dc54dbac',
        '1ff742f6-52d2-49ef-8979-7647423438ca',
        '9714610d-a597-435e-852e-036944f4daf0'
    ];
    v_tool_id text;
    v_total_granted integer := 0;
    v_user_count integer := 0;
BEGIN
    -- Loop through all active trial users
    FOR v_user IN
        SELECT user_id
        FROM public.profiles
        WHERE plan = 'trial'
        AND status = 'active'
    LOOP
        v_user_count := v_user_count + 1;

        -- Grant each tool to the user
        FOREACH v_tool_id IN ARRAY v_tool_ids
        LOOP
            BEGIN
                INSERT INTO public.user_tool_access (
                    user_id,
                    tool_id,
                    permission,
                    granted_by,
                    created_at
                )
                VALUES (
                    v_user.user_id,
                    v_tool_id,
                    'use',
                    v_system_user_id,
                    now()
                )
                ON CONFLICT (user_id, tool_id) DO NOTHING;

                IF FOUND THEN
                    v_total_granted := v_total_granted + 1;
                END IF;

            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to grant tool % to existing user %: %',
                        v_tool_id, v_user.user_id, SQLERRM;
            END;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Backfill completed: Processed % users, granted % tool accesses',
        v_user_count, v_total_granted;
END $$;

-- ============================================
-- CREATE HELPER FUNCTION: get_user_granted_tools
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_granted_tools(p_user_id text)
RETURNS TABLE (
    tool_id text,
    tool_name text,
    tool_title text,
    permission text,
    granted_at timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        uta.tool_id,
        st.name AS tool_name,
        st.title AS tool_title,
        uta.permission,
        uta.created_at AS granted_at
    FROM public.user_tool_access uta
    JOIN public.seo_tools st ON st.id = uta.tool_id
    WHERE uta.user_id = p_user_id
    ORDER BY uta.created_at DESC;
END;
$$;

-- ============================================
-- CREATE HELPER FUNCTION: revoke_tool_access
-- ============================================

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

    RETURN json_build_object(
        'success', true,
        'message', 'Tool access revoked successfully',
        'user_id', p_user_id,
        'tool_id', p_tool_id
    );
END;
$$;

-- ============================================
-- CREATE HELPER FUNCTION: grant_tool_access
-- ============================================

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
    IF NOT EXISTS (SELECT 1 FROM public.seo_tools WHERE id = p_tool_id) THEN
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

    RETURN json_build_object(
        'success', true,
        'message', 'Tool access granted successfully',
        'user_id', p_user_id,
        'tool_id', p_tool_id,
        'permission', p_permission
    );
END;
$$;

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_user_granted_tools(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_tool_access(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_tool_access(text, text, text) TO authenticated;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    trigger_exists boolean;
    function_count integer;
    backfill_count integer;
    trial_user_count integer;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_auto_grant_tools'
    ) INTO trigger_exists;

    -- Count helper functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN (
        'auto_grant_tools_to_new_user',
        'get_user_granted_tools',
        'revoke_tool_access',
        'grant_tool_access'
    );

    -- Count how many trial users have tool access
    SELECT COUNT(DISTINCT uta.user_id) INTO backfill_count
    FROM public.user_tool_access uta
    JOIN public.profiles p ON p.user_id = uta.user_id
    WHERE p.plan = 'trial'
    AND p.status = 'active'
    AND uta.tool_id IN (
        '1b2f8454-3fef-425d-bef8-b445dc54dbac',
        '1ff742f6-52d2-49ef-8979-7647423438ca',
        '9714610d-a597-435e-852e-036944f4daf0'
    );

    -- Count total active trial users
    SELECT COUNT(*) INTO trial_user_count
    FROM public.profiles
    WHERE plan = 'trial'
    AND status = 'active';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 04 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Trigger created: %', trigger_exists;
    RAISE NOTICE 'Helper functions: % / 4', function_count;
    RAISE NOTICE 'Active trial users: %', trial_user_count;
    RAISE NOTICE 'Users with granted tools: %', backfill_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Default Tools Auto-Granted:';
    RAISE NOTICE '  1. Keyword Planner (1b2f8454-3fef-425d-bef8-b445dc54dbac)';
    RAISE NOTICE '  2. Search Intent (1ff742f6-52d2-49ef-8979-7647423438ca)';
    RAISE NOTICE '  3. Content Optimizer (9714610d-a597-435e-852e-036944f4daf0)';
    RAISE NOTICE '';
    RAISE NOTICE 'Helper Functions:';
    RAISE NOTICE '  ✓ get_user_granted_tools() - Get tools for a user';
    RAISE NOTICE '  ✓ grant_tool_access() - Admin grant tool';
    RAISE NOTICE '  ✓ revoke_tool_access() - Admin revoke tool';
    RAISE NOTICE '';

    IF trigger_exists AND function_count = 4 THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please check the output above.';
    END IF;
END $$;
-- ============================================
-- Grant Content Optimizer to Existing Users
-- ============================================
-- This script grants content-optimizer tool access to all existing
-- active trial users who don't already have it.
--
-- Tool: content-optimizer
-- UUID: 62e53fcd-263e-48c6-bca2-820af25aa4b8

DO $$
DECLARE
    v_system_user_id text := '00000000-0000-0000-0000-000000000000';
    v_content_optimizer_id text := '62e53fcd-263e-48c6-bca2-820af25aa4b8';
    v_user RECORD;
    v_total_granted integer := 0;
    v_user_count integer := 0;
    v_already_had integer := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GRANT CONTENT OPTIMIZER TO EXISTING USERS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tool: Content Optimizer';
    RAISE NOTICE 'UUID: %', v_content_optimizer_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Processing existing trial users...';
    RAISE NOTICE '';

    -- Loop through all active trial users
    FOR v_user IN
        SELECT user_id, email
        FROM public.profiles
        WHERE plan = 'trial'
        AND status = 'active'
        ORDER BY created_at
    LOOP
        v_user_count := v_user_count + 1;

        -- Check if user already has access
        IF EXISTS (
            SELECT 1 FROM public.user_tool_access
            WHERE user_id = v_user.user_id
            AND tool_id = v_content_optimizer_id
        ) THEN
            v_already_had := v_already_had + 1;
            RAISE NOTICE '  ⏭  User % already has access', v_user.email;
        ELSE
            -- Grant access
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
                    v_content_optimizer_id,
                    'use',
                    v_system_user_id,
                    now()
                );

                v_total_granted := v_total_granted + 1;
                RAISE NOTICE '  ✓  Granted to user: %', v_user.email;

            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING '  ✗  Failed to grant to user %: %',
                        v_user.email, SQLERRM;
            END;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BACKFILL COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total active trial users: %', v_user_count;
    RAISE NOTICE 'Already had access: %', v_already_had;
    RAISE NOTICE 'Newly granted: %', v_total_granted;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    IF v_total_granted > 0 THEN
        RAISE NOTICE '✅ Successfully granted content-optimizer to % users', v_total_granted;
    ELSE
        RAISE NOTICE 'ℹ️  No new grants needed - all users already have access';
    END IF;

    RAISE NOTICE '';
END $$;

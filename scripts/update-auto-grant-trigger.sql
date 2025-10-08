-- ============================================
-- UPDATE AUTO-GRANT TRIGGER WITH CORRECT TOOL ID
-- ============================================
-- This script updates the auto_grant_tools_to_new_user function
-- to use the correct content-optimizer tool ID

-- Drop and recreate the function with correct tool IDs
CREATE OR REPLACE FUNCTION public.auto_grant_tools_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_system_user_id text := '00000000-0000-0000-0000-000000000000';
    v_tool_ids text[] := ARRAY[
        '1b2f8454-3fef-425d-bef8-b445dc54dbac', -- keyword-planner
        '1ff742f6-52d2-49ef-8979-7647423438ca', -- search-intent
        '9714610d-a597-435e-852e-036944f4daf0'  -- content-optimizer (CORRECT ID)
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

-- Verify the update
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TRIGGER FUNCTION UPDATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Function: auto_grant_tools_to_new_user';
    RAISE NOTICE 'Updated tool IDs:';
    RAISE NOTICE '  1. keyword-planner: 1b2f8454-3fef-425d-bef8-b445dc54dbac';
    RAISE NOTICE '  2. search-intent: 1ff742f6-52d2-49ef-8979-7647423438ca';
    RAISE NOTICE '  3. content-optimizer: 9714610d-a597-435e-852e-036944f4daf0';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ New trial users will now receive all 3 tools automatically';
    RAISE NOTICE '';
END $$;

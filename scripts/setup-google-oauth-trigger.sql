-- ============================================
-- GOOGLE OAUTH PROFILE AUTO-CREATION TRIGGER
-- ============================================
-- This script creates a trigger function that automatically creates
-- a profile record when a new user signs up via Google OAuth.
-- It can be run multiple times safely (idempotent).

-- ============================================
-- CREATE OR REPLACE TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    username_candidate TEXT;
    username_suffix INTEGER := 0;
    final_username TEXT;
BEGIN
    -- Extract username from email (part before @)
    username_candidate := split_part(NEW.email, '@', 1);

    -- Clean username: remove special characters, convert to lowercase
    username_candidate := regexp_replace(lower(username_candidate), '[^a-z0-9_]', '', 'g');

    -- Ensure username is not empty and has minimum length
    IF length(username_candidate) < 3 THEN
        username_candidate := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;

    -- Find unique username by appending numbers if needed
    final_username := username_candidate;

    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
        username_suffix := username_suffix + 1;
        final_username := username_candidate || '_' || username_suffix::text;
    END LOOP;

    -- Insert profile record
    INSERT INTO public.profiles (
        user_id,
        username,
        role,
        is_active,
        created_at
    ) VALUES (
        NEW.id::text,
        final_username,
        'member',  -- Default role for OAuth users
        true,
        NOW()
    );

    -- Log the profile creation
    RAISE NOTICE 'Created profile for user % with username %', NEW.id, final_username;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- ============================================
-- CREATE TRIGGER (DROP AND RECREATE FOR SAFETY)
-- ============================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Grant usage on auth schema for the function
GRANT USAGE ON SCHEMA auth TO postgres;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Verify trigger was created successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'on_auth_user_created'
        AND event_object_table = 'users'
        AND event_object_schema = 'auth'
    ) THEN
        RAISE NOTICE 'SUCCESS: Google OAuth profile auto-creation trigger installed successfully';
    ELSE
        RAISE WARNING 'FAILED: Trigger was not created properly';
    END IF;
END $$;

-- Test query to check function exists
SELECT
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';
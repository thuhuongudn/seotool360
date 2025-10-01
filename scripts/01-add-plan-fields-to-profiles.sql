-- ============================================
-- MIGRATION 01: Add Plan & Status Fields to Profiles
-- ============================================
-- This migration adds plan management fields to the profiles table
-- to support trial/member plans and account status tracking.

-- ============================================
-- ADD NEW COLUMNS TO PROFILES TABLE
-- ============================================

DO $$
BEGIN
    -- Add 'plan' column (trial/member)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'plan'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN plan text DEFAULT 'trial' NOT NULL;

        RAISE NOTICE 'Added column: plan';
    ELSE
        RAISE NOTICE 'Column already exists: plan';
    END IF;

    -- Add 'status' column (active/pending/disabled)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN status text DEFAULT 'active' NOT NULL;

        RAISE NOTICE 'Added column: status';
    ELSE
        RAISE NOTICE 'Column already exists: status';
    END IF;

    -- Add 'trial_ends_at' column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'trial_ends_at'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN trial_ends_at timestamp without time zone;

        RAISE NOTICE 'Added column: trial_ends_at';
    ELSE
        RAISE NOTICE 'Column already exists: trial_ends_at';
    END IF;

    -- Add 'member_ends_at' column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'member_ends_at'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN member_ends_at timestamp without time zone;

        RAISE NOTICE 'Added column: member_ends_at';
    ELSE
        RAISE NOTICE 'Column already exists: member_ends_at';
    END IF;
END $$;

-- ============================================
-- ADD CHECK CONSTRAINTS
-- ============================================

DO $$
BEGIN
    -- Check constraint for 'plan' column
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_plan_check'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_plan_check
        CHECK (plan IN ('trial', 'member'));

        RAISE NOTICE 'Added constraint: profiles_plan_check';
    ELSE
        RAISE NOTICE 'Constraint already exists: profiles_plan_check';
    END IF;

    -- Check constraint for 'status' column
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_status_check'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_status_check
        CHECK (status IN ('active', 'pending', 'disabled'));

        RAISE NOTICE 'Added constraint: profiles_status_check';
    ELSE
        RAISE NOTICE 'Constraint already exists: profiles_status_check';
    END IF;
END $$;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

DO $$
BEGIN
    -- Index on 'plan' column
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND indexname = 'profiles_plan_idx'
    ) THEN
        CREATE INDEX profiles_plan_idx ON public.profiles(plan);
        RAISE NOTICE 'Created index: profiles_plan_idx';
    ELSE
        RAISE NOTICE 'Index already exists: profiles_plan_idx';
    END IF;

    -- Index on 'status' column
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND indexname = 'profiles_status_idx'
    ) THEN
        CREATE INDEX profiles_status_idx ON public.profiles(status);
        RAISE NOTICE 'Created index: profiles_status_idx';
    ELSE
        RAISE NOTICE 'Index already exists: profiles_status_idx';
    END IF;

    -- Index on 'trial_ends_at' for expiry checks
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND indexname = 'profiles_trial_ends_at_idx'
    ) THEN
        CREATE INDEX profiles_trial_ends_at_idx ON public.profiles(trial_ends_at)
        WHERE plan = 'trial' AND status = 'active';
        RAISE NOTICE 'Created index: profiles_trial_ends_at_idx';
    ELSE
        RAISE NOTICE 'Index already exists: profiles_trial_ends_at_idx';
    END IF;

    -- Index on 'member_ends_at' for expiry checks
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND indexname = 'profiles_member_ends_at_idx'
    ) THEN
        CREATE INDEX profiles_member_ends_at_idx ON public.profiles(member_ends_at)
        WHERE plan = 'member' AND status = 'active';
        RAISE NOTICE 'Created index: profiles_member_ends_at_idx';
    ELSE
        RAISE NOTICE 'Index already exists: profiles_member_ends_at_idx';
    END IF;
END $$;

-- ============================================
-- UPDATE EXISTING USERS WITH DEFAULT VALUES
-- ============================================

-- Set trial_ends_at for existing users who don't have it set
-- Default to 30 days from their created_at date
UPDATE public.profiles
SET trial_ends_at = created_at + INTERVAL '30 days'
WHERE plan = 'trial'
AND trial_ends_at IS NULL;

-- ============================================
-- CREATE TRIGGER FUNCTION FOR NEW USERS
-- ============================================

-- Function to set default plan values for new users
CREATE OR REPLACE FUNCTION public.set_default_plan_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set default values if not provided
    IF NEW.plan IS NULL THEN
        NEW.plan := 'trial';
    END IF;

    IF NEW.status IS NULL THEN
        NEW.status := 'active';
    END IF;

    -- Set trial_ends_at to 30 days from now if plan is trial and not set
    IF NEW.plan = 'trial' AND NEW.trial_ends_at IS NULL THEN
        NEW.trial_ends_at := NOW() + INTERVAL '30 days';
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_default_plan ON public.profiles;

CREATE TRIGGER trigger_set_default_plan
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_default_plan_for_new_user();

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    column_count INTEGER;
    constraint_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count new columns
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name IN ('plan', 'status', 'trial_ends_at', 'member_ends_at');

    -- Count constraints
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conname IN ('profiles_plan_check', 'profiles_status_check');

    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND indexname IN ('profiles_plan_idx', 'profiles_status_idx',
                      'profiles_trial_ends_at_idx', 'profiles_member_ends_at_idx');

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 01 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New columns added: % / 4', column_count;
    RAISE NOTICE 'Constraints added: % / 2', constraint_count;
    RAISE NOTICE 'Indexes created: % / 4', index_count;
    RAISE NOTICE '========================================';

    IF column_count = 4 AND constraint_count = 2 AND index_count = 4 THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please check the output above.';
    END IF;
END $$;
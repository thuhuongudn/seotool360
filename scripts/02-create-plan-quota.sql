-- ============================================
-- MIGRATION 02: Create Plan Quota System
-- ============================================
-- This migration creates the plan_quota table to manage
-- token limits for different subscription plans.

-- ============================================
-- CREATE PLAN_QUOTA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.plan_quota (
    plan text PRIMARY KEY,
    daily_token_limit integer NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT plan_quota_plan_check CHECK (plan IN ('trial', 'member')),
    CONSTRAINT plan_quota_limit_positive CHECK (daily_token_limit > 0)
);

-- ============================================
-- CREATE INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS plan_quota_active_idx
ON public.plan_quota(is_active)
WHERE is_active = true;

-- ============================================
-- INSERT DEFAULT QUOTA VALUES
-- ============================================

-- Use INSERT ... ON CONFLICT to make this idempotent
INSERT INTO public.plan_quota (plan, daily_token_limit, description, is_active)
VALUES
    ('trial', 10, 'Free trial plan with 10 tokens per day for 30 days', true),
    ('member', 50, 'Premium member plan with 50 tokens per day', true)
ON CONFLICT (plan)
DO UPDATE SET
    daily_token_limit = EXCLUDED.daily_token_limit,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- ============================================
-- CREATE FUNCTION TO GET USER DAILY LIMIT
-- ============================================

-- Function to get the current user's daily token limit based on their plan
CREATE OR REPLACE FUNCTION public.get_user_daily_token_limit(p_user_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_plan text;
    v_daily_limit integer;
BEGIN
    -- Get user's current plan
    SELECT plan INTO v_user_plan
    FROM public.profiles
    WHERE user_id = p_user_id;

    -- If user not found, return 0
    IF v_user_plan IS NULL THEN
        RETURN 0;
    END IF;

    -- Get daily limit for the plan
    SELECT daily_token_limit INTO v_daily_limit
    FROM public.plan_quota
    WHERE plan = v_user_plan
    AND is_active = true;

    -- Return limit (or 0 if plan not found)
    RETURN COALESCE(v_daily_limit, 0);
END;
$$;

-- ============================================
-- CREATE FUNCTION TO GET PLAN QUOTA INFO
-- ============================================

-- Function to get quota information for a specific plan
CREATE OR REPLACE FUNCTION public.get_plan_quota_info(p_plan text)
RETURNS TABLE (
    plan text,
    daily_token_limit integer,
    description text,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pq.plan,
        pq.daily_token_limit,
        pq.description,
        pq.is_active
    FROM public.plan_quota pq
    WHERE pq.plan = p_plan
    AND pq.is_active = true;
END;
$$;

-- ============================================
-- CREATE UPDATED_AT TRIGGER
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_plan_quota_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_plan_quota_updated_at ON public.plan_quota;

CREATE TRIGGER trigger_plan_quota_updated_at
    BEFORE UPDATE ON public.plan_quota
    FOR EACH ROW
    EXECUTE FUNCTION public.update_plan_quota_updated_at();

-- ============================================
-- ENABLE RLS ON PLAN_QUOTA TABLE
-- ============================================

ALTER TABLE public.plan_quota ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- All authenticated users can read active plan quotas
DROP POLICY IF EXISTS plan_quota_authenticated_read ON public.plan_quota;
CREATE POLICY plan_quota_authenticated_read ON public.plan_quota
    FOR SELECT
    USING (auth.uid() IS NOT NULL AND is_active = true);

-- Only admins can modify plan quotas
DROP POLICY IF EXISTS plan_quota_admin_manage ON public.plan_quota;
CREATE POLICY plan_quota_admin_manage ON public.plan_quota
    FOR ALL
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
-- GRANT EXECUTE PERMISSIONS ON FUNCTIONS
-- ============================================

-- Grant execute on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_daily_token_limit(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plan_quota_info(text) TO authenticated;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    quota_count INTEGER;
    function_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count quota records
    SELECT COUNT(*) INTO quota_count
    FROM public.plan_quota
    WHERE is_active = true;

    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN ('get_user_daily_token_limit', 'get_plan_quota_info');

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'plan_quota';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 02 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Active plan quotas: % / 2', quota_count;
    RAISE NOTICE 'RPC functions created: % / 2', function_count;
    RAISE NOTICE 'RLS policies created: % / 2', policy_count;
    RAISE NOTICE '========================================';

    -- Display quota values
    RAISE NOTICE '';
    RAISE NOTICE 'Current Quota Configuration:';
    DECLARE
        quota_info RECORD;
    BEGIN
        FOR quota_info IN
            SELECT plan, daily_token_limit, description
            FROM public.plan_quota
            WHERE is_active = true
            ORDER BY plan
        LOOP
            RAISE NOTICE '  %: % tokens/day - %', quota_info.plan, quota_info.daily_token_limit, quota_info.description;
        END LOOP;
    END;
    RAISE NOTICE '';

    IF quota_count >= 2 AND function_count = 2 AND policy_count = 2 THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please check the output above.';
    END IF;
END $$;
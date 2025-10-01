-- ============================================
-- MIGRATION 05: Setup Expiry Scheduled Job
-- ============================================
-- This migration creates a scheduled job using pg_cron
-- to automatically expire trial/member plans and update status.

-- ============================================
-- ENABLE pg_cron EXTENSION
-- ============================================
-- Note: This requires superuser privileges
-- On Supabase, pg_cron is already enabled by default

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- CREATE FUNCTION: expire_trial_and_member_plans
-- ============================================

CREATE OR REPLACE FUNCTION public.expire_trial_and_member_plans()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expired_trials integer := 0;
    v_expired_members integer := 0;
    v_total_expired integer := 0;
BEGIN
    -- Expire trial plans
    UPDATE public.profiles
    SET status = 'pending'
    WHERE plan = 'trial'
    AND status = 'active'
    AND trial_ends_at < now();

    GET DIAGNOSTICS v_expired_trials = ROW_COUNT;

    -- Expire member plans
    UPDATE public.profiles
    SET status = 'pending'
    WHERE plan = 'member'
    AND status = 'active'
    AND member_ends_at IS NOT NULL
    AND member_ends_at < now();

    GET DIAGNOSTICS v_expired_members = ROW_COUNT;

    v_total_expired := v_expired_trials + v_expired_members;

    -- Log the result
    RAISE NOTICE 'Expiry job completed: % trial(s) expired, % member(s) expired, % total',
        v_expired_trials, v_expired_members, v_total_expired;

    RETURN json_build_object(
        'success', true,
        'timestamp', now(),
        'expired_trials', v_expired_trials,
        'expired_members', v_expired_members,
        'total_expired', v_total_expired
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Expiry job failed: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', now()
        );
END;
$$;

-- ============================================
-- CREATE FUNCTION: cleanup_old_token_usage
-- ============================================
-- Function to cleanup token usage records older than 90 days

CREATE OR REPLACE FUNCTION public.cleanup_old_token_usage()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count integer := 0;
    v_cutoff_date date;
BEGIN
    -- Keep last 90 days of data
    v_cutoff_date := CURRENT_DATE - INTERVAL '90 days';

    -- Delete old records
    DELETE FROM public.daily_token_usage
    WHERE usage_date < v_cutoff_date;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RAISE NOTICE 'Cleanup job completed: Deleted % old token usage records before %',
        v_deleted_count, v_cutoff_date;

    RETURN json_build_object(
        'success', true,
        'timestamp', now(),
        'deleted_count', v_deleted_count,
        'cutoff_date', v_cutoff_date
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Cleanup job failed: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', now()
        );
END;
$$;

-- ============================================
-- CREATE TABLE: scheduled_job_logs
-- ============================================
-- Table to log scheduled job executions

CREATE TABLE IF NOT EXISTS public.scheduled_job_logs (
    id text DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    job_name text NOT NULL,
    status text NOT NULL,
    result jsonb,
    executed_at timestamp without time zone DEFAULT now() NOT NULL,

    CONSTRAINT scheduled_job_logs_status_check CHECK (status IN ('success', 'failed'))
);

-- Create index for querying logs
CREATE INDEX IF NOT EXISTS scheduled_job_logs_job_name_idx
ON public.scheduled_job_logs(job_name, executed_at DESC);

CREATE INDEX IF NOT EXISTS scheduled_job_logs_executed_at_idx
ON public.scheduled_job_logs(executed_at DESC);

-- ============================================
-- CREATE FUNCTION: log_scheduled_job
-- ============================================

CREATE OR REPLACE FUNCTION public.log_scheduled_job(
    p_job_name text,
    p_result json
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status text;
BEGIN
    -- Determine status from result
    v_status := CASE
        WHEN (p_result->>'success')::boolean = true THEN 'success'
        ELSE 'failed'
    END;

    -- Insert log
    INSERT INTO public.scheduled_job_logs (job_name, status, result, executed_at)
    VALUES (p_job_name, v_status, p_result::jsonb, now());

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to log scheduled job: %', SQLERRM;
END;
$$;

-- ============================================
-- CREATE WRAPPER FUNCTIONS FOR LOGGING
-- ============================================

CREATE OR REPLACE FUNCTION public.run_expire_plans_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
BEGIN
    v_result := public.expire_trial_and_member_plans();
    PERFORM public.log_scheduled_job('expire_plans', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.run_cleanup_token_usage_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
BEGIN
    v_result := public.cleanup_old_token_usage();
    PERFORM public.log_scheduled_job('cleanup_token_usage', v_result);
END;
$$;

-- ============================================
-- SCHEDULE JOBS WITH pg_cron
-- ============================================

-- Remove existing jobs if they exist
DO $$
BEGIN
    -- Try to unschedule existing jobs (will fail silently if not exist)
    PERFORM cron.unschedule('expire-trial-member-plans');
    PERFORM cron.unschedule('cleanup-old-token-usage');
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not unschedule jobs (they may not exist): %', SQLERRM;
END $$;

-- Schedule: Expire plans daily at 00:05 UTC
SELECT cron.schedule(
    'expire-trial-member-plans',        -- job name
    '5 0 * * *',                        -- cron schedule: daily at 00:05
    'SELECT public.run_expire_plans_job();'
);

-- Schedule: Cleanup old token usage weekly on Sunday at 02:00 UTC
SELECT cron.schedule(
    'cleanup-old-token-usage',          -- job name
    '0 2 * * 0',                        -- cron schedule: Sundays at 02:00
    'SELECT public.run_cleanup_token_usage_job();'
);

-- ============================================
-- CREATE HELPER FUNCTION: get_scheduled_jobs
-- ============================================

CREATE OR REPLACE FUNCTION public.get_scheduled_jobs()
RETURNS TABLE (
    jobid bigint,
    schedule text,
    command text,
    jobname text,
    active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.jobid,
        j.schedule,
        j.command,
        j.jobname,
        j.active
    FROM cron.job j
    WHERE j.jobname IN ('expire-trial-member-plans', 'cleanup-old-token-usage')
    ORDER BY j.jobname;
END;
$$;

-- ============================================
-- CREATE HELPER FUNCTION: get_job_execution_history
-- ============================================

CREATE OR REPLACE FUNCTION public.get_job_execution_history(
    p_job_name text DEFAULT NULL,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    id text,
    job_name text,
    status text,
    result jsonb,
    executed_at timestamp without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_job_name IS NOT NULL THEN
        RETURN QUERY
        SELECT
            sjl.id,
            sjl.job_name,
            sjl.status,
            sjl.result,
            sjl.executed_at
        FROM public.scheduled_job_logs sjl
        WHERE sjl.job_name = p_job_name
        ORDER BY sjl.executed_at DESC
        LIMIT p_limit;
    ELSE
        RETURN QUERY
        SELECT
            sjl.id,
            sjl.job_name,
            sjl.status,
            sjl.result,
            sjl.executed_at
        FROM public.scheduled_job_logs sjl
        ORDER BY sjl.executed_at DESC
        LIMIT p_limit;
    END IF;
END;
$$;

-- ============================================
-- ENABLE RLS ON SCHEDULED_JOB_LOGS
-- ============================================

ALTER TABLE public.scheduled_job_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view job logs
DROP POLICY IF EXISTS scheduled_job_logs_admin_view ON public.scheduled_job_logs;
CREATE POLICY scheduled_job_logs_admin_view ON public.scheduled_job_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
        )
    );

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.expire_trial_and_member_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_token_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scheduled_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_job_execution_history(text, integer) TO authenticated;

-- ============================================
-- TEST FUNCTIONS MANUALLY (Optional)
-- ============================================
-- Uncomment to test the functions immediately

-- SELECT public.run_expire_plans_job();
-- SELECT public.run_cleanup_token_usage_job();

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    function_count integer;
    scheduled_job_count integer;
    table_exists boolean;
BEGIN
    -- Check if scheduled_job_logs table exists
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'scheduled_job_logs'
    ) INTO table_exists;

    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN (
        'expire_trial_and_member_plans',
        'cleanup_old_token_usage',
        'run_expire_plans_job',
        'run_cleanup_token_usage_job',
        'get_scheduled_jobs',
        'get_job_execution_history'
    );

    -- Count scheduled jobs
    SELECT COUNT(*) INTO scheduled_job_count
    FROM cron.job
    WHERE jobname IN ('expire-trial-member-plans', 'cleanup-old-token-usage');

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 05 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Job log table created: %', table_exists;
    RAISE NOTICE 'Functions created: % / 6', function_count;
    RAISE NOTICE 'Scheduled jobs: % / 2', scheduled_job_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Scheduled Jobs:';
    RAISE NOTICE '  1. expire-trial-member-plans';
    RAISE NOTICE '     Schedule: Daily at 00:05 UTC';
    RAISE NOTICE '     Action: Set status=pending for expired plans';
    RAISE NOTICE '';
    RAISE NOTICE '  2. cleanup-old-token-usage';
    RAISE NOTICE '     Schedule: Weekly (Sunday) at 02:00 UTC';
    RAISE NOTICE '     Action: Delete token usage > 90 days old';
    RAISE NOTICE '';
    RAISE NOTICE 'Helper Functions:';
    RAISE NOTICE '  ✓ get_scheduled_jobs() - View scheduled jobs';
    RAISE NOTICE '  ✓ get_job_execution_history() - View job logs';
    RAISE NOTICE '';

    IF table_exists AND function_count = 6 AND scheduled_job_count = 2 THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please check the output above.';
    END IF;
END $$;
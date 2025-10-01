-- ============================================
-- MIGRATION 12: Create Token Usage Logs Cleanup
-- ============================================
-- This migration creates a function to cleanup old token usage logs
-- and schedules it to run daily at 02:00.

-- ============================================
-- CREATE CLEANUP FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_token_usage_logs()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count integer;
    v_cutoff_date timestamptz;
BEGIN
    -- Calculate cutoff date (90 days ago)
    v_cutoff_date := now() - interval '90 days';

    -- Delete old logs
    WITH deleted AS (
        DELETE FROM public.token_usage_logs
        WHERE created_at < v_cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;

    RAISE NOTICE 'Cleaned up % token usage logs older than %', v_deleted_count, v_cutoff_date;

    RETURN json_build_object(
        'success', true,
        'deleted_count', v_deleted_count,
        'cutoff_date', v_cutoff_date,
        'message', format('Deleted %s logs older than %s days', v_deleted_count, 90)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'CLEANUP_FAILED',
            'message', 'An error occurred during cleanup: ' || SQLERRM
        );
END;
$$;

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.cleanup_token_usage_logs() TO service_role;

-- ============================================
-- CREATE SCHEDULED JOB
-- ============================================
-- Uses pg_cron extension to schedule daily cleanup at 02:00

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists
SELECT cron.unschedule('token-usage-logs-cleanup')
WHERE EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'token-usage-logs-cleanup'
);

-- Schedule cleanup job to run daily at 02:00
SELECT cron.schedule(
    'token-usage-logs-cleanup',
    '0 2 * * *',  -- Every day at 02:00
    $$SELECT public.cleanup_token_usage_logs();$$
);

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    function_exists boolean;
    job_exists boolean;
    job_schedule text;
BEGIN
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'cleanup_token_usage_logs'
    ) INTO function_exists;

    -- Check if scheduled job exists
    SELECT EXISTS (
        SELECT 1 FROM cron.job
        WHERE jobname = 'token-usage-logs-cleanup'
    ) INTO job_exists;

    -- Get job schedule
    SELECT schedule INTO job_schedule
    FROM cron.job
    WHERE jobname = 'token-usage-logs-cleanup';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 12 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Function cleanup_token_usage_logs created: %', function_exists;
    RAISE NOTICE 'Scheduled job created: %', job_exists;
    RAISE NOTICE 'Job schedule: %', COALESCE(job_schedule, 'NOT SET');
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Features:';
    RAISE NOTICE '  ✓ Deletes logs older than 90 days';
    RAISE NOTICE '  ✓ Runs automatically daily at 02:00';
    RAISE NOTICE '  ✓ Returns detailed cleanup statistics';
    RAISE NOTICE '  ✓ Can be manually triggered: SELECT cleanup_token_usage_logs();';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Command:';
    RAISE NOTICE '  SELECT public.cleanup_token_usage_logs();';
    RAISE NOTICE '';

    IF function_exists AND job_exists THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please check the output above.';
    END IF;
END $$;

-- ============================================
-- TEST CLEANUP FUNCTION
-- ============================================
-- Uncomment to test the cleanup function immediately:
-- SELECT public.cleanup_token_usage_logs();

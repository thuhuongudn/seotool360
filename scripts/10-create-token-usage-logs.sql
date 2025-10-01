-- ============================================
-- MIGRATION 10: Create Token Usage Logs Table
-- ============================================
-- This migration creates the token_usage_logs table for detailed
-- tracking of individual token consumption events.

-- ============================================
-- CREATE TOKEN_USAGE_LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.token_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id text NOT NULL,
    tool_id uuid NOT NULL,
    consumed integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT token_usage_logs_consumed_positive CHECK (consumed > 0),

    -- Foreign keys
    CONSTRAINT token_usage_logs_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    CONSTRAINT token_usage_logs_tool_id_fkey
        FOREIGN KEY (tool_id)
        REFERENCES public.seo_tools(id)
        ON DELETE CASCADE
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Index for querying by user and date (most common query)
CREATE INDEX IF NOT EXISTS idx_token_logs_user_date
ON public.token_usage_logs(user_id, created_at DESC);

-- Index for querying by tool and date (analytics)
CREATE INDEX IF NOT EXISTS idx_token_logs_tool_date
ON public.token_usage_logs(tool_id, created_at DESC);

-- Index for cleanup queries (finding old logs)
CREATE INDEX IF NOT EXISTS idx_token_logs_created_at
ON public.token_usage_logs(created_at);

-- Composite index for user + tool analysis
CREATE INDEX IF NOT EXISTS idx_token_logs_user_tool
ON public.token_usage_logs(user_id, tool_id, created_at DESC);

-- ============================================
-- ENABLE RLS ON TOKEN_USAGE_LOGS TABLE
-- ============================================

ALTER TABLE public.token_usage_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Regular users CANNOT read their own logs (admin-only feature)
-- This prevents abuse and data scraping

-- Service role can manage logs (for RPC functions)
DROP POLICY IF EXISTS token_usage_logs_service_manage ON public.token_usage_logs;
CREATE POLICY token_usage_logs_service_manage ON public.token_usage_logs
    FOR ALL
    USING (auth.role() = 'service_role');

-- Admins can view all logs
DROP POLICY IF EXISTS token_usage_logs_admin_view ON public.token_usage_logs;
CREATE POLICY token_usage_logs_admin_view ON public.token_usage_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
        )
    );

-- ============================================
-- VERIFICATION QUERY
-- ============================================

DO $$
DECLARE
    table_exists boolean;
    index_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'token_usage_logs'
    ) INTO table_exists;

    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'token_usage_logs';

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'token_usage_logs';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 10 VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table token_usage_logs created: %', table_exists;
    RAISE NOTICE 'Indexes created: % / 4', index_count;
    RAISE NOTICE 'RLS policies created: % / 2', policy_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Features:';
    RAISE NOTICE '  ✓ Detailed token consumption logging';
    RAISE NOTICE '  ✓ Foreign key constraints to profiles & seo_tools';
    RAISE NOTICE '  ✓ Optimized indexes for common queries';
    RAISE NOTICE '  ✓ Admin-only access (users cannot read logs)';
    RAISE NOTICE '  ✓ Cascade deletion with parent records';
    RAISE NOTICE '';

    IF table_exists AND index_count >= 4 AND policy_count = 2 THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may be incomplete. Please check the output above.';
    END IF;
END $$;

-- ============================================
-- 🔧 ADD created_at COLUMN - RUN THIS NOW
-- ============================================

-- Check and add created_at column
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'token_usage_logs'
        AND column_name = 'created_at'
    ) THEN
        -- Add the column
        ALTER TABLE public.token_usage_logs
        ADD COLUMN created_at timestamp without time zone DEFAULT now() NOT NULL;

        -- Create index
        CREATE INDEX token_usage_logs_created_at_idx
        ON public.token_usage_logs(created_at DESC);

        RAISE NOTICE '✅ Added created_at column with index';
    ELSE
        RAISE NOTICE '✓ created_at column already exists';
    END IF;
END $$;

-- Verify
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'token_usage_logs'
ORDER BY ordinal_position;

-- Test query
SELECT '=== Testing query with created_at ===' as test;

SELECT *
FROM public.token_usage_logs
ORDER BY created_at DESC
LIMIT 3;

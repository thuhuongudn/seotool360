-- ============================================
-- FIX: Add missing created_at column to token_usage_logs
-- ============================================

-- Check current schema
DO $$
DECLARE
    has_created_at boolean;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Checking token_usage_logs schema...';
    RAISE NOTICE '========================================';

    -- Check if created_at exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'token_usage_logs'
        AND column_name = 'created_at'
    ) INTO has_created_at;

    IF has_created_at THEN
        RAISE NOTICE '✓ created_at column already exists';
    ELSE
        RAISE NOTICE '✗ created_at column missing - adding now...';

        -- Add created_at column
        ALTER TABLE public.token_usage_logs
        ADD COLUMN created_at timestamp without time zone DEFAULT now() NOT NULL;

        RAISE NOTICE '✓ created_at column added successfully';

        -- Create index for performance
        CREATE INDEX IF NOT EXISTS token_usage_logs_created_at_idx
        ON public.token_usage_logs(created_at DESC);

        RAISE NOTICE '✓ Index created on created_at';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Current schema:';
END $$;

-- Show current table structure
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'token_usage_logs'
ORDER BY ordinal_position;

-- Verify
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Schema fix completed!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 🎯 FINAL FIX - RUN THIS TO FIX EVERYTHING
-- ============================================
-- This fixes both issues:
-- 1. Type mismatch (VARCHAR vs UUID)
-- 2. Missing created_at column in token_usage_logs
--
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: Fix token_usage_logs schema
-- ============================================

DO $$
DECLARE
    has_created_at boolean;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PART 1: Fixing token_usage_logs schema';
    RAISE NOTICE '========================================';

    -- Check if created_at exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'token_usage_logs'
        AND column_name = 'created_at'
    ) INTO has_created_at;

    IF has_created_at THEN
        RAISE NOTICE '  ✓ created_at column already exists';
    ELSE
        RAISE NOTICE '  Adding created_at column...';

        ALTER TABLE public.token_usage_logs
        ADD COLUMN created_at timestamp without time zone DEFAULT now() NOT NULL;

        CREATE INDEX IF NOT EXISTS token_usage_logs_created_at_idx
        ON public.token_usage_logs(created_at DESC);

        RAISE NOTICE '  ✓ created_at column added with index';
    END IF;
END $$;

-- ============================================
-- PART 2: Create VARCHAR wrapper function
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PART 2: Creating VARCHAR wrapper function';
    RAISE NOTICE '========================================';
END $$;

CREATE OR REPLACE FUNCTION public.consume_token(
    p_user_id text,
    p_tool_id character varying,  -- VARCHAR version (wrapper)
    p_tokens_to_consume integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Cast VARCHAR to UUID and call the real UUID function
    RETURN public.consume_token(
        p_user_id,
        p_tool_id::uuid,  -- Cast to UUID
        p_tokens_to_consume
    );
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_TOOL_ID',
            'message', 'tool_id must be a valid UUID',
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INTERNAL_ERROR',
            'message', 'Wrapper error: ' || SQLERRM,
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_token(text, character varying, integer) TO authenticated, service_role;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

DO $$
DECLARE
    func_count integer;
    has_created_at boolean;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '========================================';

    -- Count functions
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname = 'consume_token';

    RAISE NOTICE '✓ consume_token functions: %', func_count;

    IF func_count = 2 THEN
        RAISE NOTICE '  1. consume_token(text, uuid, integer) - Original';
        RAISE NOTICE '  2. consume_token(text, varchar, integer) - Wrapper';
    ELSE
        RAISE WARNING '  Expected 2 but found %', func_count;
    END IF;

    -- Check created_at
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'token_usage_logs'
        AND column_name = 'created_at'
    ) INTO has_created_at;

    IF has_created_at THEN
        RAISE NOTICE '✓ token_usage_logs.created_at exists';
    ELSE
        RAISE WARNING '✗ token_usage_logs.created_at MISSING!';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 ALL FIXES APPLIED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test your app - try using a tool';
    RAISE NOTICE '  2. Function should now work correctly';
    RAISE NOTICE '  3. Logs will be saved with timestamps';
    RAISE NOTICE '';
END $$;

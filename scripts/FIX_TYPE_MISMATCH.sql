-- ============================================
-- FIX: Create wrapper function for VARCHAR → UUID
-- ============================================
-- Client is calling with VARCHAR but function expects UUID
-- This creates a wrapper to handle both types

-- Create wrapper function that accepts VARCHAR
CREATE OR REPLACE FUNCTION public.consume_token(
    p_user_id text,
    p_tool_id character varying,  -- VARCHAR version
    p_tokens_to_consume integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Cast VARCHAR to UUID and call the real function
    RETURN public.consume_token(
        p_user_id,
        p_tool_id::uuid,  -- Cast to UUID
        p_tokens_to_consume
    );
EXCEPTION
    WHEN invalid_text_representation THEN
        -- If cast fails, return error
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
            'message', 'An error occurred: ' || SQLERRM,
            'tokens_used', 0,
            'tokens_remaining', 0,
            'daily_limit', 0
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.consume_token(text, character varying, integer) TO authenticated, service_role;

-- Verify both versions exist
DO $$
DECLARE
    func_count integer;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE proname = 'consume_token';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Function Versions Created';
    RAISE NOTICE '========================================';

    IF func_count = 2 THEN
        RAISE NOTICE '✓ Both versions exist:';
        RAISE NOTICE '  1. consume_token(text, uuid, integer) - Original';
        RAISE NOTICE '  2. consume_token(text, varchar, integer) - Wrapper';
        RAISE NOTICE '';
        RAISE NOTICE 'Client can now call with either UUID or VARCHAR';
    ELSE
        RAISE WARNING 'Expected 2 functions but found: %', func_count;
    END IF;

    RAISE NOTICE '========================================';
END $$;

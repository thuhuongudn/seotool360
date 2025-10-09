-- ============================================
-- MIGRATION 15: Add USP and Target Audience to Social Media Posts
-- ============================================
-- This migration adds 'usp' and 'target_audience' fields to the
-- social_media_posts table to support USP-first-storytelling post type.

-- ============================================
-- ADD NEW COLUMNS TO SOCIAL_MEDIA_POSTS TABLE
-- ============================================

DO $$
BEGIN
    -- Add 'usp' column (Unique Selling Point)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'social_media_posts'
        AND column_name = 'usp'
    ) THEN
        ALTER TABLE public.social_media_posts
        ADD COLUMN usp text;

        RAISE NOTICE 'Added column: usp';
    ELSE
        RAISE NOTICE 'Column already exists: usp';
    END IF;

    -- Add 'target_audience' column (Đối tượng mục tiêu)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'social_media_posts'
        AND column_name = 'target_audience'
    ) THEN
        ALTER TABLE public.social_media_posts
        ADD COLUMN target_audience text;

        RAISE NOTICE 'Added column: target_audience';
    ELSE
        RAISE NOTICE 'Column already exists: target_audience';
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if columns were added successfully
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'social_media_posts'
AND column_name IN ('usp', 'target_audience')
ORDER BY ordinal_position;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 15 completed successfully!';
    RAISE NOTICE 'Added columns: usp, target_audience to social_media_posts table';
END $$;

-- Check schema of existing tables
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('seo_tools', 'profiles', 'daily_token_usage')
ORDER BY table_name, ordinal_position;

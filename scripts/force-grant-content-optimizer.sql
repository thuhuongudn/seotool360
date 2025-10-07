-- ============================================
-- FORCE GRANT CONTENT OPTIMIZER TO ALL USERS
-- ============================================
-- This script will grant content-optimizer to ALL trial users
-- regardless of whether they already have it or not
-- Uses ON CONFLICT to handle duplicates safely

INSERT INTO user_tool_access (user_id, tool_id, permission, granted_by, created_at)
SELECT
    p.user_id,
    '62e53fcd-263e-48c6-bca2-820af25aa4b8' as tool_id,
    'use' as permission,
    '00000000-0000-0000-0000-000000000000' as granted_by,
    NOW() as created_at
FROM profiles p
WHERE p.plan = 'trial'
AND p.status = 'active'
ON CONFLICT (user_id, tool_id) DO NOTHING;

-- Verify the result
SELECT
    '=== VERIFICATION ===' as section,
    COUNT(*) as total_users_with_access
FROM user_tool_access
WHERE tool_id = '62e53fcd-263e-48c6-bca2-820af25aa4b8';

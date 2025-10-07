-- ============================================
-- CHECK USER ACCESS TO CONTENT OPTIMIZER
-- ============================================
-- This script checks which users have access to content-optimizer
-- and provides detailed information about their permissions

-- Step 1: Verify content-optimizer tool exists
SELECT
    '=== TOOL INFORMATION ===' as section,
    id as tool_id,
    name,
    title,
    status,
    created_at
FROM seo_tools
WHERE name = 'content-optimizer';

-- Step 2: Count total users and users with access
SELECT
    '=== ACCESS SUMMARY ===' as section,
    (SELECT COUNT(*) FROM profiles WHERE plan = 'trial' AND status = 'active') as total_trial_users,
    (SELECT COUNT(DISTINCT user_id)
     FROM user_tool_access
     WHERE tool_id = '62e53fcd-263e-48c6-bca2-820af25aa4b8') as users_with_access,
    (SELECT COUNT(*)
     FROM profiles p
     WHERE p.plan = 'trial'
     AND p.status = 'active'
     AND NOT EXISTS (
         SELECT 1 FROM user_tool_access uta
         WHERE uta.user_id = p.user_id
         AND uta.tool_id = '62e53fcd-263e-48c6-bca2-820af25aa4b8'
     )) as users_without_access;

-- Step 3: Show users WITH content-optimizer access
SELECT
    '=== USERS WITH ACCESS ===' as section,
    p.username,
    p.user_id,
    p.plan,
    p.status,
    uta.permission,
    uta.created_at as granted_at
FROM profiles p
JOIN user_tool_access uta ON uta.user_id = p.user_id
WHERE uta.tool_id = '62e53fcd-263e-48c6-bca2-820af25aa4b8'
AND p.plan = 'trial'
AND p.status = 'active'
ORDER BY uta.created_at DESC
LIMIT 10;

-- Step 4: Show users WITHOUT content-optimizer access (if any)
SELECT
    '=== USERS WITHOUT ACCESS ===' as section,
    p.username,
    p.user_id,
    p.plan,
    p.status,
    p.created_at as user_created_at
FROM profiles p
WHERE p.plan = 'trial'
AND p.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM user_tool_access uta
    WHERE uta.user_id = p.user_id
    AND uta.tool_id = '62e53fcd-263e-48c6-bca2-820af25aa4b8'
)
ORDER BY p.created_at DESC;

-- Step 5: Check all tools each user has access to (sample first user)
SELECT
    '=== SAMPLE USER TOOL ACCESS ===' as section,
    p.username,
    st.name as tool_name,
    st.title as tool_title,
    uta.permission,
    uta.created_at as granted_at
FROM profiles p
JOIN user_tool_access uta ON uta.user_id = p.user_id
JOIN seo_tools st ON st.id = uta.tool_id
WHERE p.plan = 'trial'
AND p.status = 'active'
ORDER BY p.username, st.name
LIMIT 10;

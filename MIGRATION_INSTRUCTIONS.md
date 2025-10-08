# Migration Instructions: Fix Auto-Grant Trigger

## Issue
User mới tạo không được tự động cấp quyền vào **content-optimizer** tool vì trigger function đang dùng tool ID sai.

## Root Cause
- Script `insert-content-optimizer.js` đã tạo 3 tool duplicate
- Trigger function vẫn dùng tool ID cũ/sai
- Đã xóa 2 duplicate, giữ lại tool ID đúng: `9714610d-a597-435e-852e-036944f4daf0`

## Solution
Cần chạy SQL migration để update trigger function với tool ID đúng.

## Steps to Fix

### Option 1: Via Supabase Dashboard (Recommended)

1. **Mở Supabase SQL Editor:**
   - Truy cập: https://supabase.com/dashboard/project/[your-project-id]/sql
   - Hoặc vào dashboard → SQL Editor

2. **Paste và chạy SQL:**
   ```sql
   -- Copy toàn bộ nội dung từ file này:
   scripts/update-auto-grant-trigger.sql
   ```

3. **Click "Run"** để execute

4. **Verify:**
   ```sql
   -- Check function definition
   SELECT pg_get_functiondef(oid) as definition
   FROM pg_proc
   WHERE proname = 'auto_grant_tools_to_new_user';
   ```

### Option 2: Via Heroku Postgres CLI

```bash
# Connect to Heroku Postgres
heroku pg:psql -a seotool360

# Run in psql:
\i scripts/update-auto-grant-trigger.sql

# Or in one command:
heroku pg:psql -a seotool360 < scripts/update-auto-grant-trigger.sql
```

### Option 3: Via Local psql

```bash
# If you have DATABASE_URL
psql "$DATABASE_URL" -f scripts/update-auto-grant-trigger.sql
```

## Verification

### Test 1: Check Current Function
```sql
SELECT pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'auto_grant_tools_to_new_user';
```

Kết quả phải chứa:
- `'1b2f8454-3fef-425d-bef8-b445dc54dbac'` (keyword-planner)
- `'1ff742f6-52d2-49ef-8979-7647423438ca'` (search-intent)
- `'9714610d-a597-435e-852e-036944f4daf0'` (content-optimizer - **TOOL ID ĐÚNG**)

### Test 2: Create New Trial User

Tạo user mới với plan='trial' và status='active', sau đó check:

```sql
-- Check tools granted to newest user
SELECT
    p.username,
    st.name as tool_name,
    uta.created_at as granted_at
FROM profiles p
JOIN user_tool_access uta ON uta.user_id = p.user_id
JOIN seo_tools st ON st.id = uta.tool_id
WHERE p.plan = 'trial'
ORDER BY p.created_at DESC, uta.created_at DESC
LIMIT 10;
```

Kết quả phải có **3 tools**:
- keyword-planner ✅
- search-intent ✅
- content-optimizer ✅

## Expected Result

✅ User mới tạo sẽ tự động nhận được 3 tools:
1. Keyword Planner
2. Search Intent
3. **Content Optimizer** (đã fix)

## Files Changed

- [scripts/update-auto-grant-trigger.sql](scripts/update-auto-grant-trigger.sql) - SQL migration
- [scripts/04-auto-grant-tools-for-new-users.sql](scripts/04-auto-grant-tools-for-new-users.sql) - Updated với tool ID đúng
- [scripts/check-and-update-auto-grant-trigger.js](scripts/check-and-update-auto-grant-trigger.js) - Script kiểm tra
- [scripts/run-sql-migration.js](scripts/run-sql-migration.js) - Migration runner

## Troubleshooting

### Issue: Trigger không chạy
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_grant_tools';

-- Recreate trigger if needed
DROP TRIGGER IF EXISTS trigger_auto_grant_tools ON public.profiles;
CREATE TRIGGER trigger_auto_grant_tools
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_grant_tools_to_new_user();
```

### Issue: User không nhận được tool
```sql
-- Manual grant for specific user
INSERT INTO user_tool_access (user_id, tool_id, permission, granted_by, created_at)
VALUES
    ('[user_id]', '9714610d-a597-435e-852e-036944f4daf0', 'use', '00000000-0000-0000-0000-000000000000', NOW())
ON CONFLICT (user_id, tool_id) DO NOTHING;
```

## Contact

Nếu gặp vấn đề, check logs hoặc liên hệ dev team.

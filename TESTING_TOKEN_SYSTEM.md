# Testing Token Management System

## ✅ Backend Status (VERIFIED)

All backend components are working correctly:

- ✅ Auto-grant tools trigger (keyword-planner + search-intent for new users)
- ✅ Plan & expiry dates set correctly for all users
- ✅ Token quota system (10 tokens/day for trial, 50 for member)
- ✅ Token consumption API working (`consume_token` RPC)
- ✅ Token usage retrieval API working (`get_user_token_usage` RPC)

## 🔍 Frontend Testing Checklist

### Test 1: TokenWidget Display

**Steps:**
1. Open browser at `http://localhost:5001`
2. Login with any member user (e.g., `tanquangyds`)
3. Click on avatar/username in header (top right)
4. **Expected**: Should see TokenWidget showing token quota

**Expected Result:**
```
Token quota hôm nay
9 / 10
[Progress bar showing 90% used]
Token reset lúc 00:00 (GMT+7)
Hạn gói: 28/10/2025
```

**If not showing:**
- Open browser DevTools (F12) → Console tab
- Check for errors related to:
  - `useUserProfile` hook
  - `useTokenUsage` hook
  - `fetchUserProfile` or `fetchTokenUsage` API calls
- Copy error messages for debugging

---

### Test 2: Token Consumption - Keyword Planner

**Steps:**
1. Navigate to `/keyword-planner`
2. Enter keyword: `test keyword`
3. Click "Tìm ý tưởng từ khóa" button
4. **Expected**:
   - Button should disable briefly
   - Tool should execute
   - Token count should decrease (9 → 8)

**Verification:**
- Open TokenWidget again → should show `8 / 10`
- Check database:
```sql
SELECT tokens_used, tokens_limit
FROM daily_token_usage
WHERE user_id = 'cb5df606-439d-43f8-ac07-e8921a0cfc5b'
AND usage_date = CURRENT_DATE;
```
Expected: `tokens_used = 2` (1 from backend test + 1 from UI test)

**If fails:**
- Open DevTools Console
- Check for errors in `consumeToken` API call
- Check Network tab → Filter by `consume_token` → inspect request/response

---

### Test 3: Token Consumption - Search Intent

**Steps:**
1. Navigate to `/search-intent`
2. Enter keyword: `test search`
3. Click "Phân tích Search Intent" button
4. **Expected**: Token consumption (8 → 7)
5. Scroll down and click "Xây dựng chiến lược nội dung cho từ khóa"
6. **Expected**: Another token consumption (7 → 6)

**Verification:**
- Check TokenWidget: should show `6 / 10`
- Database should show `tokens_used = 4`

---

### Test 4: StatusBanner Display

**Test Scenario A: Pending Status**
1. Use admin to set a user's status to `pending`:
```sql
SELECT admin_update_user_status('USER_ID_HERE', 'pending');
```
2. Login with that user
3. **Expected**: Yellow warning banner at top of page
   - Title: "Tài khoản đang chờ xác nhận"
   - Message: explaining pending status
   - Button: "Liên hệ hỗ trợ"

**Test Scenario B: Expiring Soon**
1. Set user's trial_ends_at to 2 days from now:
```sql
SELECT admin_update_user_plan(
  'USER_ID_HERE',
  'trial',
  (NOW() + INTERVAL '2 days')::timestamp,
  NULL
);
```
2. Login with that user
3. **Expected**: Blue info banner
   - Title: "Gói dùng thử sắp hết hạn"
   - Message: "Gói của bạn sẽ hết hạn sau 2 ngày"
   - Button: "Nâng cấp ngay"

---

### Test 5: Admin UI

**Steps:**
1. Login with admin user: `nhathuocvietnhatdn`
2. Navigate to `/admin/users`
3. **Expected**: Table showing all 7 users with columns:
   - Username
   - Email (may be empty if not in DB)
   - Role (badge: admin/member)
   - Plan (badge: trial/member)
   - Status (badge: active/pending/disabled)
   - Trial Ends
   - Member Ends
   - Created
   - Actions (Edit button)

4. Click "Chỉnh sửa" on any user
5. **Expected**: Dialog opens with form fields:
   - Plan dropdown (trial/member)
   - Status dropdown (active/pending/disabled)
   - Role dropdown (admin/member)
   - Trial Ends At (datetime picker)
   - Member Ends At (datetime picker)

6. Change user's plan from `trial` to `member`
7. Set `member_ends_at` to 30 days from now
8. Click "Cập nhật"
9. **Expected**:
   - Success toast message
   - Table refreshes
   - User's plan shows "member" badge
   - Token quota should increase to 50/day

**Verification:**
```sql
SELECT username, plan, trial_ends_at, member_ends_at
FROM profiles
WHERE user_id = 'USER_ID_YOU_UPDATED';

SELECT daily_limit
FROM plan_quota
WHERE plan = 'member';
-- Should return 50
```

---

### Test 6: Token Limit Enforcement

**Steps:**
1. Login with user who has consumed 9/10 tokens
2. Navigate to `/keyword-planner`
3. Click "Tìm ý tưởng từ khóa" (this should consume the last token)
4. **Expected**: Success (10/10 tokens used)
5. Try to use the tool again
6. **Expected**:
   - Button should be disabled OR
   - Error toast: "Hết token hôm nay"
   - Message: "Bạn đã sử dụng hết 10 tokens cho hôm nay..."

**Verification:**
```sql
SELECT tokens_used, tokens_limit
FROM daily_token_usage
WHERE user_id = 'USER_ID' AND usage_date = CURRENT_DATE;
-- Should show: tokens_used = 10, tokens_limit = 10
```

---

### Test 7: Admin Bypass (Unlimited Tokens)

**Steps:**
1. Login with admin user: `nhathuocvietnhatdn`
2. Navigate to `/keyword-planner`
3. Use the tool multiple times (10+ times)
4. **Expected**:
   - No token consumption
   - TokenWidget should show "Không giới hạn (Unlimited)"
   - Tools should always work

**Verification:**
```sql
-- Admin should NOT have entries in daily_token_usage
SELECT * FROM daily_token_usage
WHERE user_id = 'bc79e815-40d5-4137-812f-053a62914cd4';
-- May return old entries but should not increase
```

---

## 🐛 Common Issues & Solutions

### Issue 1: TokenWidget not showing
**Symptoms:** Dropdown menu doesn't show token info

**Debug:**
1. Open DevTools Console
2. Check for errors in `useUserProfile` or `useTokenUsage` hooks
3. Check Network tab → look for failed API calls to Supabase
4. Verify Supabase env vars in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

**Fix:**
- Ensure user is logged in (check `auth.uid()`)
- Check RLS policies on `profiles` and `daily_token_usage` tables
- Verify frontend imports are correct

---

### Issue 2: Token consumption not working
**Symptoms:** Button clicks but token count doesn't decrease

**Debug:**
1. Check browser Console for errors
2. Check Network tab → `consume_token` RPC call
3. Verify request payload:
```json
{
  "p_user_id": "cb5df606-439d-43f8-ac07-e8921a0cfc5b",
  "p_tokens_to_consume": 1
}
```
4. Check response:
```json
{
  "success": true,
  "tokens_remaining": 9,
  ...
}
```

**Fix:**
- Ensure `executeWithToken` wrapper is used in tool pages
- Check `useTokenManagement` hook is imported correctly
- Verify `consumeToken` API client function

---

### Issue 3: Admin UI not loading users
**Symptoms:** `/admin/users` shows empty or loading state

**Debug:**
1. Check browser Console for errors
2. Verify user has admin role:
```sql
SELECT role FROM profiles WHERE user_id = 'YOUR_USER_ID';
```
3. Check Network tab → `profiles` query
4. Check RLS policy allows admin to read all profiles

**Fix:**
- Ensure admin user has `role = 'admin'`
- Verify `fetchAllUsers` function in `api-client.ts`
- Check Supabase RLS policies on `profiles` table

---

## 📊 Database Queries for Manual Verification

### Check all users and their quotas:
```sql
SELECT
    p.username,
    p.plan,
    p.status,
    pq.daily_token_limit,
    COALESCE(dtu.tokens_used, 0) as used_today,
    pq.daily_token_limit - COALESCE(dtu.tokens_used, 0) as remaining
FROM profiles p
LEFT JOIN plan_quota pq ON p.plan = pq.plan
LEFT JOIN daily_token_usage dtu ON p.user_id = dtu.user_id
    AND dtu.usage_date = CURRENT_DATE
ORDER BY p.created_at DESC;
```

### Check token consumption history:
```sql
SELECT
    p.username,
    dtu.usage_date,
    dtu.tokens_used,
    dtu.tokens_limit
FROM daily_token_usage dtu
JOIN profiles p ON dtu.user_id = p.user_id
ORDER BY dtu.usage_date DESC, p.username;
```

### Check tool access for specific user:
```sql
SELECT
    p.username,
    st.name,
    st.title
FROM user_tool_access uta
JOIN profiles p ON uta.user_id = p.user_id
JOIN seo_tools st ON uta.tool_id = st.id
WHERE p.username = 'tanquangyds'
ORDER BY st.name;
```

---

## ✅ Success Criteria

All features working if:
- ✅ TokenWidget shows correct quota for all users
- ✅ Token consumption works on keyword-planner and search-intent (2 functions)
- ✅ Token limit is enforced (can't use tools after quota exhausted)
- ✅ Admin has unlimited tokens (bypass consumption)
- ✅ StatusBanner shows for pending/disabled/expiring users
- ✅ Admin UI shows all users and allows editing
- ✅ Plan changes reflect immediately (trial 10 → member 50 tokens)

---

## 🆘 If Still Having Issues

Please provide:
1. Screenshot of TokenWidget (or lack thereof)
2. Browser Console errors (full stack trace)
3. Network tab screenshot showing failed requests
4. Database query results from verification queries above
5. User ID you're testing with

This will help diagnose the exact issue.

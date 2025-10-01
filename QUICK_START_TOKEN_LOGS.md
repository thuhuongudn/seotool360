# 🚀 Quick Start - Token Usage Logs

## Bước 1: Chạy Migration Script

### Option A: Sử dụng Supabase Dashboard (Khuyến nghị)

1. **Mở Supabase Dashboard**
   - Đăng nhập vào [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Chọn project của bạn

2. **Vào SQL Editor**
   - Click **SQL Editor** ở sidebar trái
   - Click **New Query**

3. **Copy & Paste Script**
   - Mở file: [scripts/RUN_ALL_TOKEN_LOGS_MIGRATIONS.sql](scripts/RUN_ALL_TOKEN_LOGS_MIGRATIONS.sql)
   - Copy toàn bộ nội dung
   - Paste vào SQL Editor

4. **Chạy Script**
   - Click nút **Run** (hoặc Ctrl+Enter / Cmd+Enter)
   - Đợi khoảng 5-10 giây
   - Xem kết quả ở phần **Results**

5. **Verify Kết Quả**
   ```
   Bạn sẽ thấy output như:

   ========================================
   TOKEN USAGE LOGS - MIGRATION COMPLETE
   ========================================
   Table created: t
   Indexes created: 4
   Functions created: 4
   ========================================

   ✅ All migrations applied successfully!
   ```

### Option B: Sử dụng psql (Command Line)

```bash
# Nếu bạn có DATABASE_URL
psql $DATABASE_URL -f scripts/RUN_ALL_TOKEN_LOGS_MIGRATIONS.sql

# Hoặc với connection string
psql "postgresql://user:pass@host:5432/db" -f scripts/RUN_ALL_TOKEN_LOGS_MIGRATIONS.sql
```

---

## Bước 2: Chạy Test Script (Tùy chọn nhưng khuyến nghị)

### Trong Supabase SQL Editor:

1. **New Query** mới
2. Copy & paste nội dung từ: [scripts/TEST_TOKEN_LOGS.sql](scripts/TEST_TOKEN_LOGS.sql)
3. Click **Run**
4. Xem test results

**Expected output:**
```
✅ TEST 1 PASSED - Token consumption creates logs
✅ TEST 2 PASSED - Query function works
✅ TEST 3 PASSED - Statistics function works
✅ TEST 4 PASSED - Table structure correct
✅ TEST 5 PASSED - Foreign keys enforced
✅ TEST 6 PASSED - Indexes created

READY FOR PRODUCTION
```

---

## Bước 3: Verify trong App

### 3.1. Kiểm tra Admin Token Logs Page

1. **Mở browser và login as admin**
   ```
   http://localhost:5001/admin
   ```

2. **Navigate to Token Logs**
   - Click tab **"Token Logs"** trên Admin Console
   - Hoặc trực tiếp: `http://localhost:5001/admin/token-logs`

3. **Verify hiển thị đúng**
   - ✅ Trang load không lỗi
   - ✅ Tab "Logs" hiển thị (có thể empty nếu chưa có data)
   - ✅ Tab "Statistics" hiển thị
   - ✅ Không có error trong console

### 3.2. Kiểm tra Dashboard Recent Activity

1. **Vào Dashboard**
   ```
   http://localhost:5001/dashboard
   ```

2. **Verify section "Hoạt động gần đây"**
   - ✅ Admin: Thấy section với nút "Xem tất cả"
   - ✅ Member: KHÔNG thấy section (đã comment)

### 3.3. Generate Test Logs

1. **Sử dụng một tool bất kỳ** (VD: Keyword Planner, Search Intent)
2. **Tool sẽ consume token**
3. **Quay lại `/admin/token-logs`**
4. **Verify log xuất hiện** với:
   - Username
   - Tool name
   - Tokens consumed
   - Timestamp

---

## Bước 4: Verify Database Trực Tiếp

### Trong Supabase SQL Editor:

```sql
-- Check table exists
SELECT COUNT(*) as log_count
FROM public.token_usage_logs;

-- View recent logs
SELECT
    l.id,
    l.user_id,
    p.username,
    t.name as tool_name,
    l.consumed,
    l.created_at
FROM public.token_usage_logs l
LEFT JOIN public.profiles p ON p.user_id = l.user_id
LEFT JOIN public.seo_tools t ON t.id = l.tool_id
ORDER BY l.created_at DESC
LIMIT 10;

-- Check functions exist
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname IN (
    'consume_token',
    'get_token_usage_logs',
    'get_token_usage_stats',
    'cleanup_token_usage_logs'
)
ORDER BY proname;
```

**Expected:**
- ✅ `log_count` có thể là 0 hoặc nhiều hơn
- ✅ Recent logs query trả về data (nếu đã có)
- ✅ 4 functions tồn tại

---

## 🐛 Troubleshooting

### Issue 1: "Function not found"
```
Error: Could not find the function public.get_token_usage_logs
```

**Solution:**
- Chạy lại migration script (Bước 1)
- Verify functions exist (query ở Bước 4)

### Issue 2: "401 Unauthorized"
```
Access denied. Admin privileges required.
```

**Solution:**
- ✅ Đã sửa trong [AUTH_FIX.md](AUTH_FIX.md)
- Verify bạn đang dùng `apiRequest` không phải `fetch()`
- Check browser console có Authorization header

### Issue 3: "Table does not exist"
```
relation "public.token_usage_logs" does not exist
```

**Solution:**
- Chạy migration script (Bước 1)
- Verify table exists:
  ```sql
  SELECT * FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'token_usage_logs';
  ```

### Issue 4: Không thấy logs trong UI
```
Page loads but shows "Chưa có hoạt động nào"
```

**Possible causes:**
1. Chưa có logs → Sử dụng tool để generate
2. User không phải admin → Check user role
3. Filter đang active → Clear filters

---

## ✅ Success Checklist

- [ ] Migration script chạy thành công
- [ ] Test script pass tất cả tests
- [ ] `/admin/token-logs` hiển thị không lỗi
- [ ] Dashboard "Hoạt động gần đây" hiển thị (admin only)
- [ ] Consume token từ tool → log xuất hiện
- [ ] Statistics tab có data
- [ ] CSV export hoạt động
- [ ] Filters hoạt động
- [ ] Pagination hoạt động

---

## 📊 What Was Created?

### Database Objects:

1. **Table:** `token_usage_logs`
   - Stores every token consumption event
   - Foreign keys to `profiles` and `seo_tools`
   - 4 optimized indexes

2. **Functions:**
   - `consume_token(user_id, tool_id, tokens)` - Consume & log
   - `get_token_usage_logs(filters...)` - Query logs (admin only)
   - `get_token_usage_stats(filters...)` - Get statistics (admin only)
   - `cleanup_token_usage_logs()` - Delete old logs (>90 days)

3. **RLS Policies:**
   - Admin can SELECT all logs
   - Service role has full access
   - Regular users CANNOT read logs

### API Endpoints:

- `GET /api/admin/token-usage-logs` - Query with filters
- `GET /api/admin/token-usage-stats` - Get statistics

### UI Pages:

- `/admin/token-logs` - Full admin interface
- `/dashboard` - Shows 5 recent logs (admin only)

---

## 🎯 Next Steps

1. ✅ **Production Deploy:**
   - Run migration on production database
   - Test thoroughly
   - Monitor logs

2. ✅ **Monitor Usage:**
   - Check `/admin/token-logs` daily
   - Review top users & tools
   - Identify patterns

3. ✅ **Cleanup:**
   - Logs >90 days auto-deleted
   - Or manual: `SELECT cleanup_token_usage_logs();`

---

**Need Help?**
- Check [TOKEN_USAGE_LOGS_DEPLOYMENT.md](scripts/TOKEN_USAGE_LOGS_DEPLOYMENT.md)
- Check [AUTH_FIX.md](AUTH_FIX.md)
- Check [NAVIGATION_UPDATE.md](NAVIGATION_UPDATE.md)

**Status:** ✅ Ready for Production
**Date:** 2025-10-01
**Branch:** `feature/tracking-token-usage-log`

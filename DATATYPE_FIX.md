# 🔧 Data Type Fix - Tool ID UUID vs VARCHAR

## 🐛 Lỗi Gặp Phải

```
ERROR: 42804: foreign key constraint "token_usage_logs_tool_id_fkey" cannot be implemented
DETAIL: Key columns "tool_id" and "id" are of incompatible types: uuid and character varying.
```

## 🔍 Nguyên Nhân

Script migration ban đầu định nghĩa `tool_id` là `uuid`:
```sql
CREATE TABLE public.token_usage_logs (
    ...
    tool_id uuid NOT NULL,  -- ❌ SAI!
    ...
);
```

Nhưng bảng `seo_tools` thực tế có cột `id` là `VARCHAR`:
```sql
-- seo_tools schema
CREATE TABLE public.seo_tools (
    id character varying PRIMARY KEY,  -- VARCHAR, không phải UUID!
    ...
);
```

→ **Mismatch giữa `uuid` và `varchar` → Foreign key constraint fail!**

## ✅ Giải Pháp

Đã tạo script mới với data type đúng: **character varying** thay vì uuid

### File Đã Sửa: `RUN_ALL_TOKEN_LOGS_MIGRATIONS_FIXED.sql`

**Thay đổi chính:**

```sql
-- ✅ ĐÚNG
CREATE TABLE public.token_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id text NOT NULL,
    tool_id character varying NOT NULL,  -- ✅ FIXED: varchar thay vì uuid
    consumed integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT token_usage_logs_tool_id_fkey
        FOREIGN KEY (tool_id)
        REFERENCES public.seo_tools(id)  -- Giờ match với VARCHAR
        ON DELETE CASCADE
);
```

**Tất cả functions cũng được update:**

```sql
-- consume_token
CREATE OR REPLACE FUNCTION public.consume_token(
    p_user_id text,
    p_tool_id character varying,  -- ✅ FIXED
    p_tokens_to_consume integer DEFAULT 1
)

-- get_token_usage_logs
CREATE OR REPLACE FUNCTION public.get_token_usage_logs(
    p_user_id text DEFAULT NULL,
    p_tool_id character varying DEFAULT NULL,  -- ✅ FIXED
    ...
)
```

## 📋 Files Bị Ảnh Hưởng

### ❌ Files CŨ (KHÔNG DÙNG):
- ~~`scripts/RUN_ALL_TOKEN_LOGS_MIGRATIONS.sql`~~ - Có lỗi UUID
- ~~`scripts/10-create-token-usage-logs.sql`~~ - Có lỗi UUID
- ~~`scripts/11-update-consume-token-with-logging.sql`~~ - Có lỗi UUID
- ~~`scripts/13-create-get-token-usage-logs-rpc.sql`~~ - Có lỗi UUID

### ✅ Files MỚI (SỬ DỤNG):
- **`scripts/RUN_ALL_TOKEN_LOGS_MIGRATIONS_FIXED.sql`** ⭐ **CHẠY FILE NÀY!**
- `scripts/TEST_TOKEN_LOGS.sql` - Vẫn dùng được
- `scripts/CHECK_SCHEMA.sql` - Tool để check schema

## 🧪 Verify Data Types

Chạy query này để xác nhận data types:

```sql
-- Check seo_tools.id type
SELECT
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'seo_tools'
AND column_name = 'id';

-- Expected result:
-- column_name | data_type         | character_maximum_length
-- id          | character varying | NULL or some number
```

## 🔄 Migration Path

### Nếu đã chạy script cũ (có lỗi):

```sql
-- 1. Drop table nếu đã tạo
DROP TABLE IF EXISTS public.token_usage_logs CASCADE;

-- 2. Drop functions nếu đã tạo với signature cũ
DROP FUNCTION IF EXISTS public.consume_token(text, uuid, integer);
DROP FUNCTION IF EXISTS public.get_token_usage_logs(text, uuid, timestamptz, timestamptz, integer, integer);

-- 3. Chạy lại script mới
-- Copy RUN_ALL_TOKEN_LOGS_MIGRATIONS_FIXED.sql vào SQL Editor và Run
```

### Nếu chưa chạy gì:

```sql
-- Chỉ cần chạy script FIXED
-- Copy RUN_ALL_TOKEN_LOGS_MIGRATIONS_FIXED.sql vào SQL Editor và Run
```

## 📊 Impact Analysis

### Tables Created:
```
token_usage_logs (
    id: uuid PRIMARY KEY
    user_id: text → profiles.user_id
    tool_id: varchar → seo_tools.id  ✅ FIXED
    consumed: integer
    created_at: timestamptz
)
```

### Functions Created:
```
✅ consume_token(text, varchar, integer)
✅ get_token_usage_logs(text, varchar, timestamptz, timestamptz, integer, integer)
✅ get_token_usage_stats(text, timestamptz, timestamptz)
✅ cleanup_token_usage_logs()
```

## ✅ Verification Checklist

Sau khi chạy script FIXED, verify:

```sql
-- 1. Check table exists with correct schema
\d public.token_usage_logs

-- 2. Check tool_id is VARCHAR
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'token_usage_logs'
AND column_name = 'tool_id';
-- Should return: character varying

-- 3. Check foreign key constraint exists
SELECT
    conname,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'token_usage_logs_tool_id_fkey';
-- Should return 1 row

-- 4. Check functions exist
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname = 'consume_token'
AND pg_get_function_arguments(oid) LIKE '%character varying%';
-- Should show: p_user_id text, p_tool_id character varying, ...
```

## 🎯 Root Cause

Lỗi xảy ra do:
1. Tôi giả định `seo_tools.id` là UUID (pattern thường thấy)
2. Nhưng thực tế schema dùng VARCHAR cho tool IDs
3. Không verify schema trước khi viết migration

## 📖 Lessons Learned

1. **Always check existing schema** trước khi viết foreign keys
2. **Use information_schema** để query data types
3. **Test migrations** trên dev DB trước production
4. **Document data type decisions** trong migration comments

## 🚀 Next Steps

1. ✅ Chạy `RUN_ALL_TOKEN_LOGS_MIGRATIONS_FIXED.sql`
2. ✅ Chạy `TEST_TOKEN_LOGS.sql` để verify
3. ✅ Test UI tại `/admin/token-logs`
4. ✅ Generate test logs bằng cách sử dụng tools

---

**Status:** ✅ FIXED
**Date:** 2025-10-01
**File to use:** [scripts/RUN_ALL_TOKEN_LOGS_MIGRATIONS_FIXED.sql](scripts/RUN_ALL_TOKEN_LOGS_MIGRATIONS_FIXED.sql)

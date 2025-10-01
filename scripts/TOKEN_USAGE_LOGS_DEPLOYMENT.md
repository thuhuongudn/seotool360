# Token Usage Logs - Deployment Guide

## 📋 Overview

This system tracks detailed token usage logs for analytics and auditing purposes. It includes:
- Detailed logging of every token consumption
- Admin-only query APIs with filtering and pagination
- Automatic cleanup of old logs (>90 days)
- Statistics and analytics endpoints
- RLS policies for data security

---

## 🗂️ Migration Files

Execute these SQL scripts in order:

### 1. **10-create-token-usage-logs.sql**
Creates the `token_usage_logs` table with:
- Foreign keys to `profiles` and `seo_tools`
- Optimized indexes for queries
- RLS policies (admin-only access)

```bash
psql $DATABASE_URL -f scripts/10-create-token-usage-logs.sql
```

### 2. **11-update-consume-token-with-logging.sql**
Updates the `consume_token()` RPC to:
- Add `p_tool_id` parameter (BREAKING CHANGE!)
- Insert log entry after successful consumption
- Validate tool_id exists

```bash
psql $DATABASE_URL -f scripts/11-update-consume-token-with-logging.sql
```

⚠️ **BREAKING CHANGE**: All calls to `consume_token()` must now include `p_tool_id` parameter!

### 3. **12-create-token-usage-cleanup.sql**
Creates scheduled cleanup job:
- Function: `cleanup_token_usage_logs()`
- Schedule: Daily at 02:00
- Deletes logs older than 90 days

```bash
psql $DATABASE_URL -f scripts/12-create-token-usage-cleanup.sql
```

### 4. **13-create-get-token-usage-logs-rpc.sql**
Creates admin query functions:
- `get_token_usage_logs()` - Query logs with filters
- `get_token_usage_stats()` - Get usage statistics

```bash
psql $DATABASE_URL -f scripts/13-create-get-token-usage-logs-rpc.sql
```

---

## 🧪 Testing

Run the comprehensive test suite:

```bash
psql $DATABASE_URL -f scripts/14-test-token-usage-logs.sql
```

The test script will:
1. ✓ Verify log creation during token consumption
2. ✓ Test multiple consumptions
3. ✓ Test RPC query functions
4. ✓ Verify RLS policies
5. ✓ Test foreign key constraints
6. ✓ Test cleanup function
7. ✓ Test quota exceeded scenario

---

## 🔧 Backend API

Two new admin-only endpoints are added in `server/routes.ts`:

### GET `/api/admin/token-usage-logs`
Query logs with filters and pagination.

**Query Parameters:**
- `userId` (optional) - Filter by user ID
- `toolId` (optional) - Filter by tool ID
- `startDate` (optional) - Filter by start date (ISO format)
- `endDate` (optional) - Filter by end date (ISO format)
- `limit` (optional, default: 50) - Page size
- `offset` (optional, default: 0) - Page offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "user-uuid",
      "tool_id": "tool-uuid",
      "consumed": 1,
      "created_at": "2025-10-01T10:30:00Z",
      "username": "john_doe",
      "tool_name": "keyword-planner",
      "tool_title": "Keyword Planner"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1234
  }
}
```

### GET `/api/admin/token-usage-stats`
Get usage statistics.

**Query Parameters:**
- `userId` (optional) - Filter by user ID
- `startDate` (optional) - Filter by start date
- `endDate` (optional) - Filter by end date

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": {
      "total_requests": 10000,
      "total_tokens_consumed": 15000,
      "unique_users": 250,
      "unique_tools": 12
    },
    "top_users": [
      {
        "user_id": "uuid",
        "username": "john_doe",
        "request_count": 150,
        "tokens_consumed": 225
      }
    ],
    "top_tools": [
      {
        "tool_id": "uuid",
        "tool_name": "keyword-planner",
        "tool_title": "Keyword Planner",
        "request_count": 5000,
        "tokens_consumed": 7500
      }
    ]
  }
}
```

---

## 🎨 Frontend UI

New admin page: `/admin/token-logs`

**Features:**
- 📊 **Logs Tab**: Detailed log viewer with filters
  - Filter by user ID, tool ID, date range
  - Pagination (50 logs per page)
  - Export to CSV
- 📈 **Statistics Tab**: Usage analytics
  - Total requests & tokens consumed
  - Unique users & tools
  - Top 10 users by usage
  - Top 10 tools by usage

**Navigation:**
The page is protected by `ProtectedAdminRoute` - only admins can access.

---

## 🔒 Security (RLS Policies)

### token_usage_logs Table

1. **Regular users**: CANNOT read logs (blocked entirely)
2. **Service role**: Full access (for RPC functions)
3. **Admins**: Can SELECT all logs

### RPC Functions

Both `get_token_usage_logs()` and `get_token_usage_stats()` check:
```sql
SELECT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE user_id = auth.uid()::text
  AND role = 'admin'
)
```

If not admin, returns:
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Only admins can access token usage logs"
}
```

---

## 📦 Database Schema

### token_usage_logs
```sql
CREATE TABLE token_usage_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    tool_id uuid NOT NULL REFERENCES seo_tools(id) ON DELETE CASCADE,
    consumed integer NOT NULL DEFAULT 1 CHECK (consumed > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_token_logs_user_date ON token_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_token_logs_tool_date ON token_usage_logs(tool_id, created_at DESC);
CREATE INDEX idx_token_logs_created_at ON token_usage_logs(created_at);
CREATE INDEX idx_token_logs_user_tool ON token_usage_logs(user_id, tool_id, created_at DESC);
```

---

## 🔄 Migration Checklist

- [ ] **Step 1**: Backup database
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
  ```

- [ ] **Step 2**: Verify current branch
  ```bash
  git branch --show-current
  # Should be: feature/tracking-token-usage-log
  ```

- [ ] **Step 3**: Apply migrations in order
  ```bash
  psql $DATABASE_URL -f scripts/10-create-token-usage-logs.sql
  psql $DATABASE_URL -f scripts/11-update-consume-token-with-logging.sql
  psql $DATABASE_URL -f scripts/12-create-token-usage-cleanup.sql
  psql $DATABASE_URL -f scripts/13-create-get-token-usage-logs-rpc.sql
  ```

- [ ] **Step 4**: Run tests
  ```bash
  psql $DATABASE_URL -f scripts/14-test-token-usage-logs.sql
  ```

- [ ] **Step 5**: Verify scheduled job
  ```sql
  SELECT * FROM cron.job WHERE jobname = 'token-usage-logs-cleanup';
  ```

- [ ] **Step 6**: Update consume_token calls
  Find all calls to `consume_token()` and add `p_tool_id` parameter:
  ```bash
  grep -r "consume_token" server/ client/
  ```

- [ ] **Step 7**: Test API endpoints
  ```bash
  # As admin user
  curl -X GET "http://localhost:5000/api/admin/token-usage-logs?limit=10" \
    -H "Cookie: session=..."
  ```

- [ ] **Step 8**: Test UI
  - Navigate to `/admin/token-logs`
  - Verify logs display correctly
  - Test filters and pagination
  - Check statistics tab
  - Test CSV export

- [ ] **Step 9**: Monitor cleanup job
  ```sql
  -- Check job history after 24 hours
  SELECT * FROM cron.job_run_details
  WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'token-usage-logs-cleanup')
  ORDER BY start_time DESC
  LIMIT 5;
  ```

---

## 🚨 Breaking Changes

### consume_token() Function Signature Change

**Old:**
```sql
consume_token(p_user_id text, p_tokens_to_consume integer DEFAULT 1)
```

**New:**
```sql
consume_token(p_user_id text, p_tool_id uuid, p_tokens_to_consume integer DEFAULT 1)
```

**Action Required:**
Update all calls to include `p_tool_id`:
```typescript
// Before
await supabase.rpc('consume_token', {
  p_user_id: userId,
  p_tokens_to_consume: 1
});

// After
await supabase.rpc('consume_token', {
  p_user_id: userId,
  p_tool_id: toolId, // NEW REQUIRED PARAMETER
  p_tokens_to_consume: 1
});
```

---

## 📊 Monitoring

### Check Log Growth
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as log_count,
  SUM(consumed) as tokens_consumed
FROM token_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Verify Cleanup Job
```sql
-- Should show no logs older than 90 days
SELECT COUNT(*) as old_logs
FROM token_usage_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Check Disk Usage
```sql
SELECT
  pg_size_pretty(pg_total_relation_size('token_usage_logs')) as total_size,
  pg_size_pretty(pg_relation_size('token_usage_logs')) as table_size,
  pg_size_pretty(pg_indexes_size('token_usage_logs')) as indexes_size;
```

---

## 🐛 Troubleshooting

### Issue: Logs not being created
**Check:**
1. Verify migration 11 was applied correctly
2. Check if `consume_token()` is called with `p_tool_id`
3. Verify tool_id exists in `seo_tools` table

```sql
-- Debug query
SELECT * FROM pg_proc WHERE proname = 'consume_token';
```

### Issue: API returns UNAUTHORIZED
**Check:**
1. User is authenticated
2. User has `role = 'admin'` in profiles table
3. Session cookie is being sent

```sql
-- Verify admin status
SELECT user_id, username, role FROM profiles WHERE user_id = 'YOUR_USER_ID';
```

### Issue: Cleanup job not running
**Check:**
1. pg_cron extension is installed
2. Job is scheduled correctly

```sql
-- Check job status
SELECT * FROM cron.job WHERE jobname = 'token-usage-logs-cleanup';

-- Manually trigger cleanup
SELECT cleanup_token_usage_logs();
```

---

## 📚 Additional Resources

- Database migrations: `scripts/10-*.sql` through `scripts/14-*.sql`
- Backend API: `server/routes.ts` (lines ~1079-1139)
- Frontend UI: `client/src/pages/admin-token-logs.tsx`
- Test suite: `scripts/14-test-token-usage-logs.sql`

---

## ✅ Success Criteria

- [x] `token_usage_logs` table created with indexes
- [x] `consume_token()` updated to log usage
- [x] Cleanup job scheduled and running
- [x] Admin RPC functions working
- [x] Backend API endpoints functional
- [x] Frontend UI rendering correctly
- [x] RLS policies enforced
- [x] All tests passing
- [x] CSV export working
- [x] Statistics displaying accurately

---

**Generated**: 2025-10-01
**Branch**: `feature/tracking-token-usage-log`
**Status**: ✅ Ready for deployment

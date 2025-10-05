# How to Block Schema Access on Supabase Production

## 🎯 Objective

Block database schema introspection from `anon` and `authenticated` roles while maintaining RLS-protected data access.

## ⚠️ Why This Is Needed

By default, Supabase allows anyone with the `ANON_KEY` to:
- ✅ See table names
- ✅ See column names and types
- ✅ View database structure

While **data is protected by RLS**, schema visibility can:
- ❌ Reveal business logic
- ❌ Expose column names (potential injection points)
- ❌ Aid attackers in planning exploits

## 📝 Step-by-Step Instructions

### Step 1: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Login to your account
3. Select your project: `matkbwpzbilhavvgbafq`
4. Click **SQL Editor** in the left sidebar

### Step 2: Create New Query

1. Click **New Query** button
2. Name it: `Block Schema Access`

### Step 3: Copy and Paste Script

Copy the entire content from:
```
scripts/block-information-schema-supabase.sql
```

Or copy this:

```sql
-- BLOCK INFORMATION_SCHEMA ACCESS (Supabase Compatible)
DO $$
BEGIN
  -- Revoke information_schema access
  BEGIN
    EXECUTE 'REVOKE SELECT ON ALL TABLES IN SCHEMA information_schema FROM anon, authenticated';
    RAISE NOTICE '✅ Revoked SELECT on information_schema tables';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not revoke SELECT: %', SQLERRM;
  END;

  BEGIN
    EXECUTE 'REVOKE USAGE ON SCHEMA information_schema FROM anon, authenticated';
    RAISE NOTICE '✅ Revoked USAGE on information_schema';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not revoke USAGE: %', SQLERRM;
  END;
END $$;

-- Revoke pg_catalog access
DO $$
BEGIN
  BEGIN
    EXECUTE 'REVOKE SELECT ON ALL TABLES IN SCHEMA pg_catalog FROM anon, authenticated';
    RAISE NOTICE '✅ Revoked SELECT on pg_catalog tables';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not revoke pg_catalog SELECT: %', SQLERRM;
  END;

  BEGIN
    EXECUTE 'REVOKE USAGE ON SCHEMA pg_catalog FROM anon, authenticated';
    RAISE NOTICE '✅ Revoked USAGE on pg_catalog';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not revoke pg_catalog USAGE: %', SQLERRM;
  END;
END $$;

-- Create test view
CREATE OR REPLACE VIEW public.schema_access_test AS
SELECT
  current_user as current_role,
  session_user as session_role,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as visible_tables,
  NOW() as tested_at;

GRANT SELECT ON public.schema_access_test TO authenticated, anon;

-- Verify
DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '=== Schema Access Verification ===';
  SELECT * INTO test_result FROM public.schema_access_test;
  RAISE NOTICE 'Current role: %', test_result.current_role;
  RAISE NOTICE 'Visible tables: %', test_result.visible_tables;

  IF test_result.visible_tables = 0 THEN
    RAISE NOTICE '✅ SUCCESS: Schema is blocked!';
  ELSE
    RAISE WARNING '⚠️ Current user can see % tables', test_result.visible_tables;
  END IF;
END $$;
```

### Step 4: Run the Script

1. Click **RUN** button (bottom right)
2. Wait for execution (should take 1-2 seconds)
3. Check the **Results** panel for output

#### Expected Output:

```
✅ Revoked SELECT on information_schema tables
✅ Revoked USAGE on information_schema
✅ Revoked SELECT on pg_catalog tables
✅ Revoked USAGE on pg_catalog
=== Schema Access Verification ===
Current role: postgres
Visible tables: 10
⚠️ Current user can see 10 tables
```

**Note:** The verification runs as `postgres` user (admin), so it will see tables. This is expected.

### Step 5: Test from Client

Run the test script locally:

```bash
node scripts/test-schema-access.js
```

#### Expected Test Results:

```
🔍 Testing Schema Access with ANON_KEY...

Test 1: Accessing information_schema.tables
✅ BLOCKED: permission denied for schema information_schema

Test 2: Accessing pg_catalog.pg_tables
✅ BLOCKED: permission denied for schema pg_catalog

Test 3: Checking schema_access_test view
📊 Test Results:
  Current role: anon
  Session role: postgres
  Visible tables: 0
  ✅ SUCCESS: Schema is completely blocked!

Test 4: Accessing public tables (should work with RLS)
✅ SUCCESS: Can still access RLS-protected tables
  Found 3 tools

=============================================================
📋 SUMMARY:
  - Schema introspection should be blocked ✅
  - Public tables should still be accessible via RLS ✅
  - Data security is maintained by Row Level Security
=============================================================
```

## ✅ Verification Checklist

After running the script, verify:

- [ ] `information_schema.tables` is not accessible from client
- [ ] `pg_catalog.pg_tables` is not accessible from client
- [ ] `schema_access_test` view returns `visible_tables: 0` for anon users
- [ ] Public tables (like `seo_tools`) are still accessible via RLS
- [ ] Your application still functions normally

## 🔄 Rollback (If Needed)

If you need to restore schema access (for debugging):

```sql
-- WARNING: This will re-expose your database schema!
GRANT USAGE ON SCHEMA information_schema TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO authenticated;

-- Drop test view
DROP VIEW IF EXISTS public.schema_access_test;
```

## 🛡️ What This Does

### Blocks:
- ❌ Schema introspection from `anon` role (public API key)
- ❌ Schema introspection from `authenticated` role (logged-in users)
- ❌ Access to `information_schema` tables
- ❌ Access to `pg_catalog` tables

### Still Allows:
- ✅ RLS-protected data access to public tables
- ✅ User authentication and authorization
- ✅ All normal application functionality
- ✅ Admin access via `service_role` key (server-only)

## 📊 Security Impact

| Before | After |
|--------|-------|
| Schema visible to anyone with ANON_KEY | Schema hidden from public |
| Attackers can enumerate tables | Attackers get permission denied |
| Column names exposed | Column names hidden |
| Data protected by RLS | Data still protected by RLS |

## 🚨 Important Notes

1. **This does NOT break your application** - RLS still protects data
2. **Service role key** (server-side) can still access schema
3. **Postgres user** (you in dashboard) can still see everything
4. **This is defense in depth** - adds extra security layer

## 📝 Next Steps

After blocking schema access:

1. ✅ Run test script to verify
2. ✅ Test your application end-to-end
3. ✅ Monitor for any issues
4. ✅ Update security documentation
5. ⏭️ Consider implementing rate limiting
6. ⏭️ Set up security monitoring

## 🆘 Troubleshooting

### Issue: "Permission denied" errors in application

**Cause:** Script blocked too much access

**Fix:** Run rollback script, then re-apply with modifications

### Issue: Test shows `visible_tables > 0`

**Cause:** Script didn't execute fully or insufficient permissions

**Fix:**
1. Check Supabase logs for errors
2. Verify you ran script as project owner
3. Try running each section separately

### Issue: Can't access any tables

**Cause:** Accidentally revoked access to public schema

**Fix:**
```sql
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
```

## 📚 References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL GRANT/REVOKE](https://www.postgresql.org/docs/current/sql-grant.html)
- [Security Audit Report](./SECURITY_AUDIT_SUPABASE_KEYS.md)

---

**Last Updated:** 2025-10-06
**Status:** Ready for Production
**Risk Level:** Low (reversible, non-breaking change)

# Authentication Fix - Token Logs API

## 🐛 Problem

Token logs không hiển thị và trả về lỗi 401 Unauthorized:
```
Access denied. Admin privileges required.
Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

## 🔍 Root Cause

Các trang đang sử dụng `fetch()` trực tiếp thay vì sử dụng `apiRequest` từ `queryClient`, dẫn đến:
- ❌ Không có Authorization header (Bearer token)
- ❌ Request bị từ chối bởi `requireAdmin` middleware
- ❌ RPC functions không nhận được auth context

## ✅ Solution

Sửa đổi để sử dụng `apiRequest` từ `@/lib/queryClient` - function này tự động:
- ✅ Lấy access token từ Supabase session
- ✅ Thêm Authorization header vào mọi request `/api/`
- ✅ Retry với fresh token nếu gặp 401
- ✅ Đảm bảo auth context được truyền đến backend

---

## 📝 Changes

### 1. Dashboard Page

**File:** [client/src/pages/dashboard.tsx](client/src/pages/dashboard.tsx)

**Before:**
```typescript
// ❌ BAD: Fetch trực tiếp, không có auth header
async function fetchRecentTokenLogs() {
  const response = await fetch('/api/admin/token-usage-logs?limit=5', {
    credentials: 'include',
  });
  return response.json();
}

const { data: recentLogs } = useQuery({
  queryKey: ['recent-token-logs'],
  queryFn: fetchRecentTokenLogs,
  enabled: !!user && isAdmin(),
});
```

**After:**
```typescript
// ✅ GOOD: Sử dụng queryKey array, auth header tự động
const { data: recentLogs } = useQuery({
  queryKey: ['/api/admin/token-usage-logs?limit=5'],
  enabled: !!user && isAdmin(),
});
```

**Changes:**
- ❌ Removed: Custom `fetchRecentTokenLogs()` function
- ✅ Added: Direct queryKey array usage
- ✅ Benefit: Automatic auth header injection via `getQueryFn`

---

### 2. Admin Token Logs Page

**File:** [client/src/pages/admin-token-logs.tsx](client/src/pages/admin-token-logs.tsx)

**Before:**
```typescript
// ❌ BAD: Fetch trực tiếp
async function fetchTokenUsageLogs(params) {
  const response = await fetch(`/api/admin/token-usage-logs?${queryParams}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}

async function fetchTokenUsageStats(params) {
  const response = await fetch(`/api/admin/token-usage-stats?${queryParams}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}
```

**After:**
```typescript
// ✅ GOOD: Sử dụng apiRequest với auth
import { apiRequest } from "@/lib/queryClient";

async function fetchTokenUsageLogs(params) {
  const response = await apiRequest('GET', `/api/admin/token-usage-logs?${queryParams}`);
  return response.json();
}

async function fetchTokenUsageStats(params) {
  const response = await apiRequest('GET', `/api/admin/token-usage-stats?${queryParams}`);
  return response.json();
}
```

**Changes:**
- ✅ Added: `import { apiRequest } from "@/lib/queryClient"`
- ✅ Changed: `fetch()` → `apiRequest('GET', url)`
- ✅ Removed: Manual error handling (apiRequest throws automatically)
- ✅ Benefit: Auth header + retry logic

---

## 🔐 How Authentication Works

### Flow với `apiRequest`:

```
1. User makes request
   ↓
2. apiRequest() gets called
   ↓
3. getAccessToken() retrieves token from Supabase session
   ↓
4. Token added to Authorization header: "Bearer <token>"
   ↓
5. Request sent to backend with credentials
   ↓
6. Backend authMiddleware verifies token
   ↓
7. req.user populated with user info
   ↓
8. requireAdmin checks user.role === 'admin'
   ↓
9. Request reaches handler
   ↓
10. Handler calls Supabase RPC with service role
```

### Auth Header Format:
```http
GET /api/admin/token-usage-logs?limit=5 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Cookie: sb-access-token=...; sb-refresh-token=...
```

---

## 🧪 Testing

### Test Dashboard (Admin)
```bash
1. Login as admin
2. Go to /dashboard
3. Scroll to "Hoạt động gần đây"
4. Open DevTools Network tab
5. Verify request has Authorization header
6. Verify logs display correctly
```

### Test Admin Token Logs Page
```bash
1. Login as admin
2. Go to /admin/token-logs
3. Check both tabs: "Logs" and "Statistics"
4. Apply filters
5. Verify all requests have Authorization header
6. Verify data loads without 401 errors
```

### Test Member Access (Should Fail)
```bash
1. Login as member
2. Try to access /admin/token-logs
3. Should redirect or show "Access Denied"
4. Dashboard should NOT show "Hoạt động gần đây"
```

---

## 🔍 Debugging

### Check Auth Token:
```typescript
// In browser console
const { data: { session } } = await window.supabase.auth.getSession();
console.log('Token:', session?.access_token);
console.log('User:', session?.user);
```

### Check Request Headers:
```javascript
// In DevTools Network tab
1. Find API request
2. Click on request
3. Go to "Headers" tab
4. Look for "Authorization: Bearer ..."
```

### Common Issues:

**Issue: Still getting 401**
```
✓ Check: User is logged in
✓ Check: User role is 'admin'
✓ Check: Authorization header is present
✓ Check: Token is not expired
```

**Issue: Authorization header missing**
```
✓ Check: Using apiRequest or queryKey array
✓ Check: NOT using fetch() directly
✓ Check: URL includes '/api/'
```

---

## 📋 Files Modified

1. ✅ [client/src/pages/dashboard.tsx](client/src/pages/dashboard.tsx:65-70)
   - Removed custom fetch function
   - Use queryKey array for auto-auth

2. ✅ [client/src/pages/admin-token-logs.tsx](client/src/pages/admin-token-logs.tsx:15,66,80)
   - Import apiRequest
   - Replace fetch() with apiRequest()

---

## ✅ Verification Checklist

- [x] Dashboard loads recent logs (admin only)
- [x] Admin Token Logs page displays data
- [x] Statistics tab works
- [x] Filters work correctly
- [x] Pagination works
- [x] CSV export works
- [x] Authorization headers present in all requests
- [x] No 401 errors in console
- [x] Member users don't see admin features

---

## 🎯 Key Takeaway

**Always use `apiRequest` from `@/lib/queryClient` for API calls!**

❌ **Never do this:**
```typescript
const response = await fetch('/api/...', { credentials: 'include' });
```

✅ **Always do this:**
```typescript
const response = await apiRequest('GET', '/api/...');
// OR
const { data } = useQuery({ queryKey: ['/api/...'] });
```

---

**Fixed by:** Claude Code
**Date:** 2025-10-01
**Branch:** `feature/tracking-token-usage-log`
**Status:** ✅ Resolved

# Google Ads API Security Analysis

## Current Architecture Overview

### 1. Authentication Flow
```
Client (Browser)
  → apiRequest() with Supabase JWT token
    → Server (/api/keyword-planner, /api/search-intent)
      → authMiddleware validates JWT
        → google-ads.ts service
          → getAccessToken() using Service Account (SA_EMAIL, SA_PRIVATE_KEY)
            → Google Ads API
```

### 2. Current Security Status: ✅ SECURE

**Google Ads API credentials are ALREADY protected server-side:**

- **Service Account Credentials** (`SA_EMAIL`, `SA_PRIVATE_KEY`) are stored in server `.env` only
- **Access Token Generation** happens server-side via `getJwtClient().authorize()`
- **No Google credentials exposed** to client/browser
- **JWT Supabase token** is used only for user authentication, not Google API access

### 3. Token Types & Their Purposes

| Token Type | Storage | Purpose | Exposure Risk |
|------------|---------|---------|---------------|
| **Supabase JWT** | Client (localStorage) | User authentication | ⚠️ Visible in Network tab (EXPECTED) |
| **Google Ads Access Token** | Server memory (cached) | Google API calls | ✅ Never sent to client |
| **Service Account Key** | Server .env only | Generate Google tokens | ✅ Never exposed |

### 4. Analysis of Security Concerns

#### Question 1: "JWT lấy access token bị lộ ở trình duyệt?"

**Answer:**
- ✅ **Supabase JWT visible in Network tab is NORMAL and SECURE**
- This JWT is for **user authentication** only, not Google API access
- Google Access Token is generated **server-side** and never leaves the server
- Best practice: Keep using this pattern - it's OAuth 2.0 standard

#### Question 2: "Payload (query keyword, location, language) có cần được bảo vệ?"

**Answer:**
- ❌ **NO, these are user input data, not secrets**
- Keywords, location, language are **user preferences**, not credentials
- Visible payload in Network tab is **expected and harmless**
- What matters: API credentials stay server-side ✅

### 5. Security Validation Checklist

| Security Item | Status | Location |
|---------------|--------|----------|
| Service Account Email | ✅ Protected | `server/.env` SA_EMAIL |
| Service Account Private Key | ✅ Protected | `server/.env` SA_PRIVATE_KEY |
| Google Ads Customer ID | ✅ Protected | `server/.env` ADS_CUSTOMER_ID |
| Google Access Token | ✅ Server-only | In-memory cache |
| Supabase JWT | ⚠️ Client-side | Browser localStorage (NORMAL) |
| User Keywords | 🔵 Public | Request payload (NORMAL) |
| Language/Geo Params | 🔵 Public | Request payload (NORMAL) |

### 6. Current Implementation Review

#### File: `server/services/google-ads.ts`

```typescript
// ✅ SECURE: Service Account credentials from env
function getJwtClient(): JWT {
  if (!jwtClient) {
    const clientEmail = getRequiredEnv("SA_EMAIL");        // ✅ Server-side only
    const privateKeyRaw = getRequiredEnv("SA_PRIVATE_KEY"); // ✅ Server-side only
    const privateKey = privateKeyRaw.includes("\\n")
      ? privateKeyRaw.replace(/\\n/g, "\n")
      : privateKeyRaw;

    jwtClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [GOOGLE_ADS_SCOPE],  // ✅ Never exposed to client
    });
  }
  return jwtClient;
}

// ✅ SECURE: Access token generated server-side with 5-min refresh buffer
export async function getAccessToken(): Promise<{ access_token: string; expiry_date?: number }> {
  if (cachedAccessToken && !shouldRefreshToken(cachedAccessToken.expiry_date)) {
    return cachedAccessToken;  // ✅ Cached in server memory
  }

  const tokenResponse = await getJwtClient().authorize();
  if (!tokenResponse?.access_token) {
    throw new GoogleAdsApiError("Failed to obtain Google Ads access token");
  }

  cachedAccessToken = {
    access_token: tokenResponse.access_token,  // ✅ Never sent to client
    expiry_date: tokenResponse.expiry_date ?? undefined,
  };

  return cachedAccessToken;
}
```

#### File: `server/routes.ts`

```typescript
// ✅ SECURE: JWT authentication + RBAC
app.post("/api/keyword-planner", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // ✅ Validate user input (keywords, language, geoTargets)
    const validation = keywordPlannerRequestSchema.safeParse(req.body);

    // ✅ RBAC check
    const { hasAccess } = await assertToolAccessOrAdmin(req.user.id, "keyword-planner");
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ Call Google API server-side (no credentials exposed)
    const ideaResponse = await generateKeywordIdeas({
      keywords: normalizedKeywords,
      language,
      geoTargets,
      network,
      pageSize,
    });

    return res.json({
      keywords: normalizedKeywords,
      mode: "ideas",
      ...ideaResponse,  // ✅ Only results returned, no credentials
    });
  } catch (error) {
    // Error handling...
  }
});
```

### 7. What's Visible in Browser Network Tab (And Why It's OK)

#### Request to `/api/keyword-planner`:
```http
POST /api/keyword-planner HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ← Supabase JWT (NORMAL)
Content-Type: application/json

{
  "keywords": ["giày thể thao"],     ← User input (NORMAL)
  "language": "languageConstants/1014",  ← User preference (NORMAL)
  "geoTargets": ["geoTargetConstants/2392"],  ← User preference (NORMAL)
  "network": "GOOGLE_SEARCH"  ← User preference (NORMAL)
}
```

**Why this is secure:**
- ✅ Supabase JWT authenticates the **user**, not Google API
- ✅ User inputs are **not secrets** - they're search preferences
- ✅ Google Service Account credentials **never appear in request**
- ✅ Google Access Token is used **server-side only** in `google-ads.ts`

### 8. Security Best Practices (Current vs Required)

| Practice | Current Status | Required? |
|----------|---------------|-----------|
| API credentials server-side | ✅ Implemented | ✅ Yes |
| JWT for user auth | ✅ Implemented | ✅ Yes |
| RBAC permission checks | ✅ Implemented | ✅ Yes |
| Input validation | ✅ Implemented | ✅ Yes |
| Access token caching | ✅ Implemented | ✅ Yes |
| Token refresh logic | ✅ Implemented | ✅ Yes |
| Error handling | ✅ Implemented | ✅ Yes |
| Rate limiting | ❌ Not implemented | ⚠️ Recommended |
| Request logging | ✅ Implemented | ✅ Yes |

### 9. Recommendations

#### ✅ No Changes Needed for Google Ads API Security
The current implementation follows OAuth 2.0 and Google Cloud security best practices:
- Service Account flow is correct
- Credentials are properly isolated
- Token refresh is handled correctly

#### ⚠️ Optional Enhancements (Not Security-Critical):

1. **Rate Limiting** (Prevent API abuse):
```typescript
// Optional: Add rate limiting per user
import rateLimit from 'express-rate-limit';

const keywordPlannerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.post("/api/keyword-planner", keywordPlannerLimiter, authMiddleware, ...);
```

2. **Audit Logging** (Track API usage):
```typescript
// Log Google Ads API calls for monitoring
console.log(`[GoogleAds] User ${req.user.id} requested keywords: ${keywords.join(', ')}`);
```

3. **Cost Monitoring** (Google Ads API quotas):
```typescript
// Track API calls to avoid quota exhaustion
// Implement quota tracking in database
```

### 10. Comparison with Other APIs (N8N Webhooks)

| API Type | Before Fix | After Fix | Google Ads |
|----------|-----------|-----------|------------|
| **N8N Webhooks** | ❌ API key exposed client-side | ✅ Backend proxy | N/A |
| **Google Ads** | ✅ Already secure (Service Account) | ✅ No change needed | ✅ Already secure |

### 11. Conclusion

**VERDICT: Google Ads API implementation is SECURE ✅**

**Why no changes are needed:**

1. **Service Account credentials** are server-side only (SA_EMAIL, SA_PRIVATE_KEY)
2. **Access tokens** are generated and cached server-side, never sent to client
3. **Supabase JWT** in Network tab is for user authentication, not Google API access
4. **User input data** (keywords, location, language) are not secrets
5. **RBAC** prevents unauthorized access
6. **OAuth 2.0 flow** is implemented correctly

**What you see in Network tab:**
- Supabase JWT → **Expected and secure** (user authentication)
- Keywords/location/language → **Expected and harmless** (user preferences)
- Google credentials → **Never visible** (server-side only) ✅

**Final Answer:**
- ❌ **NO security fixes needed** for Google Ads API
- ✅ **Current implementation follows best practices**
- ✅ **Credentials are properly protected**
- ⚠️ Optional: Add rate limiting for API quota management

---

## References
- [Google Ads API Authentication](https://developers.google.com/google-ads/api/docs/oauth/service-accounts)
- [OAuth 2.0 Service Account Flow](https://cloud.google.com/iam/docs/service-accounts)
- [Supabase JWT Authentication](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

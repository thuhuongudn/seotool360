# URL Inspection & Request Indexing

## Overview
- The `Kiểm tra URL` tab inside `client/src/pages/gsc-insights.tsx` lets users inspect a page and trigger a Google indexing request without leaving the tool.
- All traffic flows through our backend (`server/routes.ts`) to keep service-account credentials off the client.
- A single Google service account powers both the URL Inspection API and the Indexing API.

## Environment & Credentials
Set the service-account secrets in `.env.local` (or the deployed environment):

```
SA_EMAIL=service-account@project.iam.gserviceaccount.com
SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> The key is stored on one line in `.env`; `server/services/google-search-console.ts` handles `\n` replacement. Make sure the service account has **Owner** access to the Search Console property and that the **Indexing API** is enabled in the Google Cloud project.

## Backend Implementation

### Service Layer (`server/services/google-search-console.ts`)
- Defines shared Google Auth helpers and request/response types.
- `DEFAULT_SCOPES`: `['https://www.googleapis.com/auth/webmasters', 'https://www.googleapis.com/auth/webmasters.readonly']`
- `INDEXING_SCOPES`: `['https://www.googleapis.com/auth/indexing']`
- `getAuthClient(scopes)` returns an authenticated `GoogleAuth` client using the service-account credentials.
- `inspectUrl({ inspectionUrl, siteUrl, languageCode })`
  - Fetches `https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`.
  - Returns the raw Google response (`inspectionResult` tree) or throws `GSCApiError` with status/details.
- `requestIndexing({ url, type })`
  - Uses `DEFAULT_SCOPES + INDEXING_SCOPES` to request an access token.
  - POSTs to `https://indexing.googleapis.com/v3/urlNotifications:publish`.
  - Returns the API payload (usually `urlNotificationMetadata`) or throws `GSCApiError`.
- `GSCApiError` standardises errors with `message`, `status`, and optional `details` for downstream handling.

### Routes (`server/routes.ts`)
Both routes are behind `authMiddleware` and reuse the `gsc-insights` RBAC check (`assertToolAccessOrAdmin`).

#### `POST /api/gsc/url-inspection`
Request body (validated with Zod):
```json
{
  "inspectionUrl": "https://example.com/page",
  "siteUrl": "https://example.com/",
  "languageCode": "vi" // optional, defaults to "vi"
}
```

Success response:
```json
{
  "success": true,
  "data": {
    "inspectionResult": { ...Google response... }
  }
}
```

Errors bubble up as:
```json
{
  "success": false,
  "error": "Access denied. Please add the Service Account to Google Search Console property.",
  "details": "PERMISSION_DENIED"
}
```

#### `POST /api/gsc/request-indexing`
Request body (Zod schema with default):
```json
{
  "url": "https://example.com/page",
  "type": "URL_UPDATED" // or "URL_DELETED"
}
```

Success response:
```json
{
  "success": true,
  "message": "Đã gửi yêu cầu lập chỉ mục tới Google.",
  "data": {
    "urlNotificationMetadata": {
      "url": "https://example.com/page",
      "latestUpdate": { ... }
    }
  }
}
```

Permission and quota errors are rewritten into friendly guidance before they reach the client, e.g. enabling the Indexing API or adding the service account as an owner. The raw Google message is still included as `rawError` for debugging.

## Frontend Implementation (`client/src/pages/gsc-insights.tsx`)
- The page manages two views: `performance` and `url-inspection`; the sidebar toggles between them.
- URL inspection state lives directly in the page component:
  - `inspectionUrl`, `inspectionLanguage`, `inspectionResult`, `indexingStatus`, `indexingError`, `lastInspectedUrl`, `lastInspectedSiteUrl`.
  - `useMutation` (React Query) handles both `/api/gsc/url-inspection` and `/api/gsc/request-indexing` calls.
  - `executeWithToken(toolId, 1, action)` gates requests behind the internal token system.
- Form flow:
  1. Validate and normalise the inspection URL & site URL (ensures trailing slash on property).
  2. POST to `/api/gsc/url-inspection` with the selected language (default `vi`).
  3. On success, render the entire `inspectionResult` block: verdict badge, index status metrics, canonical comparison (with copy buttons), mobile usability, and rich results data.
- Quick actions now appear directly beneath the inspected URL:
  - `Yêu cầu lập chỉ mục` → confirmation dialog → `/api/gsc/request-indexing`.
  - `Mở trong Search Console` → property + URL deep link.
  - A green alert shows the latest indexing status and stays visible until the user refreshes or inspects a new URL.
- Error handling:
  - `parseApiErrorMessage` attempts to unpack JSON payloads from the API to surface operator-friendly messages.
  - Toasts mirror the alert state for quick feedback.

## UX Notes
- Language selector exposes common ISO codes (`vi`, `en`, `en-US`). The value is sent straight to Google.
- The indexing success alert no longer auto-dismisses; users can confirm the request without scrolling.
- Canonical URLs can be copied via the ghost buttons next to each field.
- When the service account lacks permissions or the Indexing API is disabled, the user sees actionable guidance (in Vietnamese) instead of raw Google errors.

## Manual QA Checklist
1. Ensure `SA_EMAIL` / `SA_PRIVATE_KEY` point to a service account with Search Console access.
2. Enable *Indexing API* in Google Cloud for the same project.
3. In the UI:
   - Select a property, enter a full URL, and run **Kiểm tra URL**.
   - Confirm verdict, index status, canonical data, mobile + rich result sections render.
   - Click **Yêu cầu lập chỉ mục**, accept the dialog, and verify the success alert + toast.
   - Open **Mở trong Search Console** link to double-check the same URL in Google.
4. Validate error scenarios:
   - Invalid URL format (client-side validation).
   - Service account missing permissions (server returns 403 guidance).
   - API quota exceeded (server returns 429 guidance).
5. Monitor server logs for `[GSC][...]` entries when debugging production issues.

## cURL Reference
```
# Inspect URL
curl -X POST https://your-domain/api/gsc/url-inspection \
  -H "Authorization: Bearer <supabase_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
        "inspectionUrl": "https://example.com/page",
        "siteUrl": "https://example.com/",
        "languageCode": "vi"
      }'

# Request indexing
curl -X POST https://your-domain/api/gsc/request-indexing \
  -H "Authorization: Bearer <supabase_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
        "url": "https://example.com/page",
        "type": "URL_UPDATED"
      }'
```

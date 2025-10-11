# GSC Insights - Search Console Performance Analysis

## Overview

GSC Insights cung cấp phân tích hiệu suất nội dung từ Google Search Console, cho phép người dùng xem top queries và pages với dữ liệu clicks, impressions, CTR và position.

## Google Search Console API Endpoint

**Endpoint:** `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`

**Documentation:** https://developers.google.com/webmaster-tools/v1/searchanalytics/query

## Authentication

Sử dụng Service Account với credentials được lưu trong `.env.local`:
- `SA_EMAIL`: Service Account email
- `SA_PRIVATE_KEY`: Service Account private key (PEM format)

**⚠️ SECURITY:** Không bao giờ commit secrets vào repository. Luôn sử dụng biến môi trường.

### Cấp quyền cho Service Account

1. Vào Google Search Console
2. Settings → Users and permissions
3. Add user với email của Service Account
4. Cấp quyền ít nhất là "Full" hoặc "Restricted"

## API Parameters

### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (YYYY-MM-DD) | Yes | Start date of the requested date range |
| `endDate` | string (YYYY-MM-DD) | Yes | End date of the requested date range |
| `dimensions` | array | No | Zero or more dimensions to group results by. Valid values: `query`, `page`, `country`, `device`, `searchAppearance` |
| `dimensionFilterGroups` | array | No | Filter results by dimension values |
| `rowLimit` | integer | No | Maximum number of rows to return (max: 25,000, default: 1,000) |
| `startRow` | integer | No | Zero-based index of the first row to return (for pagination) |
| `searchType` | string | No | Type of search results. Valid values: `web` (default), `image`, `video`, `news` |
| `dataState` | string | No | How to handle data freshness. Values: `final` (default), `all` (includes non-final data) |

### Response Fields

Each row contains:
- `keys`: Array of dimension values (e.g., `["query text"]` or `["https://example.com/page"]`)
- `clicks`: Number of clicks
- `impressions`: Number of impressions
- `ctr`: Click-through rate (clicks / impressions)
- `position`: Average position in search results

Response metadata:
- `responseAggregationType`: How data was aggregated (`byPage` or `byProperty`)

## Feature Implementation

### A) Time Presets

Không có preset sẵn trong API. Tool cung cấp 3 preset:

| Preset | Description | Implementation |
|--------|-------------|----------------|
| `last7d` | Last 7 days | `endDate = today`, `startDate = today - 7 days` |
| `last28d` | Last 28 days | `endDate = today`, `startDate = today - 28 days` |
| `last90d` | Last 90 days | `endDate = today`, `startDate = today - 90 days` |

### B) Data Freshness

- Mặc định: chỉ lấy dữ liệu đã finalized (`dataState` không set hoặc `= "final"`)
- Tùy chọn: `dataState = "all"` để bao gồm dữ liệu chưa final
- Kiểm tra field `metadata.isDataGolden` hoặc field tương tự để xác định dữ liệu có hoàn chỉnh không
- **UI Warning:** Hiển thị badge "Fresh (may change)" nếu dữ liệu chưa final

### C) Two Analysis Modes

#### Mode 1: Queries for URL (Tab "CỤM TỪ TÌM KIẾM")

**Use case:** Phân tích keyword nào driving traffic đến một URL cụ thể

**Request:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-08",
  "dimensions": ["query"],
  "dimensionFilterGroups": [{
    "filters": [{
      "dimension": "page",
      "operator": "equals",
      "expression": "https://example.com/specific-page"
    }]
  }],
  "rowLimit": 25000,
  "startRow": 0,
  "searchType": "web"
}
```

**Output:** List of queries that led to clicks/impressions on the specified page

#### Mode 2: Pages for Keyword (Tab "TRANG")

**Use case:** Phân tích page nào ranking cho một keyword cụ thể

**Request:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-08",
  "dimensions": ["page"],
  "dimensionFilterGroups": [{
    "filters": [{
      "dimension": "query",
      "operator": "equals",
      "expression": "target keyword"
    }]
  }],
  "rowLimit": 25000,
  "startRow": 0,
  "searchType": "web"
}
```

**Output:** List of pages that appeared in search results for the specified query

### D) Pagination & Top 100 Limit

**Why Pagination is Needed:**

1. API giới hạn `rowLimit` tối đa 25,000 rows per request
2. Một property có thể có hàng triệu queries/pages
3. Để lấy hết dữ liệu, cần multiple requests với `startRow`

**Pagination Algorithm:**

```typescript
const allRows = [];
let startRow = 0;
const rowLimit = 25000;

do {
  const response = await fetchSearchAnalytics({
    ...params,
    rowLimit,
    startRow
  });

  allRows.push(...response.rows);
  startRow += rowLimit;

  // Stop if we got fewer rows than requested (last page)
} while (response.rows.length === rowLimit);
```

**Ranking & Slicing to Top 100:**

1. Hợp nhất tất cả rows từ các page kết quả
2. Sort theo tiêu chí:
   - Primary: `impressions DESC`
   - Secondary: `clicks DESC`
3. Slice top 100 rows để hiển thị UI
4. **Export CSV:** Xuất full data (không cắt 100)

### E) URL Canonicalization

**Important Notes:**

- **Trailing slash:** `https://example.com/page` ≠ `https://example.com/page/`
- **Protocol:** Phải match chính xác (`http://` vs `https://`)
- **Query params:** `?` có thể được GSC normalize
- **Fragment:** `#` thường bị ignore bởi GSC

**Recommendation:** Luôn dùng URL chính xác từ GSC UI để filter

### F) Aggregation Type

- `byPage`: Mỗi URL được tính riêng (phù hợp với URL-specific analysis)
- `byProperty`: Aggregate toàn bộ property (có thể ảnh hưởng CTR/position calculations)

**Rule:** Để khớp UI, đảm bảo group dimension giống với cách GSC UI đang hiển thị.

## UI/UX Design

### Input Controls

1. **Analysis Mode** (required)
   - Option A: "Queries for URL" → analyze keywords for a specific page
   - Option B: "Pages for Keyword" → analyze pages ranking for a keyword

2. **Target Value** (required)
   - Mode A: URL input (validate format)
   - Mode B: Keyword input (text)

3. **Time Range** (required)
   - Preset buttons: Last 7 days | Last 28 days | Last 90 days
   - Or custom date picker

4. **Filters** (optional)
   - Search Type: Web (default) | Image | Video | News
   - Country: All countries (default) | Specific country code
   - Device: All devices (default) | Desktop | Mobile | Tablet

5. **Data Freshness** (optional)
   - Checkbox: "Include non-final data" → set `dataState = "all"`

### Output Display

**Table Columns:**

| Column | Description | Format |
|--------|-------------|--------|
| Query/Page | Dimension value (query text or page URL) | Text (clickable link for pages) |
| Clicks | Total clicks | Number |
| Impressions | Total impressions | Number |
| CTR | Click-through rate | Percentage (2 decimals) |
| Position | Average position | Number (1 decimal) |

**Features:**
- Client-side pagination: 25/50/100 rows per page
- Sort by any column
- Export CSV button (full data, not limited to 100)
- Badge showing date range in table header
- Warning badge if data is non-final

## Error Handling

### Common Errors

| Error Code | Cause | Solution |
|------------|-------|----------|
| 403 Forbidden | Service Account không có quyền | Add SA email vào Search Console property |
| 404 Not Found | Site URL không tồn tại hoặc sai format | Kiểm tra lại site URL (phải match chính xác với GSC) |
| 400 Bad Request | Invalid parameters | Validate input trước khi gọi API |

### Logging

Log format (mask sensitive data):
```
[GSC Insights] Mode: queries-for-page
[GSC Insights] Site: https://exa*****.com
[GSC Insights] Range: 2025-01-01 to 2025-01-08
[GSC Insights] SA Email: ****@****.iam.gserviceaccount.com
[GSC Insights] Total rows fetched: 1,234
[GSC Insights] Top 100 returned to UI
```

## Testing Checklist

- [ ] SA_EMAIL và SA_PRIVATE_KEY có trong .env.local
- [ ] Service Account đã được cấp quyền trong GSC
- [ ] Preset time ranges (7/28/90 days) hoạt động đúng
- [ ] Pagination lấy đủ dữ liệu (test với property có >25k rows)
- [ ] Sort + slice top 100 chính xác
- [ ] Mode A (Queries for URL) hoạt động
- [ ] Mode B (Pages for Keyword) hoạt động
- [ ] URL canonicalization match với GSC UI
- [ ] Data freshness warning hiển thị khi dùng `dataState=all`
- [ ] Error handling cho 403/404
- [ ] Export CSV xuất full data
- [ ] Screenshots so sánh với GSC UI

## Example Requests

### Example 1: Get queries for a specific page (last 28 days)

```bash
POST https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fexample.com/searchAnalytics/query

{
  "startDate": "2024-12-15",
  "endDate": "2025-01-11",
  "dimensions": ["query"],
  "dimensionFilterGroups": [{
    "filters": [{
      "dimension": "page",
      "operator": "equals",
      "expression": "https://example.com/blog/seo-tips"
    }]
  }],
  "rowLimit": 25000,
  "searchType": "web"
}
```

### Example 2: Get pages for a specific keyword (last 7 days)

```bash
POST https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fexample.com/searchAnalytics/query

{
  "startDate": "2025-01-05",
  "endDate": "2025-01-11",
  "dimensions": ["page"],
  "dimensionFilterGroups": [{
    "filters": [{
      "dimension": "query",
      "operator": "equals",
      "expression": "seo tools"
    }]
  }],
  "rowLimit": 25000,
  "searchType": "web"
}
```

### Example 3: With multiple dimensions (advanced)

```bash
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-08",
  "dimensions": ["query", "device"],
  "rowLimit": 1000,
  "searchType": "web"
}
```

Response will have `keys: ["keyword", "MOBILE"]` or `keys: ["keyword", "DESKTOP"]`

## Notes

- Dữ liệu GSC thường có độ trễ 2-3 ngày
- Data freshness: `dataState=all` có thể thay đổi khi GSC finalize data
- Position là giá trị trung bình, không phải rank thực tế
- CTR = clicks / impressions (có thể 0 nếu không có clicks)

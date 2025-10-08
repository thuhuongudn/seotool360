# Hướng Dẫn Tích Hợp Google Search Console (GSC)

## Vị Trí Trong Roadmap

```
┌─────────────────────────────────────────────────────────┐
│ LEVEL 1: Foundation (NGAY BÂY GIỜ) - 30 phút           │
├─────────────────────────────────────────────────────────┤
│ ✅ Google Search Console (GSC)    ← ĐÂY                │
│ ✅ Google Analytics 4 (GA4)                             │
│ ✅ Meta Tags (React Helmet)                             │
│ ✅ robots.txt + sitemap.xml                             │
└─────────────────────────────────────────────────────────┘
```

**Mức độ quan trọng:** ⭐⭐⭐ **CRITICAL** - Ngang hàng GA4

**Lý do:**
- GSC giúp monitor indexing status REALTIME
- Phát hiện SEO issues sớm (crawl errors, coverage problems)
- Submit sitemap để Google crawl nhanh hơn
- Theo dõi search performance (impressions, clicks, CTR, position)

---

## Bước 1: Tạo Property trên GSC

### 1.1. Truy cập Google Search Console

🔗 https://search.google.com/search-console

### 1.2. Thêm Property

**Chọn loại property:**

#### Option A: Domain Property (Khuyến nghị)
- Xác minh toàn bộ domain (tất cả subdomain + http/https)
- Yêu cầu: DNS verification

**Ưu điểm:**
- Track cả www và non-www
- Track cả http và https
- Track tất cả subdomain (blog.domain.com, app.domain.com)

**Cách làm:**
1. Nhập domain: `yourdomain.com` (không có https://)
2. Click "Continue"
3. Copy TXT record
4. Thêm vào DNS provider (Cloudflare, Namecheap, GoDaddy...)
5. Verify

**Ví dụ DNS record:**
```
Type: TXT
Name: @
Value: google-site-verification=ABC123XYZ...
TTL: Auto
```

#### Option B: URL Prefix Property (Đơn giản hơn)
- Xác minh 1 URL cụ thể
- Yêu cầu: HTML tag hoặc file upload

**Ưu điểm:**
- Setup nhanh hơn
- Không cần access DNS

**Nhược điểm:**
- Phải verify riêng cho www/non-www, http/https

**Cách làm:**
1. Nhập URL: `https://yourdomain.com`
2. Chọn verification method

---

## Bước 2: Verify Ownership

### Method 1: HTML Tag (Khuyến nghị cho React SPA)

**Thêm meta tag vào `<head>`:**

```typescript
// client/src/components/SEOHead.tsx
import { Helmet } from 'react-helmet-async';

export function SEOHead() {
  return (
    <Helmet>
      {/* Google Search Console Verification */}
      <meta
        name="google-site-verification"
        content="YOUR_VERIFICATION_CODE"
      />

      {/* Other meta tags... */}
    </Helmet>
  );
}
```

**Hoặc thêm trực tiếp vào `index.html`:**

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
  <!-- Rest of head -->
</head>
```

### Method 2: HTML File Upload

1. Download file `google123abc.html` từ GSC
2. Upload vào `public/` folder
3. Deploy lên production
4. Verify URL: `https://yourdomain.com/google123abc.html`

### Method 3: Google Analytics (Nếu đã có GA4)

- Yêu cầu: GA4 tracking code đã có trên site
- Tự động verify nếu dùng cùng Google account

### Method 4: DNS Record (Cho Domain Property)

```
Type: TXT
Name: @
Value: google-site-verification=ABC123...
```

---

## Bước 3: Submit Sitemap

### 3.1. Tạo sitemap.xml

#### Option A: Static Sitemap (Đơn giản)

```xml
<!-- public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Home -->
  <url>
    <loc>https://yourdomain.com/</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Tools -->
  <url>
    <loc>https://yourdomain.com/content-optimizer</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://yourdomain.com/keyword-planner</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://yourdomain.com/search-intent</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Auth pages -->
  <url>
    <loc>https://yourdomain.com/login</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>

  <url>
    <loc>https://yourdomain.com/signup</loc>
    <lastmod>2025-01-15</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
```

#### Option B: Dynamic Sitemap (Tự động)

**Install package:**

```bash
npm install sitemap
```

**Tạo sitemap generator:**

```typescript
// scripts/generate-sitemap.ts
import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import { resolve } from 'path';

const DOMAIN = 'https://yourdomain.com';

const routes = [
  { url: '/', changefreq: 'weekly', priority: 1.0 },
  { url: '/content-optimizer', changefreq: 'monthly', priority: 0.8 },
  { url: '/keyword-planner', changefreq: 'monthly', priority: 0.8 },
  { url: '/search-intent', changefreq: 'monthly', priority: 0.8 },
  { url: '/pricing', changefreq: 'monthly', priority: 0.7 },
  { url: '/about', changefreq: 'yearly', priority: 0.5 },
  { url: '/login', changefreq: 'yearly', priority: 0.3 },
  { url: '/signup', changefreq: 'yearly', priority: 0.3 },
];

async function generateSitemap() {
  const sitemap = new SitemapStream({ hostname: DOMAIN });
  const writeStream = createWriteStream(resolve('./public/sitemap.xml'));

  sitemap.pipe(writeStream);

  routes.forEach(route => {
    sitemap.write({
      url: route.url,
      changefreq: route.changefreq as any,
      priority: route.priority,
      lastmod: new Date().toISOString()
    });
  });

  sitemap.end();

  await streamToPromise(sitemap);
  console.log('✅ Sitemap generated at public/sitemap.xml');
}

generateSitemap();
```

**Add to package.json:**

```json
{
  "scripts": {
    "generate:sitemap": "tsx scripts/generate-sitemap.ts",
    "build": "npm run generate:sitemap && vite build"
  }
}
```

### 3.2. Tạo robots.txt

```txt
# public/robots.txt
User-agent: *
Allow: /

# Disallow private pages
Disallow: /admin
Disallow: /dashboard
Disallow: /api/

# Crawl delay (optional)
Crawl-delay: 1

# Sitemap location
Sitemap: https://yourdomain.com/sitemap.xml
```

### 3.3. Submit Sitemap vào GSC

1. Google Search Console → **Sitemaps** (menu bên trái)
2. Nhập: `sitemap.xml`
3. Click **Submit**
4. Đợi 1-3 ngày để Google crawl

**Kết quả:**
```
Status: Success
Discovered URLs: 8
```

---

## Bước 4: Monitor Performance

### 4.1. Coverage Report

**Search Console → Coverage:**

- ✅ **Valid:** Pages được index thành công
- ⚠️ **Valid with warnings:** Indexed nhưng có vấn đề
- ❌ **Error:** Không thể index
- 🔄 **Excluded:** Bị exclude (duplicate, noindex, blocked by robots.txt)

**Common errors:**
- `404 Not Found` → Fix broken links
- `Server error (5xx)` → Check server uptime
- `Submitted URL marked 'noindex'` → Remove noindex tag
- `Redirect error` → Fix redirect chains

### 4.2. Performance Report

**Search Console → Performance:**

Metrics:
- **Total clicks:** Số lần user click vào site từ Google
- **Total impressions:** Số lần site hiển thị trên SERP
- **Average CTR:** Click-through rate (clicks/impressions)
- **Average position:** Vị trí trung bình trên SERP

**Filters:**
- Theo query (keyword)
- Theo page (URL)
- Theo country
- Theo device (mobile/desktop)
- Theo search appearance (web, image, video)

**Use cases:**
- Tìm keywords có impressions cao nhưng CTR thấp → Optimize title/meta description
- Tìm pages position 11-20 → Push lên top 10
- Theo dõi top keywords → Maintain rankings

### 4.3. URL Inspection

**Test individual URLs:**

1. Search Console → **URL Inspection**
2. Nhập URL: `https://yourdomain.com/content-optimizer`
3. Click **Test Live URL**

**Xem:**
- ✅ Coverage: Indexed hay chưa?
- 📱 Mobile usability: Mobile-friendly?
- 🔍 Rendered HTML: Google nhìn thấy gì?
- 📊 Page resources: JS/CSS load được không?

**Actions:**
- **Request indexing:** Yêu cầu Google crawl lại ngay
- **View crawled page:** Xem HTML Googlebot nhận được
- **More info:** Canonical URL, referring page, sitemap

---

## Bước 5: Fix Common Issues

### Issue 1: "Discovered - currently not indexed"

**Nguyên nhân:**
- Google biết page tồn tại nhưng chưa crawl
- Low priority trong crawl queue

**Fix:**
1. Submit URL via URL Inspection → Request indexing
2. Thêm internal links từ home/important pages
3. Improve page quality (content, speed)
4. Submit sitemap

### Issue 2: "Crawled - currently not indexed"

**Nguyên nhân:**
- Google đã crawl nhưng không cho vào index
- Content quality thấp hoặc duplicate

**Fix:**
1. Improve content quality (thêm nội dung unique)
2. Add more value (images, videos, examples)
3. Fix duplicate content issues
4. Check canonical tags

### Issue 3: "Page with redirect"

**Nguyên nhân:**
- URL trong sitemap bị redirect

**Fix:**
1. Update sitemap với final URL (sau redirect)
2. Xóa redirected URLs khỏi sitemap

### Issue 4: "Submitted URL blocked by robots.txt"

**Nguyên nhân:**
- robots.txt đang block URL

**Fix:**
```txt
# robots.txt - WRONG
User-agent: *
Disallow: /content-optimizer  # ❌ Blocking important page

# robots.txt - CORRECT
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
```

---

## Bước 6: Advanced Setup

### 6.1. Kết Nối GA4 với GSC

**Lợi ích:**
- Xem GSC data trong GA4
- Cross-reference search queries với behavior data

**Cách làm:**
1. GA4 → Admin → Search Console links
2. Click **Link**
3. Chọn GSC property
4. Confirm

### 6.2. Email Alerts

**Setup notifications:**
1. GSC → Settings (⚙️) → Users and permissions
2. Add email
3. Nhận alerts khi:
   - Coverage errors tăng đột biến
   - Manual actions (Google penalties)
   - Security issues

### 6.3. International Targeting

**Nếu có multiple languages:**

1. GSC → Settings → International Targeting
2. Set country: Vietnam
3. Set hreflang tags:

```html
<link rel="alternate" hreflang="vi" href="https://yourdomain.com/vi/" />
<link rel="alternate" hreflang="en" href="https://yourdomain.com/en/" />
<link rel="alternate" hreflang="x-default" href="https://yourdomain.com/" />
```

---

## Bước 7: Integration với Code

### 7.1. Tạo GSC Component

```typescript
// client/src/components/GSCVerification.tsx
import { Helmet } from 'react-helmet-async';

export function GSCVerification() {
  const GSC_CODE = import.meta.env.VITE_GSC_VERIFICATION_CODE;

  if (!GSC_CODE) return null;

  return (
    <Helmet>
      <meta name="google-site-verification" content={GSC_CODE} />
    </Helmet>
  );
}
```

### 7.2. Add to Root Layout

```typescript
// client/src/App.tsx
import { GSCVerification } from '@/components/GSCVerification';

function App() {
  return (
    <>
      <GSCVerification />
      {/* Rest of app */}
    </>
  );
}
```

### 7.3. Environment Variables

```bash
# .env
VITE_GSC_VERIFICATION_CODE=your_verification_code_here
```

```bash
# Heroku
heroku config:set VITE_GSC_VERIFICATION_CODE=your_code -a your-app
```

---

## Timeline & Checklist

### Ngày 1: Setup (30 phút)
- [ ] Tạo GSC property
- [ ] Verify ownership (HTML tag)
- [ ] Tạo sitemap.xml
- [ ] Tạo robots.txt
- [ ] Deploy lên production

### Ngày 2: Submit (10 phút)
- [ ] Submit sitemap vào GSC
- [ ] Request indexing cho top 5 pages

### Tuần 1-2: Monitor
- [ ] Check Coverage report hàng ngày
- [ ] Fix errors nếu có
- [ ] Verify sitemap status

### Hàng tháng:
- [ ] Review Performance report
- [ ] Identify optimization opportunities
- [ ] Update sitemap nếu có pages mới

---

## So Sánh: GSC vs GA4

| Feature | Google Search Console | Google Analytics 4 |
|---------|----------------------|-------------------|
| **Focus** | Search performance | User behavior |
| **Data** | SERP data (impressions, clicks, position) | Traffic, conversions, events |
| **Keywords** | ✅ Show search queries | ❌ Không có (GA4 ẩn keywords) |
| **Indexing** | ✅ Coverage, crawl errors | ❌ Không có |
| **Social traffic** | ❌ | ✅ |
| **Conversions** | ❌ | ✅ |
| **Real-time** | ❌ (delay 1-2 ngày) | ✅ |

**Kết luận:** Cần cả GSC và GA4 - bổ sung cho nhau!

---

## Tools Hỗ Trợ

### 1. GSC API (Tự động hóa)

```bash
npm install googleapis
```

```typescript
// scripts/fetch-gsc-data.ts
import { google } from 'googleapis';

const webmasters = google.webmasters('v3');

async function fetchSearchAnalytics() {
  const response = await webmasters.searchanalytics.query({
    siteUrl: 'https://yourdomain.com',
    requestBody: {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      dimensions: ['query', 'page'],
      rowLimit: 100
    }
  });

  console.log(response.data.rows);
}
```

### 2. Third-party Tools

- **Screaming Frog:** Crawl site như Googlebot
- **Sitebulb:** Visual sitemap + technical SEO audit
- **Ahrefs/SEMrush:** Keyword research + rank tracking

---

## Kết Luận

**GSC Setup Priority:** ⭐⭐⭐ **BẮT BUỘC** - Level 1

**Timing:**
- Setup: 30 phút
- First data: 2-3 ngày
- Full insights: 2-4 tuần

**Impact:**
- Phát hiện sớm indexing issues
- Optimize dựa trên real search data
- Monitor SEO health 24/7

**Next Steps:**
1. Setup GSC ngay hôm nay
2. Sau 1 tuần → Setup Prerender.io
3. Monitor GSC weekly để track progress

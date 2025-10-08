# Hướng Dẫn Triển Khai Prerender.io cho N8nToolkit

## Tổng Quan
Prerender.io là dịch vụ dynamic rendering - phục vụ HTML đã render sẵn cho search engine bots, trong khi users vẫn nhận React SPA.

## Bước 1: Đăng Ký Prerender.io

1. Truy cập: https://prerender.io/
2. Sign up free account (250 pages/tháng)
3. Lấy **Prerender Token** từ dashboard

## Bước 2: Cài Đặt Middleware

### Option A: Sử dụng Cloudflare Worker (Không cần server)

**Ưu điểm:**
- Không cần backend server
- Deploy nhanh
- Free tier Cloudflare

**Cách làm:**

1. Tạo file `cloudflare-worker.js`:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const userAgent = request.headers.get('user-agent') || ''

  // Danh sách bot cần pre-render
  const botAgents = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp'
  ]

  const isBot = botAgents.some(bot => userAgent.toLowerCase().includes(bot))

  if (isBot) {
    // Forward to Prerender.io
    const prerenderUrl = `https://service.prerender.io/${request.url}`
    const prerenderRequest = new Request(prerenderUrl, {
      headers: {
        'X-Prerender-Token': 'YOUR_PRERENDER_TOKEN'
      }
    })
    return fetch(prerenderRequest)
  }

  // Serve normal React app for users
  return fetch(request)
}
```

2. Deploy lên Cloudflare Workers:
   - Dashboard → Workers → Create Worker
   - Paste code trên
   - Add environment variable `PRERENDER_TOKEN`
   - Deploy

### Option B: Node.js Middleware (Nếu có backend)

1. Install package:

```bash
npm install prerender-node
```

2. Thêm vào Express server:

```javascript
// server/index.js
import express from 'express';
import prerender from 'prerender-node';

const app = express();

// Add prerender middleware BEFORE static files
app.use(prerender
  .set('prerenderToken', process.env.PRERENDER_TOKEN)
  .set('protocol', 'https')
);

// Serve static files
app.use(express.static('dist'));

app.listen(3000);
```

3. Set environment variable:

```bash
# .env
PRERENDER_TOKEN=your_token_here
```

### Option C: Vite Plugin (Development)

```bash
npm install vite-plugin-prerender --save-dev
```

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prerender from 'vite-plugin-prerender'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    prerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: [
        '/',
        '/content-optimizer',
        '/keyword-planner',
        '/search-intent'
      ],
    })
  ]
})
```

## Bước 3: Cấu Hình Cache (Tùy chọn)

Thêm HTTP headers để cache pre-rendered content:

```javascript
// Trong Cloudflare Worker hoặc server
response.headers.set('Cache-Control', 'public, max-age=86400') // 24 giờ
```

## Bước 4: Test

### 1. Test với curl:

```bash
# Test như Googlebot
curl -A "Googlebot" https://yourdomain.com

# Nên thấy full HTML content, không phải chỉ <div id="root"></div>
```

### 2. Test với Chrome DevTools:

1. Mở Chrome DevTools
2. Network → User Agent → Googlebot
3. Reload page
4. Xem HTML response

### 3. Test với Prerender.io Dashboard:

1. Login Prerender.io
2. Recache → Enter URL
3. View cached version

## Bước 5: Monitor

### Prerender.io Dashboard:
- Cache hits/misses
- Pages rendered
- Quota usage

### Google Search Console:
- URL Inspection Tool
- View "Crawled as Googlebot"
- Check rendered HTML

## Bước 6: Tối Ưu

### 1. Whitelist/Blacklist URLs:

```javascript
// Cloudflare Worker
const shouldPrerender = (url) => {
  // Không prerender admin pages
  if (url.includes('/admin')) return false

  // Không prerender API calls
  if (url.includes('/api/')) return false

  return true
}
```

### 2. Custom Cache TTL:

```javascript
// Set cache time khác nhau cho từng page
const getCacheTTL = (url) => {
  if (url === '/') return 3600 // Home: 1 giờ
  if (url.includes('/blog/')) return 86400 // Blog: 24 giờ
  return 7200 // Default: 2 giờ
}
```

## Giá Chi Tiết

| Plan | Pages/tháng | Giá |
|------|-------------|-----|
| Free | 250 | $0 |
| Starter | 10,000 | $25 |
| Business | 100,000 | $200 |
| Enterprise | Unlimited | Custom |

## Lưu Ý Quan Trọng

⚠️ **Prerender.io không thay thế việc setup meta tags đúng!**
- Vẫn phải có React Helmet
- Vẫn phải có Open Graph tags
- Prerender chỉ giúp bot crawl nhanh hơn

✅ **Best Practices:**
- Chỉ prerender cho bots (không cache cho users)
- Set Cache-Control headers đúng
- Monitor quota usage
- Whitelist chỉ public pages

## Troubleshooting

### Vấn đề 1: Prerender không hoạt động
**Giải pháp:**
- Check User-Agent detection logic
- Verify Prerender Token
- Check Cloudflare cache settings

### Vấn đề 2: Social share vẫn không hiển thị
**Giải pháp:**
- Clear Facebook debugger: https://developers.facebook.com/tools/debug/
- Clear Twitter card validator: https://cards-dev.twitter.com/validator
- Check Open Graph tags trong pre-rendered HTML

### Vấn đề 3: Vượt quota
**Giải pháp:**
- Tăng cache TTL
- Whitelist chỉ SEO-critical pages
- Upgrade plan

## Kết Luận

**Timeline:**
- Setup: 2-4 giờ
- Testing: 1 giờ
- Monitor: 15 phút/tuần

**Impact:**
- SEO score: +30-40 điểm
- Crawl rate: Tăng 3-5x
- Social share: Hiển thị đúng 100%

**Chi phí:**
- Free tier đủ cho <10,000 pages/tháng

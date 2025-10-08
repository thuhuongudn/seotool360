# API Key Security Migration Guide

## 🚨 Vấn đề bảo mật

Trước đây, tất cả API keys được lưu trữ ở client-side (browser) với prefix `VITE_*`, dẫn đến:

- ✗ API keys bị lộ qua DevTools Network tab
- ✗ Keys có thể bị đánh cắp qua JavaScript injection
- ✗ Không kiểm soát được rate limiting
- ✗ Rủi ro bị abuse và tốn chi phí

## ✅ Giải pháp

Đã implement **Backend Proxy Layer** để bảo vệ API keys:

```
Client (Browser) → Backend API Proxy → External APIs
                   (Chứa API keys)
```

## 📋 Các thay đổi

### 1. Backend Proxy Endpoints

Đã tạo các secure endpoints trong `server/routes/api-proxy.ts`:

- `POST /api/proxy/serper/search` - Google Search (Serper)
- `POST /api/proxy/serper/images` - Google Images (Serper)
- `POST /api/proxy/openai/completions` - OpenAI/OpenRouter
- `POST /api/proxy/firecrawl/scrape` - Firecrawl scraping
- `POST /api/proxy/gemini/generate-image` - Gemini Image
- `POST /api/proxy/unsplash/search` - Unsplash images

### 2. Client-side Changes

**Before (Unsafe):**
```typescript
const apiKey = import.meta.env.VITE_SERPER_API_KEY;
fetch('https://google.serper.dev/search', {
  headers: { 'X-API-KEY': apiKey } // ⚠️ Key exposed in browser
})
```

**After (Secure):**
```typescript
import { serperSearch } from '@/lib/secure-api-client';
const data = await serperSearch({ q: keyword }); // ✅ Key hidden on server
```

### 3. Environment Variables Migration

#### Trước (Client-side - **KHÔNG AN TOÀN**):
```bash
VITE_SERPER_API_KEY=your_key_here
VITE_OPENAI_API_KEY=your_key_here
VITE_FIRECRAWL_API_KEY=your_key_here
VITE_GEMINI_2_5_FLASH_IMG=your_key_here
VITE_UNSPLASH_ACCESS_KEY=your_key_here
```

#### Sau (Server-side - **AN TOÀN**):
```bash
# Server-only keys (NEVER exposed to browser)
SERPER_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
FIRECRAWL_API_KEY=your_key_here
GEMINI_2_5_FLASH_IMG=your_key_here
UNSPLASH_ACCESS_KEY=your_key_here
```

#### Giữ nguyên (Client-side - Safe):
```bash
# These are designed to be public
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_TINYMCE_KEY=your_tinymce_key
```

## 🔧 Migration Steps

### Bước 1: Update `.env.local`

1. Mở file `.env.local`
2. **Di chuyển** các keys từ `VITE_*` sang server-side:

```bash
# XÓA những dòng này (hoặc comment out):
# VITE_SERPER_API_KEY=...
# VITE_OPENAI_API_KEY=...
# VITE_FIRECRAWL_API_KEY=...
# VITE_GEMINI_2_5_FLASH_IMG=...
# VITE_UNSPLASH_ACCESS_KEY=...

# THÊM những dòng này:
SERPER_API_KEY=<your_serper_key>
OPENAI_API_KEY=<your_openai_key>
FIRECRAWL_API_KEY=<your_firecrawl_key>
GEMINI_2_5_FLASH_IMG=<your_gemini_key>
UNSPLASH_ACCESS_KEY=<your_unsplash_key>

# Optional
APP_URL=http://localhost:5000
```

### Bước 2: Restart Server

```bash
npm run dev
```

### Bước 3: Verify

1. Mở DevTools → Network tab
2. Thực hiện một action (ví dụ: click "Mở khóa thông tin")
3. Check request headers - **KHÔNG** còn thấy API keys!
4. Request sẽ gọi đến `/api/proxy/*` thay vì trực tiếp external APIs

## 🔒 Bảo mật được cải thiện

### Trước:
```
Browser DevTools → Network Tab → Request Headers
  ✗ X-API-KEY: sk-xxxxxxxxxxxxx (VISIBLE!)
  ✗ Authorization: Bearer sk-yyyyyyyyy (VISIBLE!)
```

### Sau:
```
Browser DevTools → Network Tab → Request Headers
  ✓ Authorization: Bearer <supabase_jwt_token>
  ✓ Content-Type: application/json
  ✗ NO API KEYS VISIBLE!
```

## 📊 Lợi ích

1. **Bảo mật**: API keys hoàn toàn ẩn khỏi client
2. **Kiểm soát**: Server xác thực user trước khi gọi external APIs
3. **Rate Limiting**: Dễ dàng implement throttling
4. **Cost Control**: Tracking và limiting usage chính xác
5. **Monitoring**: Log tất cả API calls để audit
6. **Key Rotation**: Dễ dàng thay đổi keys mà không cần deploy client

## ⚠️ Important Notes

### Keys NÊN để server-side:
- ✅ `SERPER_API_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `FIRECRAWL_API_KEY`
- ✅ `GEMINI_2_5_FLASH_IMG`
- ✅ `UNSPLASH_ACCESS_KEY`
- ✅ Bất kỳ API key nào có thể bị charge tiền

### Keys CÓ THỂ để client-side:
- ✅ `VITE_SUPABASE_URL` - Public URL, không phải secret
- ✅ `VITE_SUPABASE_ANON_KEY` - Public key, được thiết kế cho client
- ✅ `VITE_TINYMCE_KEY` - TinyMCE sử dụng domain whitelisting

## 🧪 Testing Checklist

- [ ] Competitor Data: "Mở khóa thông tin" button
- [ ] Tone of Voice: "Phân tích Tone of Voice" button
- [ ] Firecrawl: Crawl page structure từ competitor results
- [ ] AI Image: Generate image với Gemini
- [ ] Unsplash: Search images
- [ ] Readability Optimizer: "Tối ưu hóa" button

All functions should work without errors và **NO API keys visible** trong Network tab!

## 🆘 Troubleshooting

### Lỗi: "Server configuration error: X_API_KEY not configured"

**Nguyên nhân**: API key chưa được set trong server environment

**Giải pháp**:
1. Check file `.env.local` có đúng tên biến không (không có `VITE_` prefix)
2. Restart server: `npm run dev`
3. Verify keys trong server logs khi khởi động

### Lỗi: "Authentication required"

**Nguyên nhân**: Supabase authentication token không hợp lệ

**Giải pháp**:
1. Logout và login lại
2. Check Supabase session trong DevTools → Application → Local Storage
3. Verify `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` đúng

### Lỗi 401/403 từ proxy endpoint

**Nguyên nhân**: User chưa đăng nhập hoặc không có quyền

**Giải pháp**:
1. Ensure user đã đăng nhập
2. Check user có token credits không
3. Verify user có quyền access tool "content-optimizer"

## 📚 Related Files

- `server/routes/api-proxy.ts` - Backend proxy implementation
- `client/src/lib/secure-api-client.ts` - Client helper functions
- `client/src/pages/content-optimizer.tsx` - Updated to use secure client
- `.env.example` - Template với server-side keys

## 🎯 Next Steps

1. ✅ Deploy to production với server-side keys
2. ✅ Update production `.env` variables
3. ✅ Monitor server logs for API usage
4. ⏳ Consider adding rate limiting middleware
5. ⏳ Add caching layer để giảm API costs
6. ⏳ Implement request queuing cho high traffic

---

**Security Status**: ✅ **SECURED** - API keys are now protected from client-side exposure.

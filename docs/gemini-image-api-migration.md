# Gemini Image API - OpenRouter Integration

## Tóm tắt

Function "Tạo ảnh AI" (`handleGenerateAiImage`) trong `content-optimizer.tsx` sử dụng **OpenRouter** để tạo ảnh với **Gemini 2.5 Flash Image** (stable production version).

## Thông tin API

- **Provider**: OpenRouter (Universal API Gateway)
- **Model**: `google/gemini-2.5-flash-image` (stable production version)
- **API Key**: `GEMINI_2_5_FLASH_IMG` (OpenRouter API key)
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`

## Tại sao dùng OpenRouter?

### ✅ Ưu điểm
1. **Stable & Reliable**: Không bị rate limit như Gemini free tier
2. **Universal API Key**: 1 key cho nhiều AI models (Gemini, GPT-4, Claude, v.v.)
3. **Production Ready**: Phù hợp với môi trường production (Heroku config vars)
4. **No Complex Setup**: Không cần Google Cloud project hay quota management
5. **Consistent Response Format**: Unified format cho tất cả models

### ❌ Nhược điểm
- Chi phí cao hơn một chút so với direct Gemini API (nếu có paid tier)

## Cấu hình

### Environment Variables

File `.env.local`:
```bash
# OpenRouter API key for Gemini 2.5 Flash Image
GEMINI_2_5_FLASH_IMG=sk-or-v1-...
```

### Heroku Config Vars

```bash
heroku config:set GEMINI_2_5_FLASH_IMG=sk-or-v1-...
```

## Chi tiết kỹ thuật

### Backend Implementation

File: [server/routes/api-proxy.ts](../server/routes/api-proxy.ts:344-402)

```typescript
app.post("/api/proxy/gemini/generate-image", authMiddleware, async (req, res) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GEMINI_IMAGE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image', // Stable version
      messages: [{ role: 'user', content: prompt }]
    })
  });
});
```

### Frontend Implementation

File: [client/src/pages/content-optimizer.tsx](../client/src/pages/content-optimizer.tsx:409-411)

```typescript
// Handle AI Image generation with Gemini 2.5 Flash Image via OpenRouter
// Model: google/gemini-2.5-flash-image (stable production version)
const handleGenerateAiImage = async () => {
  const data = await geminiGenerateImage({ prompt: aiImagePrompt.trim() });
  // Process response...
};
```

### Request Format

```typescript
{
  model: 'google/gemini-2.5-flash-image',
  messages: [
    {
      role: 'user',
      content: 'A photorealistic Vietnamese street food vendor...'
    }
  ]
}
```

### Response Format

```typescript
{
  choices: [{
    message: {
      images: [{
        image_url: {
          url: 'data:image/png;base64,iVBORw0KGgo...'
        }
      }]
    }
  }]
}
```

## Model Version Change

### Trước đây
```typescript
model: 'google/gemini-2.5-flash-image-preview'  // Preview version
```

### Bây giờ
```typescript
model: 'google/gemini-2.5-flash-image'  // Stable production version
```

**Lý do thay đổi:**
- Preview version có thể unstable
- Production version đã GA (Generally Available) từ October 2025
- Consistent với production requirements

## Testing Checklist

- [ ] Kiểm tra `GEMINI_2_5_FLASH_IMG` có trong `.env.local`
- [ ] Test tạo ảnh với prompt đơn giản:
  - "A red rose"
  - "A photorealistic Vietnamese street food vendor at golden hour"
- [ ] Xác nhận ảnh được generate và hiển thị đúng
- [ ] Kiểm tra console không có error
- [ ] Test download ảnh hoạt động
- [ ] Verify token consumption (1 token/image)
- [ ] Test trên Heroku với config vars

## Troubleshooting

### Lỗi: "GEMINI_IMAGE_KEY not configured"
- **Nguyên nhân**: Thiếu `GEMINI_2_5_FLASH_IMG` trong `.env.local` hoặc Heroku config
- **Giải pháp**:
  ```bash
  # Local
  echo "GEMINI_2_5_FLASH_IMG=sk-or-v1-..." >> .env.local

  # Heroku
  heroku config:set GEMINI_2_5_FLASH_IMG=sk-or-v1-...
  ```

### Lỗi 401: "Unauthorized"
- **Nguyên nhân**: API key không hợp lệ hoặc hết hạn
- **Giải pháp**: Kiểm tra và renew API key tại [OpenRouter Dashboard](https://openrouter.ai/keys)

### Lỗi 429: "Too Many Requests"
- **Nguyên nhân**: Vượt quá rate limit (hiếm khi xảy ra với paid tier)
- **Giải pháp**: Upgrade OpenRouter tier hoặc implement rate limiting ở client

### Image không hiển thị
- **Nguyên nhân**: Response format không đúng
- **Giải pháp**: Kiểm tra console log, verify base64 data URL

## So sánh với Direct Gemini API

| Feature | OpenRouter | Gemini Direct API |
|---------|-----------|-------------------|
| Rate Limit | Cao (paid tier) | Thấp (5 RPM free) |
| API Key Setup | Đơn giản | Phức tạp (Google Cloud) |
| Heroku Deploy | ✅ Dễ (config vars) | ❌ Khó (nhiều vars) |
| Cost | Cao hơn ~20% | Thấp hơn (nếu paid) |
| Stability | ✅ Rất ổn định | ⚠️ Phụ thuộc quota |
| Model Support | Universal (multi-model) | Chỉ Gemini |
| Production Ready | ✅ Yes | ⚠️ Depends on tier |

## Khuyến nghị

### Production Setup
```bash
# Recommended: Use OpenRouter with paid tier
GEMINI_2_5_FLASH_IMG=sk-or-v1-...

# Model: google/gemini-2.5-flash-image (stable)
```

### Cost Optimization
- Monitor usage qua [OpenRouter Dashboard](https://openrouter.ai/usage)
- Set up budget alerts
- Consider caching for repeated prompts

### Security
- ✅ API key được bảo vệ ở backend (không expose ra client)
- ✅ Authentication required via `authMiddleware`
- ✅ Request validation với prompt type checking

## API Documentation References

- [OpenRouter Docs](https://openrouter.ai/docs)
- [OpenRouter Models](https://openrouter.ai/models/google/gemini-2.5-flash-image)
- [Gemini 2.5 Flash Image Announcement](https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/)
- [Gemini Image Generation Guide](https://ai.google.dev/gemini-api/docs/image-generation)

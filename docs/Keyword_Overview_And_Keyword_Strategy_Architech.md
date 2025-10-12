# KEYWORD OVERVIEW - Kiến trúc & Phương án Triển khai

## 📊 I. TỔNG QUAN KIẾN TRÚC

### Sơ đồ Data Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    KEYWORD OVERVIEW PAGE                     │
│                                                              │
│  Input: Keyword Seed (e.g., "optibac tím")                 │
│         + Location (Vietnam)                                 │
│         + Language (Vietnamese)                              │
│         + Date Range (Last 7/28/90 days)                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
┌─────────────┐        ┌─────────────────┐
│  Keyword    │        │   GSC Check     │
│  Status     │        │   (parallel)    │
│  Detection  │        │                 │
└──────┬──────┘        └────────┬────────┘
       │                        │
       │ Is New? ────────Yes────┤
       │     │                  │
       │     No                 │
       │     │                  │
       ▼     ▼                  ▼
   ┌─────────────────────────────────┐
   │    PARALLEL API CALLS           │
   │  ┌─────────────────────────┐   │
   │  │ 1. Google Ads API       │   │
   │  │    - KeywordIdeas       │   │
   │  │    - Historical Metrics │   │
   │  └─────────────────────────┘   │
   │  ┌─────────────────────────┐   │
   │  │ 2. GSC API              │   │
   │  │    - Queries for 30d    │   │
   │  │    - Pages for keyword  │   │
   │  └─────────────────────────┘   │
   │  ┌─────────────────────────┐   │
   │  │ 3. Serper.dev API       │   │
   │  │    - SERP Top 10        │   │
   │  └─────────────────────────┘   │
   └─────────────────────────────────┘
                   │
                   ▼
   ┌─────────────────────────────────┐
   │     DATA AGGREGATION            │
   │     & CALCULATION               │
   └─────────────────────────────────┘
                   │
                   ▼
   ┌─────────────────────────────────┐
   │     RENDER SECTIONS             │
   │  - Volume & Metrics             │
   │  - Trend Chart                  │
   │  - Keyword Ideas                │
   │  - GSC Performance              │
   │  - SERP Analysis                │
   │  - Strategy Recommendations     │
   └─────────────────────────────────┘
```

---

## 🎯 II. CÁC API ENDPOINTS VÀ PAYLOAD

### 1. Google Ads API - KeywordPlanIdeaService

#### Endpoint 1.1: Generate Keyword Ideas
```
POST https://googleads.googleapis.com/v17/customers/{customer_id}:generateKeywordIdeas
```

**Request Payload:**
```json
{
  "keywordPlanNetwork": "GOOGLE_SEARCH_AND_PARTNERS",
  "keywordSeed": {
    "keywords": ["optibac tím"]
  },
  "geoTargetConstants": ["geoTargetConstants/2704"],
  "language": "languageConstants/1040",
  "includeAdultKeywords": false,
  "pageSize": 1000
}
```

**Response Structure:**
```json
{
  "results": [
    {
      "text": "optibac tím",
      "keywordIdeaMetrics": {
        "avgMonthlySearches": "9900",
        "competition": "LOW",
        "competitionIndex": 22,
        "lowTopOfPageBidMicros": "10000",
        "highTopOfPageBidMicros": "50000",
        "monthlySearchVolumes": [
          {"year": 2025, "month": "JANUARY", "monthlySearches": 8800},
          {"year": 2025, "month": "FEBRUARY", "monthlySearches": 9200}
        ]
      }
    },
    {
      "text": "optibac tím uống trong bao lâu hết ngứng",
      "keywordIdeaMetrics": {
        "avgMonthlySearches": "720",
        "competition": "LOW",
        "competitionIndex": 13
      }
    }
  ]
}
```

**Mapping to UI:**
- `avgMonthlySearches` → **Volume: 9.9K**
- `competition` + `competitionIndex` → **Keyword Difficulty: 22% (Easy)**
- `lowTopOfPageBidMicros` / `highTopOfPageBidMicros` → **CPC: $0.01**
- `monthlySearchVolumes` → **Trend Chart** (bar chart theo tháng)

---

#### Endpoint 1.2: Generate Keyword Historical Metrics
```
POST https://googleads.googleapis.com/v17/customers/{customer_id}:generateKeywordHistoricalMetrics
```

**Request Payload:**
```json
{
  "keywords": [
    "optibac tím",
    "optibac tím uống trong bao lâu hết ngứng",
    "uống optibac tím ra nhiều dịch"
  ],
  "historicalMetricsOptions": {
    "yearMonthRange": {
      "start": {"year": 2024, "month": "OCTOBER"},
      "end": {"year": 2025, "month": "OCTOBER"}
    },
    "includeAverageCpc": true
  },
  "keywordPlanNetwork": "GOOGLE_SEARCH",
  "geoTargetConstants": ["geoTargetConstants/2704"],
  "language": "languageConstants/1040"
}
```

**Use Case:** Lấy dữ liệu chính xác cho danh sách keyword variations (từ Keyword Ideas section)

---

### 2. Google Search Console API - Search Analytics

#### Endpoint 2.1: Get Queries Performance for 30 days
```
POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
```

**Request Payload:**
```json
{
  "startDate": "2025-09-11",
  "endDate": "2025-10-11",
  "dimensions": ["query"],
  "dimensionFilterGroups": [
    {
      "filters": [
        {
          "dimension": "query",
          "operator": "contains",
          "expression": "optibac tím"
        }
      ]
    }
  ],
  "rowLimit": 25000,
  "startRow": 0,
  "dataState": "all"
}
```

**Response Structure:**
```json
{
  "rows": [
    {
      "keys": ["optibac tím"],
      "clicks": 450,
      "impressions": 4400,
      "ctr": 0.102,
      "position": 5.2
    },
    {
      "keys": ["cách uống optibac tím"],
      "clicks": 89,
      "impressions": 950,
      "ctr": 0.094,
      "position": 7.8
    }
  ]
}
```

**Mapping to UI:**
- Hiển thị **GSC Performance Table** với columns: Query, Clicks, Impressions, CTR, Position
- Tính **Tỉ trọng keyword**: `clicks / total_clicks * 100%`

---

#### Endpoint 2.2: Get Pages for Keyword
```
POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
```

**Request Payload:**
```json
{
  "startDate": "2025-09-11",
  "endDate": "2025-10-11",
  "dimensions": ["page"],
  "dimensionFilterGroups": [
    {
      "filters": [
        {
          "dimension": "query",
          "operator": "equals",
          "expression": "optibac tím"
        }
      ]
    }
  ],
  "rowLimit": 25000,
  "startRow": 0
}
```

**Response Structure:**
```json
{
  "rows": [
    {
      "keys": ["https://nhathuocvietnhat.vn/products/optibac-tim"],
      "clicks": 320,
      "impressions": 3200,
      "ctr": 0.10,
      "position": 4.5
    },
    {
      "keys": ["https://nhathuocvietnhat.vn/blogs/optibac-tim-review"],
      "clicks": 130,
      "impressions": 1200,
      "ctr": 0.108,
      "position": 6.2
    }
  ]
}
```

**Mapping to UI:**
- Hiển thị **URL Performance Table**
- Tính **Tỉ trọng trang**: `clicks / total_clicks_for_keyword * 100%`
- Identify **Primary Landing Page** (URL có clicks cao nhất)

---

#### Endpoint 2.3: Get Global Volume by Country (for comparison)
```
POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
```

**Request Payload:**
```json
{
  "startDate": "2025-09-11",
  "endDate": "2025-10-11",
  "dimensions": ["query", "country"],
  "dimensionFilterGroups": [
    {
      "filters": [
        {
          "dimension": "query",
          "operator": "equals",
          "expression": "optibac tím"
        }
      ]
    }
  ],
  "rowLimit": 100
}
```

**Mapping to UI:**
- **Global Volume section** (breakdown by country: VN, AU, CA, DE, ES, FR)
- Bar chart showing impressions per country

---

### 3. Serper.dev API - SERP Results

#### Endpoint: Get SERP Top 10
```
GET https://serpapi.com/search.json
```
**Query Parameters**
```
engine: google
q: keyword
gl: vn
hl: vi
google_domain: google.com.vn
api_key: lấy từ biến SERPAPI_API_KEY ở .env.local
```

**Response Structure:**
```json
{
"search_metadata":
{
"id":
"68ea91e4217ade8dfd21d718",
"status":
"Success",
"json_endpoint":
"https://serpapi.com/searches/82579162ad4f6fa8/68ea91e4217ade8dfd21d718.json",
"pixel_position_endpoint":
"https://serpapi.com/searches/82579162ad4f6fa8/68ea91e4217ade8dfd21d718.json_with_pixel_position",
"created_at":
"2025-10-11 17:20:36 UTC",
"processed_at":
"2025-10-11 17:20:36 UTC",
"google_url":
"https://www.google.com.vn/search?q=optibac+t%C3%ADm&oq=optibac+t%C3%ADm&uule=w+CAIQICIaQXVzdGluLFRleGFzLFVuaXRlZCBTdGF0ZXM&hl=vi&gl=vn&sourceid=chrome&ie=UTF-8",
"raw_html_file":
"https://serpapi.com/searches/82579162ad4f6fa8/68ea91e4217ade8dfd21d718.html",
"total_time_taken":
4.41
},
"search_parameters":
{
"engine":
"google",
"q":
"optibac tím",
"location_requested":
"Austin, Texas, United States",
"location_used":
"Austin,Texas,United States",
"google_domain":
"google.com.vn",
"hl":
"vi",
"gl":
"vn",
"device":
"desktop"
},
"search_information":
{
"query_displayed":
"optibac tím",
"total_results":
77600,
"time_taken_displayed":
0.24,
"organic_results_state":
"Results for exact spelling"
},
"inline_images":
[
{
"source":
"https://nhathuoclongchau.com.vn/thuc-pham-chuc-nang/optibac-for-women-90-v.html",
"thumbnail":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/8dd34a4e49f9a7381e611dd4780113c74516344f3f0a77157f5c8cdd674652f9.jpeg"
},
{
"source":
"https://lebebee.com.vn/men-vi-sinh-optibac-tim-optibac-probiotics-for-women-30-vien-p33527354.html?srsltid=AfmBOoo-qEigbXRxSaFFcJAmw5KmmesSW7k1yInhKJ0JVmnv_vDr4aKB",
"thumbnail":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/8dd34a4e49f9a7386dfa4713545102653c9b4e4ed18a434a2179870f741078dc.jpeg"
},
{
"source":
"https://nhathuocvietnhat.vn/products/optibac-probiotic-for-women-optibac-tim-men-phu-khoa-cho-nu-gioi-nhap-khau-chinh-hang?srsltid=AfmBOoov_rNMcsBjsUlfD3UAYw7Wb3LYyX0GJMgxuLb4QrZjuZ1oSTB9",
"thumbnail":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/8dd34a4e49f9a7388253faefe4be7a76a412185e81fda9d6d242269190341893.jpeg"
},
{
"source":
"https://sieuthivitaminnhapkhau.vn/?n=78&id=159&/vien-uong-men-vi-sinh-cho-phu-nu-optibac-tim-anh-quoc=&srsltid=AfmBOormPXGDrOOa1D_bIY48LyL1gbqohDc_uwnQS_DZ1IjC3OUxaeon",
"thumbnail":
"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQULuKel_cCMOkdJmGskZ5Eblkx08NcibhMR78QBIdBiv18B7fcxZh9vXY&s",
"original":
"https://sieuthivitaminnhapkhau.vn/Images/image/Vitamin/Ho-tro-tieu-hoa/optibac/vien-uong-men-vi-sinh-cho-phu-nu-optibac-anh-quoc.jpg",
"title":
"Viên uống men vi sinh cho phụ nữ Optibac tím Anh Quốc | Phụ khoa",
"source_name":
"Siêu thị Vitamin nhập khẩu"
},
{
"source":
"https://bdcare.vn/men-vi-sinh-optibac-probiotics-for-women-30-vien-tim",
"thumbnail":
"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkuDefN4KhJlon8-zoAlg6ZLx5jrOAd03AVvyP55M2pTD_SUWmkf4X7DQ&s",
"original":
"https://cdnbiz.abphotos.link/photos/resized/x/2024/08/16/1723775003_BlZXQpS0IhLAUcP6_1723780064-phpadei0j.png",
"title":
"Men Vi Sinh Optibac Probiotics For Women 30 Viên (Tím)",
"source_name":
"BDCare"
},
{
"source":
"https://hadoha.com/san-pham/optibac-tim-for-women-probiotics-30-vien-cua-anh?srsltid=AfmBOoqR_dEpyRErMPCgumEsm69RTo63nH2J2djWQOrrsGWS0dSnH-EW",
"thumbnail":
"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQRlLUGbplIYGd6f665wFhsVv2g-ib9yBDE8gXnc3qVl8aFNRrAqgBgVkI&s",
"original":
"https://hadoha.com/wp-content/uploads/2025/05/Cong-dung-Optibac-tim-for-Women-Probiotics-30-vien-cua-Anh.webp",
"title":
"Optibac tím for Women Probiotics 30 viên của Anh",
"source_name":
"HADOHA"
},
{
"source":
"https://nhathuockhangviet.com/san-pham/optibac-for-women/?srsltid=AfmBOoodaY6clOUgokPPmiBHfd0fdkBiwSkR46keVBdkO5mkX1t7dTFQ",
"thumbnail":
"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgO3Y-pWJZbtORxqqGYF3RJpmiH4-K2QFOE08Arv6pQj5rzMXpjvfVKSs&s",
"original":
"https://nhathuockhangviet.com/wp-content/uploads/2023/11/Thanh-phan-chinh-Optibac-For-Women.jpg",
"title":
"Optibac tím For Women men vi sinh bổ sung lợi khuẩn cho phụ nữ",
"source_name":
"Nhà Thuốc Khang Việt"
},
{
"source":
"https://ovanic.vn/san-pham/men-vi-sinh-optibac-tim-optibac-probiotics-for-women/",
"thumbnail":
"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrt9H3Dj1hiC02ZwWgdGRieWe_BxqI_ngmSW5DvezKj2eAOFrKZ-6XSJQ&s",
"original":
"https://ovanic.vn/wp-content/uploads/2022/07/Optibac_Probiotics_30v-ovanic-album-3.jpg",
"title":
"Men vi sinh Optibac Tím - Optibac Probiotics For Women - Ovanic",
"source_name":
"Ovanic"
},
{
"source":
"https://nhathuocminhtien.vn/san-pham/optibac-tim-lo-90-vien-men-vi-sinh-cho-phu-nu/",
"thumbnail":
"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1QNsSpZH0efZTi7G_wzysf1j7WJEmp8s9hh1ugD51aL1ASxMmKmZKjZY&s",
"original":
"https://nhathuocminhtien.vn/wp-content/uploads/2024/01/men-vi-sinh-optibac-probiotics-cho-phu-nu-lo-90-vien-1-min_5292eb9373644f3fbbd3e685b6d87449_grande.webp",
"title":
"Optibac tím lọ 90 viên - Men vi sinh cho phụ nữ",
"source_name":
"Nhà thuốc Minh Tiến"
}
],
"organic_results":
[
{
"position":
1,
"title":
"Viên uống Optibac Probiotics tím 90 viên bổ sung lợi khuẩn",
"link":
"https://nhathuoclongchau.com.vn/thuc-pham-chuc-nang/optibac-for-women-90-v.html",
"redirect_link":
"https://www.google.com.vn/url?sa=t&source=web&rct=j&opi=89978449&url=https://nhathuoclongchau.com.vn/thuc-pham-chuc-nang/optibac-for-women-90-v.html&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4QFnoECAoQAQ",
"displayed_link":
"https://nhathuoclongchau.com.vn › thuc-pham-chuc-nang",
"favicon":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/bc1956685e3180229d22aed18141540ac8a3f5c0bab8d5f6504b796fce641902.png",
"snippet":
"Cách dùng. Uống 1 viên ngày cùng bữa ăn sáng. Có thể uống 2 viên/ngày theo ý muốn hoặc theo chỉ dẫn của chuyên gia. Có thể sử dụng liên tục.",
"snippet_highlighted_words":
[
"Uống 1 viên ngày cùng bữa ăn sáng"
],
"rich_snippet":
{
"bottom":
{
"detected_extensions":
{
"price":
990000,
"currency":
"₫",
"rating":
5,
"reviews":
18
},
"extensions":
[
"990.000 ₫",
"Giá cũ 1.100.000 ₫",
"1.100.000 ₫",
"Còn hàng",
"5,0(18)",
"Giao hàng miễn phí"
]
}
},
"source":
"Nhà thuốc Long Châu"
},
{
"position":
2,
"title":
"Thực phẩm bảo vệ sức khỏe Optibac For Women",
"link":
"https://nhathuoclongchau.com.vn/thuc-pham-chuc-nang/vien-uong-bo-sung-loi-khuan-cho-nu-gioi-optibac-intimate-flora-for-women-30-v-1.html",
"redirect_link":
"https://www.google.com.vn/url?sa=t&source=web&rct=j&opi=89978449&url=https://nhathuoclongchau.com.vn/thuc-pham-chuc-nang/vien-uong-bo-sung-loi-khuan-cho-nu-gioi-optibac-intimate-flora-for-women-30-v-1.html&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4QFnoECCUQAQ",
"displayed_link":
"https://nhathuoclongchau.com.vn › thuc-pham-chuc-nang",
"favicon":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/bc1956685e3180229d22aed18141540a71d83d5902706c5ceb599bfa38d9004a.png",
"snippet":
"Men vi sinh For Women Optibac tím hỗ trợ bổ sung lợi khuẩn cho phụ nữ, ngăn ngừa viêm nhiễm âm đạo, viêm đường tiết niệu, mua ngay tại Nhà thuốc Long Châu!",
"snippet_highlighted_words":
[
"Men vi sinh For Women Optibac tím"
],
"rich_snippet":
{
"bottom":
{
"detected_extensions":
{
"price":
450000,
"currency":
"₫",
"rating":
5,
"reviews":
64
},
"extensions":
[
"450.000 ₫",
"Giá cũ 500.000 ₫",
"500.000 ₫",
"Còn hàng",
"5,0(64)",
"Giao hàng miễn phí",
"Trả lại hàng trong 30 ngày"
]
}
},
"source":
"Nhà thuốc Long Châu"
},
{
"position":
3,
"title":
"[Giải Đáp] Optibac Tím Uống Bao Lâu Thì Ngưng?",
"link":
"https://nhathuocvietnhat.vn/blogs/giai-dap-thong-tin-san-pham/optibac-tim-uong-bao-lau-thi-ngung?srsltid=AfmBOoq4iWKEFSar6vK-YLCJtKie7ymkgo4fhqAtyK01SzJ4G8s7b3xd",
"redirect_link":
"https://www.google.com.vn/url?sa=t&source=web&rct=j&opi=89978449&url=https://nhathuocvietnhat.vn/blogs/giai-dap-thong-tin-san-pham/optibac-tim-uong-bao-lau-thi-ngung%3Fsrsltid%3DAfmBOoq4iWKEFSar6vK-YLCJtKie7ymkgo4fhqAtyK01SzJ4G8s7b3xd&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4QFnoECB4QAQ",
"displayed_link":
"https://nhathuocvietnhat.vn › giai-dap-thong-tin-san-pham",
"favicon":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/bc1956685e3180229d22aed18141540a289f2faa45f42fc6cf48e94ad6233f82.png",
"date":
"14 thg 2, 2025",
"snippet":
"Nếu bạn đang sử dụng Optibac tím để hỗ trợ điều trị viêm âm đạo do vi khuẩn hoặc nấm Candida, thời gian sử dụng liên tục thường kéo dài từ 1-3 ...",
"snippet_highlighted_words":
[
"Optibac tím"
],
"sitelinks":
{
"inline":
[
{
"title":
"Công Dụng Của Optibac Tím...",
"link":
"https://nhathuocvietnhat.vn/blogs/giai-dap-thong-tin-san-pham/optibac-tim-uong-bao-lau-thi-ngung#2-c-ng-d-ng-c-a-optibac-t-m-trong-h-tr-s-c-kh-e-ph-khoa"
},
{
"title":
"Optibac Tím Uống Bao Lâu Thì...",
"link":
"https://nhathuocvietnhat.vn/blogs/giai-dap-thong-tin-san-pham/optibac-tim-uong-bao-lau-thi-ngung#4-optibac-t-m-u-ng-bao-l-u-th-ng-ng"
}
]
},
"source":
"Nhà thuốc Việt Nhật"
},
{
"position":
4,
"title":
"Men vi sinh Optibac Anh tím phụ khoa",
"link":
"https://suristore.vn/products/optibac-tim-30-vien",
"redirect_link":
"https://www.google.com.vn/url?sa=t&source=web&rct=j&opi=89978449&url=https://suristore.vn/products/optibac-tim-30-vien&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4QFnoECCEQAQ",
"displayed_link":
"https://suristore.vn › products › optibac-tim-30-vien",
"favicon":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/bc1956685e3180229d22aed18141540a3791446582502c4bc9cca3cc8a60539f.png",
"snippet":
"Phòng và hỗ trợ điều trị viêm, nấm vùng kín và viêm đường tiết liệu hiệu quả. - Làm dịu cơn đau do viêm đường tiết niệu gây ra.",
"source":
"Suri Store"
},
{
"position":
5,
"title":
"Men vi sinh Optibac tím có tốt không? Mua ở đâu chính hãng",
"link":
"https://chiaki.vn/tin-tuc/men-vi-sinh-optibac-tim-co-tot-khong-uong-bao-lau-thi-co-hieu-qua",
"redirect_link":
"https://www.google.com.vn/url?sa=t&source=web&rct=j&opi=89978449&url=https://chiaki.vn/tin-tuc/men-vi-sinh-optibac-tim-co-tot-khong-uong-bao-lau-thi-co-hieu-qua&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4QFnoECD0QAQ",
"displayed_link":
"https://chiaki.vn › Hỏi đáp › Mẹ và bé",
"favicon":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/bc1956685e3180229d22aed18141540a73258f39e1c5dddd40ed8b1025cbc383.png",
"date":
"20 thg 8, 2025",
"snippet":
"Optibac tím là men vi sinh hỗ trợ phòng ngừa và điều trị viêm âm đạo, viêm đường tiết niệu ở phụ nữ, không phải là thuốc đặc trị nên hiệu quả ...",
"snippet_highlighted_words":
[
"Optibac tím"
],
"rich_snippet":
{
"top":
{
"detected_extensions":
{
"rating":
5,
"reviews":
2
},
"extensions":
[
"5,0(2)"
]
}
},
"source":
"Chiaki.vn"
},
{
"position":
6,
"title":
"Men vi sinh Optibac probiotics cho phụ nữ lọ 90 viên",
"link":
"https://www.hangucthomdang.com/products/men-vi-sinh-optibac-probiotics-cho-phu-nu-lo-90-vien",
"redirect_link":
"https://www.google.com.vn/url?sa=t&source=web&rct=j&opi=89978449&url=https://www.hangucthomdang.com/products/men-vi-sinh-optibac-probiotics-cho-phu-nu-lo-90-vien&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4QFnoECDQQAQ",
"displayed_link":
"https://www.hangucthomdang.com › products › men-vi-...",
"favicon":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/bc1956685e3180229d22aed18141540adcea4285d996511a1aa055f5c51bf4d3.png",
"snippet":
"Men vi sinh OptiBac Probiotics được điều chế để điều trị nấm, viêm âm đạo, làm giảm nguy cơ mắc bệnh vùng kín do vi khuẩn, vius gây nên.",
"snippet_highlighted_words":
[
"OptiBac"
],
"source":
"Hàng Úc Thom Dang"
},
{
"position":
7,
"title":
"Viên uống OPTIBAC Intimate Flora For Women bổ sung lợi ...",
"link":
"https://www.pharmacity.vn/vien-uong-optibac-intimate-flora-for-women-bo-sung-loi-khuan-cho-phu-nu-hop-30-vien.html",
"redirect_link":
"https://www.google.com.vn/url?sa=t&source=web&rct=j&opi=89978449&url=https://www.pharmacity.vn/vien-uong-optibac-intimate-flora-for-women-bo-sung-loi-khuan-cho-phu-nu-hop-30-vien.html&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4QFnoECD8QAQ",
"displayed_link":
"https://www.pharmacity.vn › ... › Hỗ trợ sinh lý nam nữ",
"favicon":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/bc1956685e3180229d22aed18141540a54ae83fcc1d2a33a4f026d4798647215.png",
"snippet":
"Viên uống OPTIBAC Intimate Flora For Women là sản phẩm bổ sung lợi khuẩn chuyên biệt dành cho phụ nữ, giúp cân bằng hệ vi sinh đường ruột và vùng kín. Với công ...",
"snippet_highlighted_words":
[
"Viên uống OPTIBAC Intimate Flora For Women"
],
"rich_snippet":
{
"bottom":
{
"detected_extensions":
{
"price":
450000,
"currency":
"₫",
"rating":
4.4,
"reviews":
82646
},
"extensions":
[
"450.000 ₫",
"Còn hàng",
"4,4(82.646)",
"Giao hàng miễn phí"
]
}
},
"source":
"Hệ thống nhà thuốc Pharmacity"
},
{
"position":
8,
"title":
"Optibac Tím - Men Vi Sinh Bổ Sung Lợi Khuẩn, Chăm Sóc ...",
"link":
"https://shopee.vn/Optibac-T%C3%ADm-Men-Vi-Sinh-B%E1%BB%95-Sung-L%E1%BB%A3i-Khu%E1%BA%A9n-Ch%C4%83m-S%C3%B3c-V%C3%B9ng-K%C3%ADn-(H%E1%BB%99p-30-vi%C3%AAn-90-vi%C3%AAn)-i.648029031.15333184420",
"redirect_link":
"https://www.google.com.vn/url?sa=t&source=web&rct=j&opi=89978449&url=https://shopee.vn/Optibac-T%25C3%25ADm-Men-Vi-Sinh-B%25E1%25BB%2595-Sung-L%25E1%25BB%25A3i-Khu%25E1%25BA%25A9n-Ch%25C4%2583m-S%25C3%25B3c-V%25C3%25B9ng-K%25C3%25ADn-(H%25E1%25BB%2599p-30-vi%25C3%25AAn-90-vi%25C3%25AAn)-i.648029031.15333184420&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4QFnoECDcQAQ",
"displayed_link":
"https://shopee.vn › Optibac-Tím-Men-Vi-Sinh-Bổ-Sung-...",
"favicon":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/bc1956685e3180229d22aed18141540aba2db84503c41fd5c85faa031a2abd9a.png",
"snippet":
"✔️ Uống 1 - 2 viên/ngày sau bữa ăn, tốt nhất là sau bữa sáng. ✔️ Nếu uống thường xuyên, uống 1 viên mỗi ngày ...",
"snippet_highlighted_words":
[
"Uống 1 - 2 viên/ngày sau bữa ăn, tốt nhất là sau bữa sáng"
],
"rich_snippet":
{
"top":
{
"detected_extensions":
{
"rating":
5,
"reviews":
13950
},
"extensions":
[
"5,0(13.950)"
]
}
},
"source":
"Shopee Việt Nam"
},
{
"position":
9,
"title":
"Optibac tím có dùng được cho bà bầu không: giải đáp chi tiết",
"link":
"https://medlatec.vn/tin-tuc/optibac-tim-co-dung-duoc-cho-ba-bau-khong-giai-dap-chi-tiet",
"redirect_link":
"https://www.google.com.vn/url?sa=t&source=web&rct=j&opi=89978449&url=https://medlatec.vn/tin-tuc/optibac-tim-co-dung-duoc-cho-ba-bau-khong-giai-dap-chi-tiet&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4QFnoECDYQAQ",
"displayed_link":
"https://medlatec.vn › tin-tuc › optibac-tim-co-dung-duo...",
"favicon":
"https://serpapi.com/searches/68ea91e4217ade8dfd21d718/images/bc1956685e3180229d22aed18141540a892405b731fb6725b43f1e77f71627a5.png",
"date":
"1 thg 4, 2024",
"snippet":
"- Nếu đã được tư vấn Optibac tím có dùng được cho bà bầu không từ bác sĩ chuyên khoa thì nên uống sản phẩm này vào sau bữa ăn sáng để cơ thể có ...",
"snippet_highlighted_words":
[
"Optibac tím"
],
"source":
"Bệnh viện Đa khoa MEDLATEC"
}
],
"related_searches":
[
{
"block_position":
1,
"query":
"Optibac tím Nhà thuốc Long Châu",
"link":
"https://www.google.com.vn/search?sca_esv=8c00fc1d70128356&gl=vn&hl=vi&q=Optibac+t%C3%ADm+Nh%C3%A0+thu%E1%BB%91c+Long+Ch%C3%A2u&sa=X&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q1QJ6BAgrEAE",
"serpapi_link":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=Optibac+t%C3%ADm+Nh%C3%A0+thu%E1%BB%91c+Long+Ch%C3%A2u"
},
{
"block_position":
1,
"query":
"Optibac tím có tác dụng gì",
"link":
"https://www.google.com.vn/search?sca_esv=8c00fc1d70128356&gl=vn&hl=vi&q=Optibac+t%C3%ADm+c%C3%B3+t%C3%A1c+d%E1%BB%A5ng+g%C3%AC&sa=X&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q1QJ6BAgxEAE",
"serpapi_link":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=Optibac+t%C3%ADm+c%C3%B3+t%C3%A1c+d%E1%BB%A5ng+g%C3%AC"
},
{
"block_position":
1,
"query":
"Optibac tím hướng dẫn sử dụng",
"link":
"https://www.google.com.vn/search?sca_esv=8c00fc1d70128356&gl=vn&hl=vi&q=Optibac+t%C3%ADm+h%C6%B0%E1%BB%9Bng+d%E1%BA%ABn+s%E1%BB%AD+d%E1%BB%A5ng&sa=X&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q1QJ6BAgyEAE",
"serpapi_link":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=Optibac+t%C3%ADm+h%C6%B0%E1%BB%9Bng+d%E1%BA%ABn+s%E1%BB%AD+d%E1%BB%A5ng"
},
{
"block_position":
1,
"query":
"Optibac tím 90 viên",
"link":
"https://www.google.com.vn/search?sca_esv=8c00fc1d70128356&gl=vn&hl=vi&q=Optibac+t%C3%ADm+90+vi%C3%AAn&sa=X&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q1QJ6BAgwEAE",
"serpapi_link":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=Optibac+t%C3%ADm+90+vi%C3%AAn"
},
{
"block_position":
1,
"query":
"Optibac tím 90 viên Long Châu",
"link":
"https://www.google.com.vn/search?sca_esv=8c00fc1d70128356&gl=vn&hl=vi&q=Optibac+t%C3%ADm+90+vi%C3%AAn+Long+Ch%C3%A2u&sa=X&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q1QJ6BAgvEAE",
"serpapi_link":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=Optibac+t%C3%ADm+90+vi%C3%AAn+Long+Ch%C3%A2u"
},
{
"block_position":
1,
"query":
"Optibac tím uống trong bao lâu thì ngưng",
"link":
"https://www.google.com.vn/search?sca_esv=8c00fc1d70128356&gl=vn&hl=vi&q=Optibac+t%C3%ADm+u%E1%BB%91ng+trong+bao+l%C3%A2u+th%C3%AC+ng%C6%B0ng&sa=X&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q1QJ6BAguEAE",
"serpapi_link":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=Optibac+t%C3%ADm+u%E1%BB%91ng+trong+bao+l%C3%A2u+th%C3%AC+ng%C6%B0ng"
},
{
"block_position":
1,
"query":
"Optibac tím 30 viên",
"link":
"https://www.google.com.vn/search?sca_esv=8c00fc1d70128356&gl=vn&hl=vi&q=Optibac+t%C3%ADm+30+vi%C3%AAn&sa=X&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q1QJ6BAgtEAE",
"serpapi_link":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=Optibac+t%C3%ADm+30+vi%C3%AAn"
},
{
"block_position":
1,
"query":
"Optibac tím An Khang",
"link":
"https://www.google.com.vn/search?sca_esv=8c00fc1d70128356&gl=vn&hl=vi&q=Optibac+t%C3%ADm+An+Khang&sa=X&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q1QJ6BAgsEAE",
"serpapi_link":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=Optibac+t%C3%ADm+An+Khang"
}
],
"pagination":
{
"current":
1,
"next":
"https://www.google.com.vn/search?q=optibac+t%C3%ADm&sca_esv=8c00fc1d70128356&gl=vn&hl=vi&ei=6JHqaN-PCdecwbkP1J2B8Ac&start=10&sa=N&sstk=Af77f_egCeAeg3h3c0zQZZnksPio6Mg5snha_dbYXtlUrR5z9jb8Hayo4i3RWgmWRqHJc1Hj0Sa_Pv6LlAviMZ8GmDpWkOAqEZ8GFg&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q8NMDegQIKBAS",
"other_pages":
{
"2":
"https://www.google.com.vn/search?q=optibac+t%C3%ADm&sca_esv=8c00fc1d70128356&gl=vn&hl=vi&ei=6JHqaN-PCdecwbkP1J2B8Ac&start=10&sa=N&sstk=Af77f_egCeAeg3h3c0zQZZnksPio6Mg5snha_dbYXtlUrR5z9jb8Hayo4i3RWgmWRqHJc1Hj0Sa_Pv6LlAviMZ8GmDpWkOAqEZ8GFg&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q8tMDegQIKBAE",
"3":
"https://www.google.com.vn/search?q=optibac+t%C3%ADm&sca_esv=8c00fc1d70128356&gl=vn&hl=vi&ei=6JHqaN-PCdecwbkP1J2B8Ac&start=20&sa=N&sstk=Af77f_egCeAeg3h3c0zQZZnksPio6Mg5snha_dbYXtlUrR5z9jb8Hayo4i3RWgmWRqHJc1Hj0Sa_Pv6LlAviMZ8GmDpWkOAqEZ8GFg&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q8tMDegQIKBAG",
"4":
"https://www.google.com.vn/search?q=optibac+t%C3%ADm&sca_esv=8c00fc1d70128356&gl=vn&hl=vi&ei=6JHqaN-PCdecwbkP1J2B8Ac&start=30&sa=N&sstk=Af77f_egCeAeg3h3c0zQZZnksPio6Mg5snha_dbYXtlUrR5z9jb8Hayo4i3RWgmWRqHJc1Hj0Sa_Pv6LlAviMZ8GmDpWkOAqEZ8GFg&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q8tMDegQIKBAI",
"5":
"https://www.google.com.vn/search?q=optibac+t%C3%ADm&sca_esv=8c00fc1d70128356&gl=vn&hl=vi&ei=6JHqaN-PCdecwbkP1J2B8Ac&start=40&sa=N&sstk=Af77f_egCeAeg3h3c0zQZZnksPio6Mg5snha_dbYXtlUrR5z9jb8Hayo4i3RWgmWRqHJc1Hj0Sa_Pv6LlAviMZ8GmDpWkOAqEZ8GFg&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q8tMDegQIKBAK",
"6":
"https://www.google.com.vn/search?q=optibac+t%C3%ADm&sca_esv=8c00fc1d70128356&gl=vn&hl=vi&ei=6JHqaN-PCdecwbkP1J2B8Ac&start=50&sa=N&sstk=Af77f_egCeAeg3h3c0zQZZnksPio6Mg5snha_dbYXtlUrR5z9jb8Hayo4i3RWgmWRqHJc1Hj0Sa_Pv6LlAviMZ8GmDpWkOAqEZ8GFg&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q8tMDegQIKBAM",
"7":
"https://www.google.com.vn/search?q=optibac+t%C3%ADm&sca_esv=8c00fc1d70128356&gl=vn&hl=vi&ei=6JHqaN-PCdecwbkP1J2B8Ac&start=60&sa=N&sstk=Af77f_egCeAeg3h3c0zQZZnksPio6Mg5snha_dbYXtlUrR5z9jb8Hayo4i3RWgmWRqHJc1Hj0Sa_Pv6LlAviMZ8GmDpWkOAqEZ8GFg&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q8tMDegQIKBAO",
"8":
"https://www.google.com.vn/search?q=optibac+t%C3%ADm&sca_esv=8c00fc1d70128356&gl=vn&hl=vi&ei=6JHqaN-PCdecwbkP1J2B8Ac&start=70&sa=N&sstk=Af77f_egCeAeg3h3c0zQZZnksPio6Mg5snha_dbYXtlUrR5z9jb8Hayo4i3RWgmWRqHJc1Hj0Sa_Pv6LlAviMZ8GmDpWkOAqEZ8GFg&ved=2ahUKEwjfo_KG1JyQAxVXTjABHdROAH4Q8tMDegQIKBAQ"
}
},
"serpapi_pagination":
{
"current":
1,
"next_link":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=optibac+t%C3%ADm&start=10",
"next":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=optibac+t%C3%ADm&start=10",
"other_pages":
{
"2":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=optibac+t%C3%ADm&start=10",
"3":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=optibac+t%C3%ADm&start=20",
"4":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=optibac+t%C3%ADm&start=30",
"5":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=optibac+t%C3%ADm&start=40",
"6":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=optibac+t%C3%ADm&start=50",
"7":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=optibac+t%C3%ADm&start=60",
"8":
"https://serpapi.com/search.json?device=desktop&engine=google&gl=vn&google_domain=google.com.vn&hl=vi&location=Austin%2C+Texas%2C+United+States&q=optibac+t%C3%ADm&start=70"
}
}
}
```

**Mapping to UI:**
- **SERP Analysis Table**: Position, URL, Domain, Page AS (Ahrefs), Ref. Domains, Backlinks, Search Traffic, URL Keywords
- Highlight **Your URLs** (domain match với site của bạn)
- Calculate **Competitive Density**: số lượng unique domains / 10

---

## 🏗️ III. COMPONENT STRUCTURE

```
KeywordOverviewPage/
├── KeywordOverviewHeader.jsx
│   └── Input: keyword, location, language, dateRange
│
├── MetricsOverview.jsx
│   ├── VolumeCard (từ Google Ads API)
│   ├── GlobalVolumeCard (từ GSC API - breakdown by country)
│   ├── DifficultyCard (từ Google Ads API)
│   ├── IntentCard (phân tích từ keyword text)
│   ├── TrendChart (từ Google Ads monthlySearchVolumes)
│   ├── CPCCard (từ Google Ads API)
│   └── CompetitiveDensityCard (từ Serper SERP)
│
├── KeywordIdeasSection.jsx
│   ├── KeywordVariationsTable (từ Google Ads generateKeywordIdeas)
│   │   └── Columns: Keyword, Volume, KD%
│   └── QuestionsCard (future: từ AlsoAsked API hoặc PAA)
│
├── GSCPerformanceSection.jsx (CHỈ hiển thị nếu có data)
│   ├── SummaryCards
│   │   ├── TotalClicks
│   │   ├── TotalImpressions
│   │   ├── AvgCTR
│   │   └── AvgPosition
│   ├── RelatedQueriesTable
│   │   └── Columns: Query, Clicks, Impressions, CTR, Position, Share%
│   ├── LandingPagesTable
│   │   └── Columns: URL, Clicks, Impressions, CTR, Position, Share%
│   └── KeywordStrategyInsights
│       ├── Tỉ trọng keyword (clicks/volume ratio)
│       ├── Cannibalization detection (nhiều URLs cùng rank)
│       └── Opportunity score (impression cao, clicks thấp)
│
├── SERPAnalysisSection.jsx
│   ├── SERPTable (từ Serper.dev)
│   │   └── Columns: Position, URL, Domain, PageAS, RefDomains, Backlinks, Traffic, Keywords
│   ├── YourRankings (filter URLs thuộc domain của bạn)
│   └── CompetitorAnalysis
│       ├── Top Competitors
│       └── SERP Features detected
│
└── StrategyRecommendations.jsx
    ├── ForNewKeywords
    │   ├── Volume/Difficulty assessment
    │   ├── Competition analysis
    │   └── Content gap opportunities
    └── ForExistingKeywords
        ├── Performance summary
        ├── Optimization opportunities
        ├── Content expansion ideas
        └── Cannibalization warnings
```

---

## ⚙️ IV. SERVICES & FUNCTIONS

### Service 1: Google Ads Service
**File:** `/services/googleAdsService.js`

```javascript
class GoogleAdsService {
  
  /**
   * Generate keyword ideas
   * @param {string} seedKeyword - Keyword gốc
   * @param {string} location - Geo target constant (e.g., "2704" for Vietnam)
   * @param {string} language - Language constant (e.g., "1040" for Vietnamese)
   * @returns {Promise<Array>} Keyword ideas with metrics
   */
  async generateKeywordIdeas(seedKeyword, location, language) {}
  
  /**
   * Get historical metrics for specific keywords
   * @param {Array<string>} keywords - Danh sách keywords
   * @param {Object} dateRange - {start: {year, month}, end: {year, month}}
   * @returns {Promise<Array>} Keywords with historical metrics
   */
  async getKeywordHistoricalMetrics(keywords, dateRange) {}
  
  /**
   * Helper: Calculate keyword difficulty score
   * @param {number} competitionIndex - 0-100 from API
   * @param {string} competition - LOW/MEDIUM/HIGH
   * @returns {Object} {score: number, label: string, color: string}
   */
  calculateDifficulty(competitionIndex, competition) {
    // Logic:
    // 0-30: Easy (green)
    // 31-60: Medium (orange)
    // 61-100: Hard (red)
  }
  
  /**
   * Helper: Format volume with K/M suffix
   */
  formatVolume(number) {
    // 9900 -> "9.9K"
    // 1000000 -> "1M"
  }
  
  /**
   * Helper: Calculate CPC from micros
   */
  calculateCPC(lowMicros, highMicros, currency = "USD") {
    // (low + high) / 2 / 1000000
  }
}
```

---

### Service 2: GSC Service
**File:** `/services/gscService.js`

```javascript
class GSCService {
  
  /**
   * Get queries related to seed keyword (with pagination)
   * @param {string} seedKeyword - Keyword seed
   * @param {string} operator - "contains" | "equals"
   * @param {Object} dateRange - {startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD"}
   * @returns {Promise<Array>} Queries with clicks, impressions, CTR, position
   */
  async getQueriesForKeyword(seedKeyword, operator = "contains", dateRange) {
    // Implement pagination với rowLimit=25000
    // Loop until no more rows
  }
  
  /**
   * Get landing pages for specific query
   * @param {string} query - Exact query
   * @param {Object} dateRange
   * @returns {Promise<Array>} Pages with performance metrics
   */
  async getPagesForQuery(query, dateRange) {}
  
  /**
   * Get global volume breakdown by country
   * @param {string} query
   * @param {Object} dateRange
   * @returns {Promise<Array>} [{country: "VN", impressions: 9900}, ...]
   */
  async getGlobalVolumeByCountry(query, dateRange) {}
  
  /**
   * Calculate keyword share (tỉ trọng)
   * @param {Array} queries - All queries data
   * @returns {Array} Queries with added 'share' field (%)
   */
  calculateKeywordShare(queries) {
    const totalClicks = queries.reduce((sum, q) => sum + q.clicks, 0);
    return queries.map(q => ({
      ...q,
      share: (q.clicks / totalClicks * 100).toFixed(2)
    }));
  }
  
  /**
   * Detect URL cannibalization
   * @param {Array} pages - Landing pages for a keyword
   * @returns {Object} {hasIssue: boolean, message: string}
   */
  detectCannibalization(pages) {
    // Logic: Nếu có >3 URLs với clicks đáng kể -> cảnh báo
    // Hoặc: nhiều URLs cùng position gần nhau
  }
  
  /**
   * Calculate opportunity score
   * @param {Object} query - {clicks, impressions, ctr, position}
   * @returns {number} Score 0-100
   */
  calculateOpportunityScore(query) {
    // High impressions + Low CTR + Position 5-20 = High opportunity
    // Logic: (impressions / 100) * (1 - ctr) * (position penalty)
  }
}
```

---

### Service 3: Serper Service
**File:** `/services/serperService.js`

```javascript
class SerperService {
  
  /**
   * Get SERP results
   * @param {string} keyword
   * @param {string} country - 2-letter code (e.g., "vn")
   * @param {string} language - 2-letter code (e.g., "vi")
   * @returns {Promise<Array>} Top 10 organic results
   */
  async getSERPResults(keyword, country = "vn", language = "vi") {}
  
  /**
   * Calculate competitive density
   * @param {Array} serpResults
   * @returns {number} Unique domains / 10
   */
  calculateCompetitiveDensity(serpResults) {
    const uniqueDomains = new Set(serpResults.map(r => r.domain));
    return (uniqueDomains.size / 10).toFixed(2);
  }
  
  /**
   * Identify your rankings
   * @param {Array} serpResults
   * @param {string} yourDomain - e.g., "nhathuocvietnhat.vn"
   * @returns {Array} Your URLs in SERP
   */
  findYourRankings(serpResults, yourDomain) {}
  
  /**
   * Detect SERP features
   * @param {Object} serpResponse - Full Serper response
   * @returns {Array<string>} ["Featured Snippet", "People Also Ask", "Video", ...]
   */
  detectSERPFeatures(serpResponse) {
    // Check for: answerBox, peopleAlsoAsk, relatedSearches, videos, images
  }
}
```

---

### Service 4: Integration Service (Orchestrator)
**File:** `/services/keywordOverviewService.js`

```javascript
class KeywordOverviewService {
  
  constructor() {
    this.googleAds = new GoogleAdsService();
    this.gsc = new GSCService();
    this.serper = new SerperService();
  }
  
  /**
   * Main function: Aggregate all data for keyword overview
   * @param {Object} params - {keyword, location, language, dateRange, userDomain}
   * @returns {Promise<Object>} Complete keyword overview data
   */
  async getKeywordOverview(params) {
    const { keyword, location, language, dateRange, userDomain } = params;
    
    // Step 1: Check if keyword exists in GSC (parallel với other calls)
    const gscCheckPromise = this.gsc.getQueriesForKeyword(keyword, "equals", dateRange);
    
    // Step 2: Parallel API calls
    const [
      keywordIdeas,
      gscData,
      serpData
    ] = await Promise.all([
      this.googleAds.generateKeywordIdeas(keyword, location, language),
      gscCheckPromise,
      this.serper.getSERPResults(keyword, location.toLowerCase(), language)
    ]);
    
    // Step 3: Determine if keyword is "new" or "existing"
    const isExistingKeyword = gscData.length > 0;
    
    // Step 4: Additional data for existing keywords
    let gscPages = null;
    let relatedQueries = null;
    let globalVolume = null;
    
    if (isExistingKeyword) {
      [gscPages, relatedQueries, globalVolume] = await Promise.all([
        this.gsc.getPagesForQuery(keyword, dateRange),
        this.gsc.getQueriesForKeyword(keyword, "contains", dateRange),
        this.gsc.getGlobalVolumeByCountry(keyword, dateRange)
      ]);
    }
    
    // Step 5: Aggregate and calculate
    return {
      keyword,
      isNew: !isExistingKeyword,
      
      // Metrics Overview
      metrics: this.buildMetricsOverview(keywordIdeas, gscData, serpData),
      
      // Keyword Ideas
      keywordVariations: this.buildKeywordVariations(keywordIdeas),
      
      // GSC Performance (only if existing)
      gscPerformance: isExistingKeyword ? {
        summary: this.buildGSCSummary(gscData),
        relatedQueries: this.gsc.calculateKeywordShare(relatedQueries),
        landingPages: this.gsc.calculateKeywordShare(gscPages),
        globalVolume: globalVolume
      } : null,
      
      // SERP Analysis
      serpAnalysis: this.buildSERPAnalysis(serpData, userDomain),
      
      // Strategy Recommendations
      strategy: this.buildStrategyRecommendations({
        isNew: !isExistingKeyword,
        metrics: keywordIdeas[0],
        gscData,
        gscPages,
        serpData
      })
    };
  }
  
  /**
   * Build metrics overview section
   */
  buildMetricsOverview(keywordIdeas, gscData, serpData) {
    const mainKeyword = keywordIdeas[0]; // Keyword chính
    
    return {
      volume: mainKeyword.keywordIdeaMetrics.avgMonthlySearches,
      globalVolume: {
        total: mainKeyword.keywordIdeaMetrics.avgMonthlySearches,
        breakdown: [] // Sẽ populate từ GSC nếu có
      },
      difficulty: this.googleAds.calculateDifficulty(
        mainKeyword.keywordIdeaMetrics.competitionIndex,
        mainKeyword.keywordIdeaMetrics.competition
      ),
      intent: this.detectIntent(mainKeyword.text),
      trend: mainKeyword.keywordIdeaMetrics.monthlySearchVolumes,
      cpc: this.googleAds.calculateCPC(
        mainKeyword.keywordIdeaMetrics.lowTopOfPageBidMicros,
        mainKeyword.keywordIdeaMetrics.highTopOfPageBidMicros
      ),
      competitiveDensity: this.serper.calculateCompetitiveDensity(serpData)
    };
  }
  
  /**
   * Detect search intent
   */
  detectIntent(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    
    // Intent detection logic
    if (lowerKeyword.match(/mua|giá|bán|shop|store/)) return "Transactional";
    if (lowerKeyword.match(/cách|hướng dẫn|review|đánh giá|so sánh/)) return "Informational";
    if (lowerKeyword.match(/gần đây|ở đâu|địa chỉ/)) return "Local";
    
    return "Informational";
  }
  
  /**
   * Build keyword variations table
   */
  buildKeywordVariations(keywordIdeas) {
    return keywordIdeas.slice(0, 82).map(idea => ({
      keyword: idea.text,
      volume: idea.keywordIdeaMetrics.avgMonthlySearches,
      kd: idea.keywordIdeaMetrics.competitionIndex
    }));
  }
  
  /**
   * Build GSC summary
   */
  buildGSCSummary(gscData) {
    if (!gscData || gscData.length === 0) return null;
    
    const mainQuery = gscData[0]; // Query chính
    
    return {
      clicks: mainQuery.clicks,
      impressions: mainQuery.impressions,
      ctr: mainQuery.ctr,
      position: mainQuery.position,
      clickToVolumeRatio: (mainQuery.clicks / mainQuery.impressions * 100).toFixed(2)
    };
  }
  
  /**
   * Build SERP analysis
   */
  buildSERPAnalysis(serpData, userDomain) {
    return {
      results: serpData,
      yourRankings: this.serper.findYourRankings(serpData, userDomain),
      competitiveDensity: this.serper.calculateCompetitiveDensity(serpData),
      serpFeatures: this.serper.detectSERPFeatures(serpData),
      topCompetitors: this.identifyTopCompetitors(serpData, userDomain)
    };
  }
  
  /**
   * Identify top competitors
   */
  identifyTopCompetitors(serpData, userDomain) {
    return serpData
      .filter(result => !result.domain.includes(userDomain))
      .slice(0, 3)
      .map(result => ({
        domain: result.domain,
        position: result.position,
        title: result.title
      }));
  }
  
  /**
   * Build strategy recommendations
   */
  buildStrategyRecommendations({ isNew, metrics, gscData, gscPages, serpData }) {
    const recommendations = [];
    
    if (isNew) {
      // Recommendations for new keywords
      if (metrics.keywordIdeaMetrics.competitionIndex < 30) {
        recommendations.push({
          type: "opportunity",
          priority: "high",
          title: "Low Competition Opportunity",
          description: `Keyword có độ khó thấp (${metrics.keywordIdeaMetrics.competitionIndex}%) và volume ${metrics.keywordIdeaMetrics.avgMonthlySearches}. Đây là cơ hội tốt để tạo content.`,
          actions: [
            "Tạo landing page tối ưu cho keyword này",
            "Xây dựng content cluster xung quanh topic",
            "Nghiên cứu top 3 competitors trong SERP"
          ]
        });
      }
      
      if (metrics.keywordIdeaMetrics.avgMonthlySearches > 5000) {
        recommendations.push({
          type: "volume",
          priority: "medium",
          title: "High Volume Keyword",
          description: "Keyword có search volume cao, cần chiến lược dài hạn.",
          actions: [
            "Phân tích search intent chi tiết",
            "Chuẩn bị content chất lượng cao",
            "Xây dựng backlink strategy"
          ]
        });
      }
    } else {
      // Recommendations for existing keywords
      const mainQuery = gscData[0];
      
      // Check CTR
      if (mainQuery.ctr < 0.05 && mainQuery.position < 10) {
        recommendations.push({
          type: "optimization",
          priority: "high",
          title: "Low CTR Despite Good Position",
          description: `CTR chỉ ${(mainQuery.ctr * 100).toFixed(2)}% ở vị trí ${mainQuery.position.toFixed(1)}. Cần tối ưu title/meta description.`,
          actions: [
            "Viết lại title tag hấp dẫn hơn",
            "Tối ưu meta description với CTA rõ ràng",
            "Thêm schema markup để có rich snippets"
          ]
        });
      }
      
      // Check cannibalization
      if (gscPages && gscPages.length > 3) {
        const cannibalizationIssue = this.gsc.detectCannibalization(gscPages);
        if (cannibalizationIssue.hasIssue) {
          recommendations.push({
            type: "warning",
            priority: "high",
            title: "Keyword Cannibalization Detected",
            description: cannibalizationIssue.message,
            actions: [
              "Xác định 1 primary landing page",
              "Consolidate nội dung hoặc canonical URLs",
              "Internal linking về primary page"
            ]
          });
        }
      }
      
      // Check opportunity (high impressions, low clicks)
      const opportunityScore = this.gsc.calculateOpportunityScore(mainQuery);
      if (opportunityScore > 60) {
        recommendations.push({
          type: "opportunity",
          priority: "medium",
          title: "Optimization Opportunity",
          description: `Có ${mainQuery.impressions} impressions nhưng chỉ ${mainQuery.clicks} clicks. Tiềm năng tối ưu cao.`,
          actions: [
            "Cải thiện position (hiện tại: ${mainQuery.position.toFixed(1)})",
            "Tối ưu on-page SEO",
            "Tăng authority với backlinks"
          ]
        });
      }
      
      // Check volume vs clicks ratio
      const volumeToClicksRatio = (mainQuery.clicks / metrics.avgMonthlySearches * 100).toFixed(2);
      if (volumeToClicksRatio < 5) {
        recommendations.push({
          type: "insight",
          priority: "low",
          title: "Market Share Analysis",
          description: `Bạn đang capture ${volumeToClicksRatio}% market share cho keyword này.`,
          actions: [
            "Phân tích competitors ranking cao hơn",
            "Tìm keyword variations để mở rộng",
            "Xem xét paid ads để boost visibility"
          ]
        });
      }
    }
    
    return recommendations;
  }
}
```

---

## 📐 V. UI/UX LAYOUT SPECIFICATION

### Section 1: Header & Input
```jsx
<KeywordOverviewHeader>
  <Input 
    placeholder="Enter keyword (e.g., optibac tím)"
    value={keyword}
    onChange={...}
  />
  <Select label="Location" options={COUNTRIES} value={location} />
  <Select label="Language" options={LANGUAGES} value={language} />
  <Select label="Date Range" options={["Last 7 days", "Last 28 days", "Last 90 days"]} />
  <Button onClick={handleSearch}>Analyze</Button>
</KeywordOverviewHeader>
```

---

### Section 2: Metrics Overview (Grid Layout)
```jsx
<MetricsOverview>
  <Grid columns={4}>
    {/* Row 1 */}
    <VolumeCard 
      value="9.9K"
      trend={-5} // % change
      source="Google Ads"
    />
    <GlobalVolumeCard 
      total="10.1K"
      breakdown={[
        {country: "VN", flag: "🇻🇳", volume: "9.9K"},
        {country: "AU", flag: "🇦🇺", volume: "20"},
        // ...
      ]}
    />
    <IntentCard value="Informational" color="blue" />
    <CPCCard value="$0.01" range="$0.01 - $0.05" />
    
    {/* Row 2 */}
    <DifficultyCard 
      score={22}
      label="Easy"
      color="green"
      description="It is quite possible to rank for this keyword..."
    />
    <TrendChart 
      data={monthlySearchVolumes}
      type="bar"
    />
    <CompetitiveDensityCard value="0.92" />
    <PLACard value="n/a" />
  </Grid>
</MetricsOverview>
```

---

### Section 3: Keyword Ideas
```jsx
<KeywordIdeasSection>
  <SectionHeader>
    <h3>Keyword Ideas</h3>
    <Badges>
      <Badge>Keyword Variations: 82 (Total Volume: 14.7K)</Badge>
    </Badges>
  </SectionHeader>
  
  <KeywordVariationsTable>
    <thead>
      <tr>
        <th>Keywords</th>
        <th>Volume</th>
        <th>KD %</th>
      </tr>
    </thead>
    <tbody>
      {keywordVariations.map(kw => (
        <tr key={kw.keyword}>
          <td>{kw.keyword}</td>
          <td>{formatVolume(kw.volume)}</td>
          <td>
            <DifficultyBadge value={kw.kd} />
          </td>
        </tr>
      ))}
    </tbody>
  </KeywordVariationsTable>
  
  <Button variant="text">View all 82 keywords</Button>
</KeywordIdeasSection>
```

---

### Section 4: GSC Performance (Conditional Rendering)
```jsx
{gscPerformance && (
  <GSCPerformanceSection>
    <SectionHeader>
      <h3>Your Keyword Performance (Last 30 Days)</h3>
      <InfoTooltip>Data từ Google Search Console</InfoTooltip>
    </SectionHeader>
    
    {/* Summary Cards */}
    <Grid columns={4}>
      <MetricCard 
        label="Total Clicks" 
        value={gscPerformance.summary.clicks}
        icon="🖱️"
      />
      <MetricCard 
        label="Total Impressions" 
        value={gscPerformance.summary.impressions}
        icon="👁️"
      />
      <MetricCard 
        label="Avg CTR" 
        value={`${(gscPerformance.summary.ctr * 100).toFixed(2)}%`}
        icon="📊"
      />
      <MetricCard 
        label="Avg Position" 
        value={gscPerformance.summary.position.toFixed(1)}
        icon="🎯"
      />
    </Grid>
    
    {/* Related Queries Table */}
    <Subsection>
      <h4>Related Queries (Containing "{keyword}")</h4>
      <Table>
        <thead>
          <tr>
            <th>Query</th>
            <th>Clicks</th>
            <th>Impressions</th>
            <th>CTR</th>
            <th>Position</th>
            <th>Share %</th>
          </tr>
        </thead>
        <tbody>
          {gscPerformance.relatedQueries.map(query => (
            <tr key={query.keys[0]}>
              <td>{query.keys[0]}</td>
              <td>{query.clicks}</td>
              <td>{query.impressions}</td>
              <td>{(query.ctr * 100).toFixed(2)}%</td>
              <td>{query.position.toFixed(1)}</td>
              <td>
                <Badge color={query.share > 20 ? 'green' : 'gray'}>
                  {query.share}%
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Subsection>
    
    {/* Landing Pages Table */}
    <Subsection>
      <h4>Landing Pages for "{keyword}"</h4>
      <Table>
        <thead>
          <tr>
            <th>URL</th>
            <th>Clicks</th>
            <th>Impressions</th>
            <th>CTR</th>
            <th>Position</th>
            <th>Share %</th>
          </tr>
        </thead>
        <tbody>
          {gscPerformance.landingPages.map(page => (
            <tr key={page.keys[0]}>
              <td>
                <URLCell url={page.keys[0]} isPrimary={page.share > 50} />
              </td>
              <td>{page.clicks}</td>
              <td>{page.impressions}</td>
              <td>{(page.ctr * 100).toFixed(2)}%</td>
              <td>{page.position.toFixed(1)}</td>
              <td>
                <ProgressBar value={page.share} />
                {page.share}%
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Subsection>
    
    {/* Global Volume by Country */}
    <Subsection>
      <h4>Global Volume Distribution</h4>
      <BarChart 
        data={gscPerformance.globalVolume}
        xKey="country"
        yKey="impressions"
      />
    </Subsection>
  </GSCPerformanceSection>
)}
```

---

### Section 5: SERP Analysis
```jsx
<SERPAnalysisSection>
  <SectionHeader>
    <h3>SERP Analysis</h3>
    <Tabs>
      <Tab active>Domain</Tab>
      <Tab>URL</Tab>
    </Tabs>
    <Button onClick={handleRefresh}>🔄 View SERP</Button>
  </SectionHeader>
  
  <SERPSummary>
    <MetricCard label="Results" value={serpAnalysis.results.length} />
    <MetricCard label="SERP Features" value={serpAnalysis.serpFeatures.join(", ")} />
    <MetricCard label="Your Rankings" value={serpAnalysis.yourRankings.length} />
    <MetricCard label="Competitive Density" value={serpAnalysis.competitiveDensity} />
  </SERPSummary>
  
  <SERPTable>
    <thead>
      <tr>
        <th>Position</th>
        <th>URL</th>
        <th>Domain</th>
        <th>Page AS</th>
        <th>Ref. Domains</th>
        <th>Backlinks</th>
        <th>Search Traffic</th>
        <th>URL Keywords</th>
      </tr>
    </thead>
    <tbody>
      {serpAnalysis.results.map((result, index) => (
        <tr key={index} className={result.isYours ? 'highlight' : ''}>
          <td>{result.position}</td>
          <td>
            <URLCell 
              url={result.link}
              title={result.title}
              isYours={result.isYours}
            />
          </td>
          <td>{result.domain}</td>
          <td>{result.pageAS || 'n/a'}</td>
          <td>{result.refDomains || 'n/a'}</td>
          <td>{result.backlinks || 'n/a'}</td>
          <td>{result.traffic || 'n/a'}</td>
          <td>{result.keywords || 'n/a'}</td>
        </tr>
      ))}
    </tbody>
  </SERPTable>
  
  {serpAnalysis.yourRankings.length > 0 && (
    <Alert type="success">
      ✅ Your site ranks at position {serpAnalysis.yourRankings[0].position} for this keyword.
    </Alert>
  )}
  
  {serpAnalysis.yourRankings.length === 0 && (
    <Alert type="warning">
      ⚠️ Your site is not in top 10 for this keyword. Consider content creation or optimization.
    </Alert>
  )}
</SERPAnalysisSection>
```

---

### Section 6: Strategy Recommendations
```jsx
<StrategyRecommendations>
  <SectionHeader>
    <h3>🎯 Keyword Strategy Recommendations</h3>
  </SectionHeader>
  
  {strategy.recommendations.map((rec, index) => (
    <RecommendationCard 
      key={index}
      type={rec.type}
      priority={rec.priority}
    >
      <CardHeader>
        <PriorityBadge priority={rec.priority} />
        <h4>{rec.title}</h4>
      </CardHeader>
      
      <CardBody>
        <p>{rec.description}</p>
        
        <ActionList>
          <h5>Recommended Actions:</h5>
          <ul>
            {rec.actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </ActionList>
      </CardBody>
    </RecommendationCard>
  ))}
  
  {strategy.recommendations.length === 0 && (
    <EmptyState>
      <Icon>📊</Icon>
      <p>No specific recommendations at this time. Your keyword performance looks good!</p>
    </EmptyState>
  )}
</StrategyRecommendations>
```

---

## 🔄 VI. DATA FLOW DIAGRAM

```
User Input (Keyword + Filters)
        ↓
KeywordOverviewService.getKeywordOverview()
        ↓
┌───────────────────────────────────────┐
│   PARALLEL API CALLS (Promise.all)   │
├───────────────────────────────────────┤
│ 1. GoogleAdsService                   │
│    └─ generateKeywordIdeas()          │
│                                       │
│ 2. GSCService                         │
│    └─ getQueriesForKeyword()          │
│       (check if keyword exists)       │
│                                       │
│ 3. SerperService                      │
│    └─ getSERPResults()                │
└───────────────────────────────────────┘
        ↓
   isExistingKeyword?
        ↓
    Yes ──────────→ Additional GSC Calls
        │           ├─ getPagesForQuery()
        │           ├─ getQueriesForKeyword("contains")
        │           └─ getGlobalVolumeByCountry()
        ↓
   Aggregation & Calculation
        ├─ buildMetricsOverview()
        ├─ buildKeywordVariations()
        ├─ buildGSCSummary()
        ├─ buildSERPAnalysis()
        └─ buildStrategyRecommendations()
        ↓
   Return Complete Data Object
        ↓
   Component Rendering
        ├─ MetricsOverview
        ├─ KeywordIdeasSection
        ├─ GSCPerformanceSection (conditional)
        ├─ SERPAnalysisSection
        └─ StrategyRecommendations
```

---

## 📊 VII. CALCULATION FORMULAS

### 1. Tỉ trọng Keyword (Keyword Share)
```
Keyword Share = (Keyword Clicks / Total Clicks for All Related Queries) × 100%

Example:
- "optibac tím" clicks: 450
- Total clicks (all queries containing "optibac tím"): 680
- Share = 450 / 680 × 100 = 66.18%
```

### 2. Tỉ trọng Trang (Page Share)
```
Page Share = (Page Clicks / Total Clicks for Keyword) × 100%

Example:
- URL A clicks: 320
- Total clicks for "optibac tím": 450
- Share = 320 / 450 × 100 = 71.11%
```

### 3. Click-to-Volume Ratio
```
CTR Ratio = (GSC Clicks / Google Ads Volume) × 100%

Example:
- GSC clicks (30 days): 450
- Google Ads volume (monthly): 9900
- Ratio = 450 / 9900 × 100 = 4.55%

Interpretation:
- <5%: Low market share
- 5-15%: Average market share
- >15%: Strong market share
```

### 4. Opportunity Score
```
Opportunity Score = (Impressions / 100) × (1 - CTR) × Position Penalty

Position Penalty:
- Position 1-3: 0.2
- Position 4-10: 0.5
- Position 11-20: 1.0
- Position >20: 0.8

Example:
- Impressions: 4400
- CTR: 0.102 (10.2%)
- Position: 5.2 (penalty = 0.5)
- Score = (4400 / 100) × (1 - 0.102) × 0.5
- Score = 44 × 0.898 × 0.5 = 19.76

High score (>60) = high optimization opportunity
```

### 5. Competitive Density
```
Competitive Density = Unique Domains in Top 10 / 10

Example:
- 9 unique domains in top 10
- Density = 9 / 10 = 0.9

Interpretation:
- 0.8-1.0: High diversity (hard to rank)
- 0.5-0.7: Moderate (some sites have multiple rankings)
- <0.5: Low diversity (dominated by few sites)
```

### 6. Keyword Difficulty (from Google Ads API)
```
Based on competitionIndex (0-100):
- 0-30: Easy (Green)
- 31-60: Medium (Orange)
- 61-100: Hard (Red)

competitionIndex is calculated by Google based on:
- Number of advertisers bidding
- Bid amounts
- Historical competition
```

---

## 🎨 VIII. COLOR CODING & UI CONVENTIONS

### Priority Badges
- **High Priority**: Red background, white text
- **Medium Priority**: Orange background, white text
- **Low Priority**: Gray background, dark text

### Metric Status
- **Good Performance**: Green (✅)
  - CTR > 5%
  - Position < 5
  - Share > 50%
  
- **Average Performance**: Orange (⚠️)
  - CTR 2-5%
  - Position 5-10
  - Share 20-50%
  
- **Poor Performance**: Red (❌)
  - CTR < 2%
  - Position > 10
  - Share < 20%

### Keyword Difficulty
- **Easy (0-30)**: 🟢 Green
- **Medium (31-60)**: 🟠 Orange
- **Hard (61-100)**: 🔴 Red

### URL Highlighting
- **Your URLs**: Blue background, bold text
- **Competitors**: Default styling
- **Primary Landing Page**: Star icon ⭐

---

## 🔧 IX. CONFIGURATION & CONSTANTS

**File:** `/config/keywordOverview.config.js`

```javascript
export const KEYWORD_OVERVIEW_CONFIG = {
  // Google Ads API
  GOOGLE_ADS: {
    CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID,
    GEO_TARGETS: {
      VIETNAM: "geoTargetConstants/2704",
      USA: "geoTargetConstants/2840",
      // ...
    },
    LANGUAGES: {
      VIETNAMESE: "languageConstants/1040",
      ENGLISH: "languageConstants/1000",
      // ...
    },
    NETWORK: "GOOGLE_SEARCH_AND_PARTNERS"
  },
  
  // GSC API
  GSC: {
    SITE_URL: "https://nhathuocvietnhat.vn/",
    SEARCH_TYPE: "web",
    ROW_LIMIT: 25000,
    DEFAULT_DATE_RANGES: {
      LAST_7_DAYS: 7,
      LAST_28_DAYS: 28,
      LAST_90_DAYS: 90
    }
  },
  
  // Serper API
  SERPER: {
    API_KEY: process.env.SERPER_API_KEY,
    DEFAULT_COUNTRY: "vn",
    DEFAULT_LANGUAGE: "vi",
    NUM_RESULTS: 10
  },
  
  // UI Thresholds
  THRESHOLDS: {
    DIFFICULTY: {
      EASY: 30,
      MEDIUM: 60,
      HARD: 100
    },
    CTR: {
      GOOD: 0.05,
      AVERAGE: 0.02,
      POOR: 0.01
    },
    POSITION: {
      EXCELLENT: 3,
      GOOD: 5,
      AVERAGE: 10,
      POOR: 20
    },
    SHARE: {
      DOMINANT: 50,
      STRONG: 20,
      WEAK: 5
    },
    OPPORTUNITY_SCORE: {
      HIGH: 60,
      MEDIUM: 30,
      LOW: 0
    }
  }
};
```

---

## ✅ X. IMPLEMENTATION CHECKLIST

### Phase 1: Setup & Infrastructure
- [ ] Setup Google Ads API credentials
- [ ] Setup GSC API with Service Account
- [ ] Setup Serper.dev API key
- [ ] Create service layer structure
- [ ] Create configuration file
- [ ] Setup error handling & logging

### Phase 2: Core Services
- [ ] Implement GoogleAdsService
  - [ ] generateKeywordIdeas()
  - [ ] getKeywordHistoricalMetrics()
  - [ ] Helper functions (difficulty, volume format, CPC)
- [ ] Implement GSCService
  - [ ] getQueriesForKeyword() with pagination
  - [ ] getPagesForQuery()
  - [ ] getGlobalVolumeByCountry()
  - [ ] Calculation functions (share, cannibalization, opportunity)
- [ ] Implement SerperService
  - [ ] getSERPResults()
  - [ ] Analysis functions (density, features, rankings)

### Phase 3: Integration Layer
- [ ] Implement KeywordOverviewService
  - [ ] Main orchestrator function
  - [ ] Data aggregation logic
  - [ ] Build functions for each section
  - [ ] Strategy recommendations engine

### Phase 4: Frontend Components
- [ ] KeywordOverviewHeader (input form)
- [ ] MetricsOverview (grid of metric cards)
- [ ] KeywordIdeasSection (variations table)
- [ ] GSCPerformanceSection (conditional rendering)
  - [ ] Summary cards
  - [ ] Related queries table
  - [ ] Landing pages table
  - [ ] Global volume chart
- [ ] SERPAnalysisSection
  - [ ] SERP table
  - [ ] Your rankings highlight
  - [ ] Competitor analysis
- [ ] StrategyRecommendations (dynamic cards)

### Phase 5: Data Visualization
- [ ] Trend chart (monthly search volumes)
- [ ] Global volume bar chart
- [ ] Progress bars for share percentages
- [ ] Sparklines for quick trends

### Phase 6: UX Enhancements
- [ ] Loading states for each section
- [ ] Error handling & retry logic
- [ ] Empty states for missing data
- [ ] Tooltips for metrics explanation
- [ ] Export to PDF/CSV functionality
- [ ] Keyword comparison mode (multiple keywords)

### Phase 7: Testing & Optimization
- [ ] Unit tests for calculation functions
- [ ] Integration tests for API services
- [ ] E2E tests for user workflows
- [ ] Performance optimization (caching, lazy loading)
- [ ] Mobile responsive design

---

## 🚀 XI. USAGE EXAMPLE

```javascript
// Example: Analyze keyword "optibac tím"
const keywordOverviewService = new KeywordOverviewService();

const result = await keywordOverviewService.getKeywordOverview({
  keyword: "optibac tím",
  location: "2704", // Vietnam
  language: "1040", // Vietnamese
  dateRange: {
    startDate: "2025-09-11",
    endDate: "2025-10-11"
  },
  userDomain: "nhathuocvietnhat.vn"
});

// Result structure:
{
  keyword: "optibac tím",
  isNew: false,
  metrics: {
    volume: 9900,
    globalVolume: {...},
    difficulty: {score: 22, label: "Easy", color: "green"},
    intent: "Informational",
    trend: [...],
    cpc: 0.01,
    competitiveDensity: 0.92
  },
  keywordVariations: [{keyword: "...", volume: ..., kd: ...}, ...],
  gscPerformance: {
    summary: {clicks: 450, impressions: 4400, ctr: 0.102, position: 5.2},
    relatedQueries: [...],
    landingPages: [...],
    globalVolume: [...]
  },
  serpAnalysis: {
    results: [...],
    yourRankings: [...],
    competitiveDensity: 0.92,
    serpFeatures: ["People Also Ask", "Related Searches"],
    topCompetitors: [...]
  },
  strategy: {
    recommendations: [
      {
        type: "optimization",
        priority: "high",
        title: "Low CTR Despite Good Position",
        description: "...",
        actions: [...]
      }
    ]
  }
}
```

---

## 📈 XII. SUCCESS METRICS

Sau khi implement, đo lường success bằng:

1. **Data Completeness**: % keywords có đủ dữ liệu từ 3 sources
2. **Accuracy**: So sánh metrics với UI tools (GSC, Keyword Planner)
3. **Performance**: Thời gian load < 5 seconds
4. **Actionability**: % recommendations được user thực hiện
5. **User Adoption**: Số lượng keywords được analyze mỗi ngày

---

**Kết luận**: Đây là một kiến trúc hoàn chỉnh để xây dựng trang "Keyword Overview" với đầy đủ insight từ 3 nguồn API.
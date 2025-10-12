# KEYWORD OVERVIEW - TASK LIST IMPLEMENTATION

## 📊 DỮ LIỆU GIẢ ĐỊNH

### Data từ Google Ads API (131 keywords)
- Total Volume: 8,100 searches/month cho "optibac tím"
- Competition Index: 98 (HIGH)
- CPC Range: 93.24₫ - 4,473.53₫
- 131 keyword variations với metrics đầy đủ

### Data từ SerpAPI
- Top 9 organic results
- Related Searches: 8 queries
- Inline Images: 9 results
- Rich Snippets: Prices, ratings, reviews
- SERP Features: Inline images, related searches (NO PAA, NO featured snippet)

---

## 🎯 GIAI ĐOẠN 1: DATA COLLECTION & UI DISPLAY

### TASK 1.1: Setup Project Structure

```markdown
**Goal:** Tạo structure cho Keyword Overview page

**Files to create:**
```
/src/pages/keyword-overview/
├── index.jsx                          # Main page
├── components/
│   ├── KeywordIntelligence.jsx       # Section 1
│   ├── SearchIntentAnalysis.jsx      # Section 2
│   ├── KeywordClusters.jsx           # Section 3
│   ├── ContentGaps.jsx               # Section 4
│   ├── GSCPerformance.jsx            # Section 5 (conditional)
│   ├── SERPLandscape.jsx             # Section 6
│   └── KeywordStrategy.jsx           # Section 7 (LLM output)
├── services/
│   ├── googleAdsService.js           # Google Ads API calls
│   ├── gscService.js                 # GSC API calls
│   ├── serpApiService.js             # SerpAPI calls
│   └── llmService.js                 # LLM analysis calls
└── utils/
    ├── dataProcessing.js             # Data transformation helpers
    └── calculations.js               # Metrics calculations
```

**Acceptance Criteria:**
- ✅ Folder structure created
- ✅ All component files initialized
- ✅ Service files with skeleton functions
```

---

### TASK 1.2: Implement Google Ads Data Fetching

```markdown
**Goal:** Fetch và display keyword ideas từ Google Ads API

**File:** `/src/services/googleAdsService.js`

**Function to implement:**
```javascript
async function fetchKeywordIdeas(seedKeyword, location, language) {
  // API Call
  const response = await fetch('/api/google-ads/keyword-ideas', {
    method: 'POST',
    body: JSON.stringify({
      keywordSeed: { keywords: [seedKeyword] },
      geoTargetConstants: [location],
      language: language,
      pageSize: 1000
    })
  });
  
  return response.json();
}
```

**Data to extract từ response:**
- `meta`: totalResults, requestedAt, mode
- `keywords`: seed keyword
- `rows[]`: 131 keywords with:
  - keyword (text)
  - avgMonthlySearches
  - competition (HIGH/MEDIUM/LOW)
  - competitionIndex (0-100)
  - lowTopBid, highTopBid

**UI Component:** `KeywordIntelligence.jsx`

**Display structure:**
```jsx
<KeywordIntelligence>
  <MetricsGrid>
    <VolumeCard value="8,100" source="Google Ads" />
    <DifficultyCard value="98%" label="Very Hard" color="red" />
    <CPCCard value="₫93 - ₫4,474" />
    <CompetitionCard value="HIGH" />
  </MetricsGrid>
  
  <TrendChart data={monthlySearchVolumes} />
  
  <KeywordVariationsTable>
    {/* Show top 10 keywords with volume > 100 */}
    <Row keyword="men optibac tím" volume="260" difficulty="95" />
    <Row keyword="men phụ khoa optibac" volume="210" difficulty="100" />
    <Row keyword="optibac phụ khoa" volume="210" difficulty="95" />
    {/* ... */}
  </KeywordVariationsTable>
  
  <Button>View all 131 keywords</Button>
</KeywordIntelligence>
```

**Acceptance Criteria:**
- ✅ API call returns 131 keywords
- ✅ Metrics displayed correctly
- ✅ Table shows sortable data
- ✅ "View all" expands full list
```

---

### TASK 1.3: Implement SerpAPI Data Fetching

```markdown
**Goal:** Fetch và display SERP data từ SerpAPI

**File:** `/src/services/serpApiService.js`

**Function to implement:**
```javascript
async function fetchSerpData(keyword, location, language) {
  const response = await fetch('/api/serp/search', {
    method: 'POST',
    body: JSON.stringify({
      engine: "google",
      q: keyword,
      location: location,
      hl: language,
      gl: "vn",
      num: 10
    })
  });
  
  return response.json();
}
```

**Data to extract từ response:**

1. **organic_results[]**: 9 results
   - position (1-9)
   - title
   - link
   - displayed_link
   - snippet
   - source
   - rich_snippet (price, rating, reviews)

2. **related_searches[]**: 8 queries
   - query
   - link

3. **inline_images[]**: 9 images
   - source
   - thumbnail

4. **SERP Features present:**
   - ✅ inline_images
   - ✅ related_searches
   - ❌ related_questions (PAA) - KHÔNG CÓ
   - ❌ shopping_results - KHÔNG CÓ
   - ❌ knowledge_graph - KHÔNG CÓ

**UI Component:** `SERPLandscape.jsx`

**Display structure:**
```jsx
<SERPLandscape>
  <SERPFeaturesSummary>
    <Feature present={true}>Related Searches (8)</Feature>
    <Feature present={true}>Image Pack (9 images)</Feature>
    <Feature present={false}>People Also Ask</Feature>
    <Feature present={false}>Shopping Results</Feature>
    <Feature present={false}>Featured Snippet</Feature>
  </SERPFeaturesSummary>
  
  <TopCompetitorsTable>
    {/* Position 1 */}
    <CompetitorRow 
      position={1}
      domain="nhathuoclongchau.com.vn"
      title="Viên uống Optibac Probiotics tím 90 viên..."
      contentType="Product Page"
      richSnippet={{
        price: "990,000₫",
        rating: 5.0,
        reviews: 18
      }}
      features={["Price", "Rating", "Reviews"]}
    />
    
    {/* Position 2 */}
    <CompetitorRow 
      position={2}
      domain="nhathuoclongchau.com.vn"
      contentType="Product Page"
      richSnippet={{
        price: "450,000₫",
        rating: 5.0,
        reviews: 64
      }}
    />
    
    {/* Position 3 - YOUR SITE */}
    <CompetitorRow 
      position={3}
      domain="nhathuocvietnhat.vn"
      title="[Giải Đáp] Optibac Tím Uống Bao Lâu..."
      contentType="Blog Post"
      isYours={true}
      highlight="Your Ranking"
    />
    
    {/* ... positions 4-9 */}
  </TopCompetitorsTable>
  
  <RelatedSearchesSection>
    <Query>Optibac tím Nhà thuốc Long Châu</Query>
    <Query>Optibac tím có tác dụng gì</Query>
    <Query>Optibac tím uống trong bao lâu thì ngưng</Query>
    {/* ... 8 total */}
  </RelatedSearchesSection>
</SERPLandscape>
```

**Acceptance Criteria:**
- ✅ API returns top 9 organic results
- ✅ Rich snippets displayed (price, rating)
- ✅ Your site highlighted (position 3)
- ✅ Related searches shown
- ✅ SERP features accurately detected
```

---

### TASK 1.4: Implement GSC Data Fetching (Optional)

```markdown
**Goal:** Fetch GSC performance data nếu có

**File:** `/src/services/gscService.js`

**Functions to implement:**

1. **Check if keyword exists:**
```javascript
async function checkKeywordExists(keyword, siteUrl, dateRange) {
  const response = await fetch('/api/gsc/search-analytics', {
    method: 'POST',
    body: JSON.stringify({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      dimensions: ["query"],
      dimensionFilterGroups: [{
        filters: [{
          dimension: "query",
          operator: "equals",
          expression: keyword
        }]
      }],
      rowLimit: 1
    })
  });
  
  const data = await response.json();
  return data.rows && data.rows.length > 0;
}
```

2. **Get performance data:**
```javascript
async function getQueryPerformance(keyword, siteUrl, dateRange) {
  // Similar structure, returns clicks, impressions, ctr, position
}

async function getPages(keyword, siteUrl, dateRange) {
  // Returns landing pages for this keyword
}
```

**UI Component:** `GSCPerformance.jsx`

**Display logic:**
```jsx
{gscData.exists ? (
  <GSCPerformance>
    <SummaryCards>
      <MetricCard label="Clicks" value={gscData.clicks} />
      <MetricCard label="Impressions" value={gscData.impressions} />
      <MetricCard label="CTR" value={gscData.ctr + "%"} />
      <MetricCard label="Avg Position" value={gscData.position} />
    </SummaryCards>
    
    <LandingPagesTable>
      {gscData.pages.map(page => (
        <Row url={page.url} clicks={page.clicks} position={page.position} />
      ))}
    </LandingPagesTable>
  </GSCPerformance>
) : (
  <EmptyState>
    <Icon>🆕</Icon>
    <Title>New Keyword</Title>
    <Description>
      No GSC data found. This is a new keyword opportunity.
    </Description>
  </EmptyState>
)}
```

**Acceptance Criteria:**
- ✅ Check returns true/false for keyword existence
- ✅ If exists, fetch full performance data
- ✅ If not exists, show "New Keyword" state
- ✅ Conditional rendering works
```

---

### TASK 1.5: Display Raw Data Sections

```markdown
**Goal:** Hiển thị tất cả raw data sections (1-6) trước khi chạy AI

**Components to complete:**

1. **KeywordIntelligence.jsx** (TASK 1.2)
2. **SERPLandscape.jsx** (TASK 1.3)
3. **GSCPerformance.jsx** (TASK 1.4)
4. **KeywordVariationsTable** - component riêng

**KeywordVariationsTable structure:**
```jsx
<KeywordVariationsTable>
  <TableHeader>
    <th>Keyword</th>
    <th>Volume</th>
    <th>Difficulty</th>
    <th>Competition</th>
    <th>CPC Range</th>
  </TableHeader>
  <TableBody>
    {keywords
      .filter(kw => kw.avgMonthlySearches > 0)
      .sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches)
      .map(kw => (
        <Row key={kw.keyword}>
          <td>{kw.keyword}</td>
          <td>{formatNumber(kw.avgMonthlySearches)}</td>
          <td>
            <DifficultyBadge 
              value={kw.competitionIndex}
              label={getDifficultyLabel(kw.competitionIndex)}
            />
          </td>
          <td>{kw.competition}</td>
          <td>{formatCPC(kw.lowTopBid, kw.highTopBid)}</td>
        </Row>
      ))
    }
  </TableBody>
</KeywordVariationsTable>
```

**Helper functions:**
```javascript
function getDifficultyLabel(competitionIndex) {
  if (competitionIndex >= 80) return { label: "Very Hard", color: "red" };
  if (competitionIndex >= 60) return { label: "Hard", color: "orange" };
  if (competitionIndex >= 40) return { label: "Medium", color: "yellow" };
  if (competitionIndex >= 20) return { label: "Easy", color: "green" };
  return { label: "Very Easy", color: "darkgreen" };
}

function formatNumber(num) {
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatCPC(low, high) {
  if (!low || !high) return "N/A";
  return `₫${Math.round(low)} - ₫${Math.round(high)}`;
}
```

**Page Layout:**
```jsx
<KeywordOverviewPage>
  <PageHeader>
    <h1>Keyword Overview: "optibac tím"</h1>
    <Breadcrumb>Home › SEO › Keyword Overview</Breadcrumb>
  </PageHeader>
  
  {/* SECTION 1: Keyword Intelligence */}
  <Section id="intelligence">
    <SectionTitle>📊 Keyword Intelligence</SectionTitle>
    <KeywordIntelligence data={googleAdsData} />
  </Section>
  
  {/* SECTION 2: SERP Landscape */}
  <Section id="serp">
    <SectionTitle>🔍 SERP Landscape</SectionTitle>
    <SERPLandscape data={serpData} />
  </Section>
  
  {/* SECTION 3: GSC Performance (conditional) */}
  {gscData && (
    <Section id="gsc">
      <SectionTitle>📈 Your Performance</SectionTitle>
      <GSCPerformance data={gscData} />
    </Section>
  )}
  
  {/* Loading indicator for AI processing */}
  {isProcessing && (
    <Section id="processing">
      <LoadingState>
        <Spinner />
        <Text>Analyzing keyword data...</Text>
        <Progress value={progress} max={100} />
      </LoadingState>
    </Section>
  )}
  
  {/* SECTIONS 4-7 will appear after AI processing */}
</KeywordOverviewPage>
```

**Acceptance Criteria:**
- ✅ All sections 1-6 display correctly
- ✅ Data from APIs properly mapped
- ✅ Loading states work
- ✅ Conditional rendering for GSC works
- ✅ UI matches design specs
```

---

## 🤖 GIAI ĐOẠN 2: AI ANALYSIS & STRATEGY GENERATION

### TASK 2.1: Implement Keyword Clustering (AI)

```markdown
**Goal:** Group 131 keywords thành semantic clusters

**File:** `/src/services/llmService.js`

**Function:** `analyzeKeywordClusters()`

**Input data:**
```javascript
{
  "seedKeyword": "optibac tím",
  "allKeywords": [
    {"keyword": "optibac tím", "avgMonthlySearches": 8100, "competitionIndex": 98},
    {"keyword": "men optibac tím", "avgMonthlySearches": 260, "competitionIndex": 95},
    {"keyword": "men phụ khoa optibac", "avgMonthlySearches": 210, "competitionIndex": 100},
    {"keyword": "optibac phụ khoa", "avgMonthlySearches": 210, "competitionIndex": 95},
    {"keyword": "thuốc optibac tím", "avgMonthlySearches": 210, "competitionIndex": 76},
    {"keyword": "optibac tím pharmacity", "avgMonthlySearches": 210, "competitionIndex": 100},
    {"keyword": "optibac 90 viên", "avgMonthlySearches": 210, "competitionIndex": 95},
    {"keyword": "optibac tím 90 viên", "avgMonthlySearches": 260, "competitionIndex": 100},
    {"keyword": "optibac tím hướng dẫn sử dụng", "avgMonthlySearches": 260, "competitionIndex": 91},
    {"keyword": "uống optibac tím có tác dụng phụ không", "avgMonthlySearches": 260, "competitionIndex": 36},
    {"keyword": "uống optibac tím ra nhiều dịch", "avgMonthlySearches": 260, "competitionIndex": 48},
    {"keyword": "viên uống phụ khoa optibac", "avgMonthlySearches": 140, "competitionIndex": 99},
    {"keyword": "cách uống optibac tím", "avgMonthlySearches": 140, "competitionIndex": 84},
    // ... 131 total
  ],
  "relatedSearches": [
    "Optibac tím Nhà thuốc Long Châu",
    "Optibac tím có tác dụng gì",
    "Optibac tím uống trong bao lâu thì ngưng",
    "Optibac tím hướng dẫn sử dụng",
    "Optibac tím 90 viên Long Châu",
    "Optibac có tác dụng gì",
    "Optibac tím 90 viên mẫu mới",
    "Optibac tím Pharmacity"
  ]
}
```

**LLM Prompt:**
```
Phân tích danh sách 131 keywords về "optibac tím" và nhóm chúng thành clusters dựa trên semantic similarity và search intent.

DỮ LIỆU KEYWORDS:
[131 keywords với volume và difficulty]

RELATED SEARCHES TỪ GOOGLE:
[8 related searches]

YÊU CẦU:
1. Tạo 6-8 clusters với tên ngắn gọn
2. Mỗi cluster gồm keywords có ý nghĩa/intent tương tự
3. Xác định intent cho mỗi cluster (informational/commercial/transactional)
4. Tính total volume và avg difficulty cho mỗi cluster
5. Đề xuất content type phù hợp

OUTPUT JSON:
{
  "clusters": [
    {
      "id": "cluster_1",
      "name": "Product Information & Brand Variations",
      "intent": "informational",
      "keywords": [
        {"text": "optibac tím", "volume": 8100, "difficulty": 98},
        {"text": "men optibac tím", "volume": 260, "difficulty": 95},
        {"text": "men phụ khoa optibac", "volume": 210, "difficulty": 100},
        {"text": "optibac phụ khoa", "volume": 210, "difficulty": 95},
        {"text": "thuốc optibac tím", "volume": 210, "difficulty": 76}
      ],
      "totalVolume": 8990,
      "avgDifficulty": 92.8,
      "suggestedContentType": "Product Overview / Ultimate Guide",
      "reasoning": "Keywords về tên sản phẩm, brand variations, general product info"
    },
    {
      "id": "cluster_2",
      "name": "Usage Instructions & Dosage",
      "intent": "informational",
      "keywords": [
        {"text": "cách uống optibac tím", "volume": 140, "difficulty": 84},
        {"text": "optibac tím hướng dẫn sử dụng", "volume": 260, "difficulty": 91},
        {"text": "hướng dẫn sử dụng optibac tím", "volume": 20, "difficulty": 86},
        {"text": "cách dùng optibac tím", "volume": 70, "difficulty": 78},
        {"text": "liều dùng optibac tím", "volume": 20, "difficulty": 90},
        {"text": "optibac tím uống lúc nào", "volume": 70, "difficulty": 100}
      ],
      "totalVolume": 580,
      "avgDifficulty": 88.2,
      "suggestedContentType": "How-to Guide / Tutorial",
      "reasoning": "Keywords về cách sử dụng, liều lượng, thời điểm uống"
    },
    {
      "id": "cluster_3",
      "name": "Side Effects & Safety",
      "intent": "informational",
      "keywords": [
        {"text": "uống optibac tím có tác dụng phụ không", "volume": 260, "difficulty": 36},
        {"text": "optibac tím có tác dụng phụ không", "volume": 10, "difficulty": 73},
        {"text": "uống optibac tím ra nhiều dịch", "volume": 260, "difficulty": 48},
        {"text": "uống optibac tím bị ngứa", "volume": 90, "difficulty": 30},
        {"text": "tác dụng phụ của optibac tím", "volume": 20, "difficulty": 22},
        {"text": "optibac tím bầu uống được không", "volume": 50, "difficulty": 90}
      ],
      "totalVolume": 690,
      "avgDifficulty": 49.8,
      "suggestedContentType": "FAQ / Safety Guide",
      "reasoning": "Keywords về tác dụng phụ, an toàn, lo ngại khi sử dụng"
    },
    {
      "id": "cluster_4",
      "name": "Purchasing & Pricing",
      "intent": "transactional",
      "keywords": [
        {"text": "optibac tím pharmacity", "volume": 210, "difficulty": 100},
        {"text": "optibac 90 viên", "volume": 210, "difficulty": 95},
        {"text": "optibac tím 90 viên", "volume": 260, "difficulty": 100},
        {"text": "optibac tím 30 viên", "volume": 90, "difficulty": 94},
        {"text": "giá optibac tím", "volume": 50, "difficulty": 87},
        {"text": "optibac tím giá bao nhiều", "volume": 70, "difficulty": 94},
        {"text": "mua optibac tím", "volume": 10, "difficulty": 100}
      ],
      "totalVolume": 900,
      "avgDifficulty": 95.7,
      "suggestedContentType": "Product Page / Pricing Page",
      "reasoning": "Keywords về mua bán, giá cả, nơi bán, số lượng viên"
    },
    {
      "id": "cluster_5",
      "name": "Benefits & Effects",
      "intent": "informational",
      "keywords": [
        {"text": "công dụng optibac tím", "volume": 90, "difficulty": 90},
        {"text": "công dụng của optibac tím", "volume": 90, "difficulty": 92},
        {"text": "tác dụng của optibac tím", "volume": 90, "difficulty": 96},
        {"text": "optibac tím có tốt không", "volume": 70, "difficulty": 95},
        {"text": "optibac tím có dùng được cho bà bầu không", "volume": 90, "difficulty": 89}
      ],
      "totalVolume": 430,
      "avgDifficulty": 92.4,
      "suggestedContentType": "Benefits Article / Product Review",
      "reasoning": "Keywords về công dụng, hiệu quả, đánh giá sản phẩm"
    },
    {
      "id": "cluster_6",
      "name": "Product Authenticity",
      "intent": "informational",
      "keywords": [
        {"text": "optibac tím thật giả", "volume": 20, "difficulty": 100},
        {"text": "phân biệt optibac tím thật và giả", "volume": 10, "difficulty": 29},
        {"text": "cách phân biệt optibac tím thật và giá", "volume": 10, "difficulty": 80},
        {"text": "optibac tím chính hãng", "volume": 10, "difficulty": 100},
        {"text": "optibac tím hàng thật", "volume": 10, "difficulty": 100}
      ],
      "totalVolume": 60,
      "avgDifficulty": 81.8,
      "suggestedContentType": "Authentication Guide",
      "reasoning": "Keywords về phân biệt thật giả, hàng chính hãng"
    }
  ],
  "summary": {
    "totalClusters": 6,
    "totalKeywords": 131,
    "totalVolume": 11650,
    "avgDifficulty": 84.3,
    "intentDistribution": {
      "informational": 4,
      "transactional": 1,
      "commercial": 1
    }
  }
}
```

**UI Component:** `KeywordClusters.jsx`

**Display:**
```jsx
<KeywordClusters>
  <ClusterSummary>
    <Stat label="Total Clusters" value={6} />
    <Stat label="Total Volume" value="11,650/mo" />
    <Stat label="Avg Difficulty" value="84%" />
  </ClusterSummary>
  
  <ClusterGrid>
    {clusters.map(cluster => (
      <ClusterCard key={cluster.id}>
        <ClusterHeader>
          <ClusterName>{cluster.name}</ClusterName>
          <IntentBadge intent={cluster.intent} />
        </ClusterHeader>
        
        <ClusterMetrics>
          <Metric label="Keywords" value={cluster.keywords.length} />
          <Metric label="Volume" value={formatNumber(cluster.totalVolume)} />
          <Metric label="Difficulty" value={cluster.avgDifficulty + "%"} />
        </ClusterMetrics>
        
        <ContentType>{cluster.suggestedContentType}</ContentType>
        
        <ExpandButton onClick={() => showClusterDetails(cluster.id)}>
          View {cluster.keywords.length} keywords
        </ExpandButton>
      </ClusterCard>
    ))}
  </ClusterGrid>
</KeywordClusters>
```

**Acceptance Criteria:**
- ✅ LLM returns 6-8 semantic clusters
- ✅ Keywords properly grouped by intent
- ✅ Metrics calculated correctly
- ✅ Content type suggestions relevant
- ✅ UI displays cluster cards
```

---

### TASK 2.2: Implement Search Intent Analysis (AI)

```markdown
**Goal:** Phân tích intent dựa trên SERP top 9 URLs

**Function:** `analyzeSearchIntent()`

**Input data:**
```javascript
{
  "keyword": "optibac tím",
  "organicResults": [
    {
      "position": 1,
      "domain": "nhathuoclongchau.com.vn",
      "title": "Viên uống Optibac Probiotics tím 90 viên bổ sung lợi khuẩn",
      "url": "https://nhathuoclongchau.com.vn/thuc-pham-chuc-nang/optibac-for-women-90-v.html",
      "snippet": "Cách dùng. Uống 1 viên ngày cùng bữa ăn sáng...",
      "richSnippet": {
        "price": "990.000 ₫",
        "rating": 5.0,
        "reviews": 18
      }
    },
    {
      "position": 2,
      "domain": "nhathuoclongchau.com.vn",
      "title": "Thực phẩm bảo vệ sức khỏe Optibac For Women",
      "richSnippet": {
        "price": "450.000 ₫",
        "rating": 5.0,
        "reviews": 64
      }
    },
    {
      "position": 3,
      "domain": "nhathuocvietnhat.vn",
      "title": "[Giải Đáp] Optibac Tím Uống Bao Lâu Thì Ngưng?",
      "url": "https://nhathuocvietnhat.vn/blogs/..."
    },
    {
      "position": 4,
      "domain": "suristore.vn",
      "title": "Men vi sinh Optibac Anh tím phụ khoa",
      "url": "https://suristore.vn/products/optibac-tim-30-vien"
    },
    {
      "position": 5,
      "domain": "chiaki.vn",
      "title": "Men vi sinh Optibac tím có tốt không? Mua ở đâu chính hãng",
      "url": "https://chiaki.vn/tin-tuc/...",
      "richSnippet": {
        "rating": 5.0,
        "reviews": 2
      }
    },
    {
      "position": 6,
      "domain": "hangucthomdang.com",
      "title": "Men vi sinh Optibac probiotics cho phụ nữ lọ 90 viên"
    },
    {
      "position": 7,
      "domain": "pharmacity.vn",
      "title": "Viên uống OPTIBAC Intimate Flora For Women bổ sung lợi...",
      "richSnippet": {
        "price": "450.000 ₫",
        "rating": 4.4,
        "reviews": 82677
      }
    },
    {
      "position": 8,
      "domain": "shopee.vn",
      "title": "Optibac Tím - Men Vi Sinh Bổ Sung Lợi Khuẩn...",
      "richSnippet": {
        "rating": 5.0,
        "reviews": 13950
      }
    },
    {
      "position": 9,
      "domain": "medlatec.vn",
      "title": "Optibac tím có dùng được cho bà bầu không: giải đáp chi tiết"
    }
  ],
  "serpFeatures": {
    "inline_images": true,
    "related_searches": true,
    "people_also_ask": false,
    "shopping_results": false,
    "knowledge_graph": false
  }
}
```

**LLM Prompt:**
```
Phân tích search intent cho keyword "optibac tím" dựa trên top 9 URLs trong SERP.

TOP 9 URLS VÀ METADATA:
[9 organic results with domains, titles, snippets, rich snippets]

SERP FEATURES PRESENT:
- ✅ Inline Images (9)
- ✅ Related Searches (8)
- ❌ People Also Ask
- ❌ Shopping Results
- ❌ Knowledge Graph

YÊU CẦU PHÂN TÍCH:
1. Đếm số URLs thuộc từng loại content:
   - E-commerce/Product pages (có price, rating, "mua", "bán")
   - Blog/Information (tin-tuc, blogs, giải đáp)
   - Comparison/Review pages
   
2. Xác định primary intent dựa trên tỉ lệ URL types

3. Phân tích SERP features impact

4. Đề xuất content strategy

OUTPUT JSON:
{
  "intentAnalysis": {
    "primaryIntent": "mixed_commercial_informational",
    "confidence": 0.85,
    "breakdown": {
      "ecommerce_product_urls": 6,
      "blog_information_urls": 3,
      "comparison_review_urls": 0
    },
    "percentage": {
      "transactional": 67,
      "informational": 33,
      "commercial": 0
    },
    "reasoning": "6/9 URLs là trang bán hàng (nhathuoclongchau, suristore, pharmacity, shopee, hangucthomdang) với price và rating. 3/9 URLs là blog/tin tức (nhathuocvietnhat, chiaki, medlatec) giải đáp thông tin."
  },
  "serpFeaturesImpact": {
    "inline_images_present": {
      "impact": "medium",
      "note": "Hình ảnh sản phẩm xuất hiện nhiều, người dùng có thể click vào image trước"
    },
    "related_searches_present": {
      "impact": "low",
      "note": "8 related searches ở cuối trang, ít ảnh hưởng đến CTR"
    },
    "no_paa": {
      "impact": "positive",
      "opportunity": "Cơ hội tốt để tối ưu vị trí organic, không bị PAA chiếm chỗ"
    },
    "no_shopping_results": {
      "impact": "positive",
      "opportunity": "Không có shopping carousel, organic results nhận full attention"
    }
  },
  "contentStrategyRecommendation": {
    "primary": "Product Page with Rich Information",
    "reasoning": "SERP cho thấy users muốn cả thông tin chi tiết VÀ option mua hàng. Nên tạo product page với đầy đủ specs, benefits, usage, FAQs VÀ giá/mua ngay.",
    "contentElements": [
      "Product specifications & ingredients",
      "Pricing and package options (30v vs 90v)",
      "User reviews & ratings (critical - 6/9 URLs có ratings)",
      "Usage instructions & dosage",
      "Benefits & effects section",
      "FAQ section (substitute for missing PAA)",
      "Clear CTA buttons (Mua ngay, Thêm vào giỏ)"
    ],
    "secondaryContent": [
      "Blog post: Usage guide chi tiết",
      "Blog post: Safety & side effects FAQ",
      "Blog post: Comparison với alternatives"
    ]
  },
  "competitiveInsights": {
    "dominantPlayers": [
      "nhathuoclongchau.com.vn (2 positions in top 9)",
      "E-commerce platforms (shopee, pharmacity)"
    ],
    "yourPosition": {
      "position": 3,
      "url": "nhathuocvietnhat.vn/blogs/...",
      "contentType": "Blog/Information",
      "opportunity": "Bạn đang rank với blog content, nhưng SERP dominated by product pages. Cần thêm product page để compete tốt hơn."
    }
  }
}
```

**UI Component:** `SearchIntentAnalysis.jsx`

**Display:**
```jsx
<SearchIntentAnalysis>
  <IntentBreakdown>
    <Title>Search Intent Analysis</Title>
    <IntentChart type="pie">
      <Slice value={67} label="Transactional" color="green" />
      <Slice value={33} label="Informational" color="blue" />
    </IntentChart>
    
    <IntentDetails>
      <DetailRow>
        <Label>E-commerce/Product Pages</Label>
        <Value>6/9 (67%)</Value>
        <Domains>
          nhathuoclongchau (2x), pharmacity, shopee, suristore, hangucthomdang
        </Domains>
      </DetailRow>
      <DetailRow>
        <Label>Blog/Information Pages</Label>
        <Value>3/9 (33%)</Value>
        <Domains>nhathuocvietnhat, chiaki, medlatec</Domains>
      </DetailRow>
    </IntentDetails>
  </IntentBreakdown>
  
  <SERPFeatures>
    <Title>SERP Features Impact</Title>
    <FeatureCard present={true} impact="medium">
      <Icon>🖼️</Icon>
      <Name>Inline Images (9)</Name>
      <Impact>Users có thể click vào images trước organic results</Impact>
    </FeatureCard>
    
    <FeatureCard present={false} impact="positive">
      <Icon>❓</Icon>
      <Name>People Also Ask</Name>
      <Opportunity>
        ✅ Không có PAA = Organic results chiếm nhiều real estate hơn
      </Opportunity>
    </FeatureCard>
    
    <FeatureCard present={false} impact="positive">
      <Icon>🛍️</Icon>
      <Name>Shopping Results</Name>
      <Opportunity>
        ✅ Không có shopping carousel = CTR vào organic cao hơn
      </Opportunity>
    </FeatureCard>
  </SERPFeatures>
  
  <ContentStrategy>
    <Title>💡 Recommended Content Strategy</Title>
    <StrategyCard priority="high">
      <StrategyType>Product Page with Rich Content</StrategyType>
      <Reasoning>
        SERP shows 67% product pages with prices/ratings. Users want 
        BOTH detailed information AND purchasing options.
      </Reasoning>
      <RequiredElements>
        <Element>✅ Product specs & ingredients</Element>
        <Element>✅ Pricing (30v vs 90v options)</Element>
        <Element>✅ User reviews & star ratings</Element>
        <Element>✅ Usage instructions</Element>
        <Element>✅ FAQ section (substitute for PAA)</Element>
        <Element>✅ Clear CTAs (Mua ngay)</Element>
      </RequiredElements>
    </StrategyCard>
    
    <StrategyCard priority="medium">
      <StrategyType>Supporting Blog Content</StrategyType>
      <SuggestedTopics>
        <Topic>Usage Guide chi tiết</Topic>
        <Topic>Safety & Side Effects FAQ</Topic>
        <Topic>Comparison với alternatives</Topic>
      </SuggestedTopics>
    </StrategyCard>
  </ContentStrategy>
  
  <YourPosition>
    <Alert type="warning">
      <Title>Your Current Position</Title>
      <Content>
        You rank #3 with blog content, but SERP is dominated by 
        product pages (67%). Consider creating a product page to 
        compete more effectively.
      </Content>
    </Alert>
  </YourPosition>
</SearchIntentAnalysis>
```

**Acceptance Criteria:**
- ✅ URL types accurately classified
- ✅ Intent percentages calculated correctly
- ✅ SERP features impact analyzed
- ✅ Content strategy aligns with SERP
- ✅ UI displays insights clearly
```

---

### TASK 2.3: Implement Content Gap Analysis (AI)

```markdown
**Goal:** Identify gaps dựa trên clusters + GSC + SERP

**Function:** `identifyContentGaps()`

**Input data:**
```javascript
{
  "clusters": [...], // From TASK 2.1
  "gscData": {
    "exists": true, // or false
    "yourDomain": "nhathuocvietnhat.vn",
    "rankings": [
      {
        "query": "optibac tím",
        "position": 3, // From SERP position
        "clicks": null, // Would be from GSC if available
        "impressions": null
      }
    ]
  },
  "serpCompetitors": [...], // Top 9 from SERP
  "totalMarketVolume": 11650 // Total từ all clusters
}
```

**LLM Prompt:**
```
Xác định content gaps cho "optibac tím" dựa trên clusters, your performance, và competitors.

KEYWORD CLUSTERS:
[6 clusters with keywords, volume, difficulty]

YOUR CURRENT PRESENCE:
- Domain: nhathuocvietnhat.vn
- Position: #3 in SERP
- URL: https://nhathuocvietnhat.vn/blogs/giai-dap-thong-tin-san-pham/optibac-tim-uong-bao-lau-thi-ngung
- Content Type: Blog (Usage Guide)
- GSC Data: Not available (new tracking)

COMPETITORS IN TOP 9:
- #1, #2: nhathuoclongchau.com.vn (Product pages)
- #4: suristore.vn (Product)
- #5: chiaki.vn (Review/Info)
- #6: hangucthomdang.com (Product)
- #7: pharmacity.vn (Product)
- #8: shopee.vn (E-commerce)
- #9: medlatec.vn (Blog/Info)

PHÂN TÍCH:
1. Clusters nào bạn có content (dựa trên URL title)
2. Clusters nào bạn thiếu hoàn toàn
3. Clusters nào competitors mạnh mà bạn yếu
4. Opportunities dựa trên low difficulty + high volume

OUTPUT JSON:
{
  "gapAnalysis": {
    "coveredClusters": [
      {
        "clusterId": "cluster_2",
        "clusterName": "Usage Instructions & Dosage",
        "yourContent": "Blog: Optibac Tím Uống Bao Lâu Thì Ngưng",
        "currentPosition": 3,
        "status": "partial_coverage",
        "gap": "Content focuses on duration, lacks detailed step-by-step usage guide",
        "recommendation": "Expand content to cover all usage aspects"
      }
    ],
    "missingClusters": [
      {
        "clusterId": "cluster_1",
        "clusterName": "Product Information & Brand Variations",
        "totalVolume": 8990,
        "avgDifficulty": 92.8,
        "competitorCoverage": 6,
        "priority": "critical",
        "reasoning": "Highest volume cluster (8990/mo), 6/9 competitors have product pages, you have NONE",
        "expectedTraffic": "~2000-3000/mo if ranking in top 3"
      },
      {
        "clusterId": "cluster_3",
        "clusterName": "Side Effects & Safety",
        "totalVolume": 690,
        "avgDifficulty": 49.8,
        "competitorCoverage": 1,
        "priority": "high",
        "reasoning": "LOW difficulty (49.8%), high intent, medlatec là competitor duy nhất, gap opportunity"
      },
      {
        "clusterId": "cluster_4",
        "clusterName": "Purchasing & Pricing",
        "totalVolume": 900,
        "avgDifficulty": 95.7,
        "competitorCoverage": 8,
        "priority": "high",
        "reasoning": "Transactional intent, cần product page với pricing"
      },
      {
        "clusterId": "cluster_5",
        "clusterName": "Benefits & Effects",
        "totalVolume": 430,
        "avgDifficulty": 92.4,
        "competitorCoverage": 2,
        "priority": "medium"
      },
      {
        "clusterId": "cluster_6",
        "clusterName": "Product Authenticity",
        "totalVolume": 60,
        "avgDifficulty": 81.8,
        "competitorCoverage": 0,
        "priority": "low",
        "reasoning": "Low volume, no competitors, nice-to-have content"
      }
    ],
    "summary": {
      "totalClusters": 6,
      "covered": 1,
      "partialCoverage": 1,
      "missing": 4,
      "criticalGaps": 1,
      "totalOpportunityVolume": 10080
    }
  },
  "priorityGaps": [
    {
      "rank": 1,
      "gap": "Missing Product Page",
      "cluster": "Product Information & Brand Variations",
      "volume": 8990,
      "difficulty": 92.8,
      "priority": "critical",
      "reasoning": "67% SERP là product pages, you only have blog. Product page is MUST HAVE.",
      "actionable": {
        "action": "create",
        "contentType": "Product Page",
        "title": "Optibac Tím (For Women) - Men Vi Sinh Cho Phụ Nữ | Chính Hãng Anh Quốc",
        "targetKeywords": [
          "optibac tím",
          "men optibac tím",
          "men phụ khoa optibac",
          "thuốc optibac tím"
        ],
        "requiredSections": [
          "Product overview & images",
          "Pricing (30v vs 90v options)",
          "Ingredients & specifications",
          "Benefits & how it works",
          "User reviews section",
          "Usage instructions (brief)",
          "FAQ section",
          "Buy now / Add to cart CTAs"
        ],
        "estimatedEffort": "8-12 hours",
        "estimatedTraffic": "2,000-3,000 visits/month trong 3-6 tháng",
        "estimatedConversions": "40-60 conversions/month (2% CVR)"
      }
    },
    {
      "rank": 2,
      "gap": "Missing Safety & Side Effects Content",
      "cluster": "Side Effects & Safety",
      "volume": 690,
      "difficulty": 49.8,
      "priority": "high",
      "reasoning": "LOW difficulty, only 1 competitor, high user concern (tác dụng phụ)",
      "actionable": {
        "action": "create",
        "contentType": "FAQ Guide",
        "title": "Optibac Tím Có Tác Dụng Phụ Không? Uống Có An Toàn?",
        "targetKeywords": [
          "uống optibac tím có tác dụng phụ không",
          "uống optibac tím ra nhiều dịch",
          "uống optibac tím bị ngứa",
          "tác dụng phụ của optibac tím"
        ],
        "estimatedEffort": "4-6 hours",
        "estimatedTraffic": "400-600 visits/month"
      }
    },
    {
      "rank": 3,
      "gap": "Missing Benefits & Review Content",
      "cluster": "Benefits & Effects",
      "volume": 430,
      "difficulty": 92.4,
      "priority": "medium",
      "actionable": {
        "action": "create",
        "contentType": "Review Article",
        "title": "Optibac Tím Có Tốt Không? Review Chi Tiết Từ Chuyên Gia & Người Dùng",
        "targetKeywords": [
          "optibac tím có tốt không",
          "công dụng optibac tím",
          "tác dụng của optibac tím"
        ],
        "estimatedEffort": "6-8 hours",
        "estimatedTraffic": "300-400 visits/month"
      }
    }
  ],
  "quickWins": [
    {
      "action": "Expand existing blog post",
      "currentUrl": "https://nhathuocvietnhat.vn/blogs/.../optibac-tim-uong-bao-lau-thi-ngung",
      "addKeywords": [
        "cách uống optibac tím",
        "liều dùng optibac tím",
        "optibac tím uống lúc nào"
      ],
      "addSections": [
        "Step-by-step usage guide with images",
        "Best time to take (morning/evening)",
        "What to expect week by week",
        "When to stop taking"
      ],
      "estimatedEffort": "2-3 hours",
      "estimatedImpact": "Position 3 → Position 1-2, +100-150 clicks/mo"
    }
  ]
}
```

**UI Component:** `ContentGaps.jsx`

**Display:**
```jsx
<ContentGaps>
  <GapSummary>
    <SummaryCard type="critical">
      <Number>1</Number>
      <Label>Critical Gap</Label>
      <Description>Product Page Missing</Description>
    </SummaryCard>
    
    <SummaryCard type="high">
      <Number>2</Number>
      <Label>High Priority</Label>
    </SummaryCard>
    
    <SummaryCard type="opportunity">
      <Number>10,080</Number>
      <Label>Monthly Traffic Potential</Label>
    </SummaryCard>
  </GapSummary>
  
  <PriorityGapsList>
    {priorityGaps.map((gap, index) => (
      <GapCard key={index} priority={gap.priority}>
        <GapHeader>
          <Rank>#{gap.rank}</Rank>
          <GapTitle>{gap.gap}</GapTitle>
          <PriorityBadge priority={gap.priority} />
        </GapHeader>
        
        <GapMetrics>
          <Metric>
            <Icon>📊</Icon>
            <Value>{formatNumber(gap.volume)}</Value>
            <Label>Monthly Volume</Label>
          </Metric>
          <Metric>
            <Icon>⚡</Icon>
            <Value>{gap.difficulty}%</Value>
            <Label>Difficulty</Label>
          </Metric>
        </GapMetrics>
        
        <GapReasoning>{gap.reasoning}</GapReasoning>
        
        <ActionPlan>
          <PlanHeader>📝 Action Plan</PlanHeader>
          <PlanDetails>
            <Detail>
              <Label>Action:</Label>
              <Value>{gap.actionable.action}</Value>
            </Detail>
            <Detail>
              <Label>Content Type:</Label>
              <Value>{gap.actionable.contentType}</Value>
            </Detail>
            <Detail>
              <Label>Suggested Title:</Label>
              <Value>{gap.actionable.title}</Value>
            </Detail>
            <Detail>
              <Label>Target Keywords:</Label>
              <KeywordList>
                {gap.actionable.targetKeywords.map(kw => (
                  <KeywordChip>{kw}</KeywordChip>
                ))}
              </KeywordList>
            </Detail>
            {gap.actionable.requiredSections && (
              <Detail>
                <Label>Required Sections:</Label>
                <SectionList>
                  {gap.actionable.requiredSections.map(section => (
                    <li>{section}</li>
                  ))}
                </SectionList>
              </Detail>
            )}
          </PlanDetails>
          
          <PlanOutcome>
            <OutcomeLabel>Expected Outcomes:</OutcomeLabel>
            <Outcome>⏱️ Effort: {gap.actionable.estimatedEffort}</Outcome>
            <Outcome>📈 Traffic: {gap.actionable.estimatedTraffic}</Outcome>
            {gap.actionable.estimatedConversions && (
              <Outcome>💰 Conversions: {gap.actionable.estimatedConversions}</Outcome>
            )}
          </PlanOutcome>
        </ActionPlan>
        
        <ActionButtons>
          <Button variant="primary" onClick={() => generateContentBrief(gap)}>
            Generate Content Brief
          </Button>
          <Button variant="secondary" onClick={() => assignToWriter(gap)}>
            Assign to Writer
          </Button>
        </ActionButtons>
      </GapCard>
    ))}
  </PriorityGapsList>
  
  <QuickWinsSection>
    <SectionTitle>⚡ Quick Wins (Optimize Existing)</SectionTitle>
    {quickWins.map(qw => (
      <QuickWinCard>
        <Action>{qw.action}</Action>
        <CurrentUrl>{qw.currentUrl}</CurrentUrl>
        <Improvements>
          <h4>Add Keywords:</h4>
          {qw.addKeywords.map(kw => <KeywordChip>{kw}</KeywordChip>)}
          <h4>Add Sections:</h4>
          <ul>
            {qw.addSections.map(section => <li>{section}</li>)}
          </ul>
        </Improvements>
        <Impact>
          ⏱️ {qw.estimatedEffort} | 📈 {qw.estimatedImpact}
        </Impact>
        <Button onClick={() => optimizeExisting(qw)}>
          Start Optimization
        </Button>
      </QuickWinCard>
    ))}
  </QuickWinsSection>
</ContentGaps>
```

**Acceptance Criteria:**
- ✅ Gaps identified based on clusters
- ✅ Priority ranking clear and justified
- ✅ Action plans specific and actionable
- ✅ Effort/outcome estimates realistic
- ✅ Quick wins vs new content separated
- ✅ UI provides clear next steps
```

---

### TASK 2.4: Generate Final Keyword Strategy (LLM)

```markdown
**Goal:** Tạo comprehensive strategy từ TẤT CẢ data collected

**Function:** `generateKeywordStrategy()`

**Input data:**
```javascript
{
  "context": {
    "seedKeyword": "optibac tím",
    "businessDomain": "nhathuocvietnhat.vn",
    "dateAnalyzed": "2025-10-11"
  },
  
  "googleAdsData": {
    "totalKeywords": 131,
    "totalVolume": 11650,
    "mainKeywordVolume": 8100,
    "mainKeywordDifficulty": 98,
    "mainKeywordCPC": "₫93 - ₫4,474"
  },
  
  "serpData": {
    "yourPosition": 3,
    "yourUrl": "https://nhathuocvietnhat.vn/blogs/giai-dap-thong-tin-san-pham/optibac-tim-uong-bao-lau-thi-ngung",
    "yourContentType": "Blog",
    "top9Competitors": [...],
    "serpFeatures": {...},
    "relatedSearches": [...]
  },
  
  "aiAnalysis": {
    "clusters": [...], // 6 clusters from TASK 2.1
    "intentAnalysis": {...}, // From TASK 2.2
    "contentGaps": {...} // From TASK 2.3
  },
  
  "gscData": {
    "exists": false,
    "note": "New tracking, no historical data"
  }
}
```

**LLM Prompt:**
```
Bạn là SEO strategist chuyên nghiệp. Dựa trên DỮ LIỆU THỰC TẾ dưới đây, hãy tạo KEYWORD STRATEGY toàn diện cho "optibac tím".

=== DỮ LIỆU ===

GOOGLE ADS DATA:
- 131 keywords total
- Main keyword "optibac tím": 8,100 volume/month, 98% difficulty, HIGH competition
- CPC: ₫93 - ₫4,474
- Total market volume: 11,650/month

SERP DATA:
- Your position: #3 (blog content)
- SERP dominated by product pages (67%)
- Top competitors: nhathuoclongchau (2 positions), pharmacity, shopee
- NO PAA, NO shopping carousel = good CTR potential
- Related searches: 8 queries

KEYWORD CLUSTERS (AI Analysis):
1. Product Information (8,990 vol, 92.8% diff) - MISSING
2. Usage Instructions (580 vol, 88.2% diff) - PARTIAL (you have #3)
3. Side Effects & Safety (690 vol, 49.8% diff) - MISSING
4. Purchasing & Pricing (900 vol, 95.7% diff) - MISSING
5. Benefits & Effects (430 vol, 92.4% diff) - MISSING
6. Product Authenticity (60 vol, 81.8% diff) - MISSING

INTENT ANALYSIS:
- 67% Transactional (product pages)
- 33% Informational (blogs)
- Primary recommendation: Product Page + Supporting Blogs

CONTENT GAPS:
- Critical: Product Page missing (8,990 volume opportunity)
- High: Safety & Side Effects content (690 volume, LOW difficulty)
- High: Purchasing/Pricing page
- Quick Win: Expand existing blog (#3 position)

GSC DATA: None yet (new tracking)

=== YÊU CẦU OUTPUT ===

Tạo KEYWORD STRATEGY với 7 phần:

1. **EXECUTIVE SUMMARY**
2. **CLUSTER STRATEGY & PRIORITY**
3. **CONTENT ROADMAP (90 ngày)**
4. **COMPETITIVE POSITIONING**
5. **QUICK WINS (Next 7 days)**
6. **EXPECTED OUTCOMES**
7. **KPIs TO TRACK**

OUTPUT FORMAT: JSON with detailed structure
```

**Expected LLM Output:**

```json
{
  "executiveSummary": {
    "keywordStatus": "existing_with_gaps",
    "currentSituation": {
      "position": 3,
      "contentType": "Blog (Usage Guide)",
      "strength": "Ranking well for informational intent",
      "weakness": "Missing product page while SERP dominated by e-commerce (67%)"
    },
    "opportunityScore": 85,
    "totalTrafficPotential": "~6,000-8,000 visits/month",
    "criticalInsight": "You rank #3 with blog but losing massive traffic to competitors' product pages. Need product page URGENTLY + expand blog coverage.",
    "topPriority": "Create comprehensive product page to capture 67% transactional traffic",
    "timeline": "3-6 months to see full results"
  },
  
  "clusterStrategy": {
    "pillarContent": {
      "recommended": true,
      "type": "Product Page",
      "title": "Optibac Tím (For Women) - Men Vi Sinh Cho Phụ Nữ Chính Hãng Anh Quốc",
      "url": "/products/optibac-tim-for-women",
      "targetClusters": [
        "Product Information",
        "Purchasing & Pricing"
      ],
      "targetKeywords": [
        "optibac tím (8100 vol)",
        "men optibac tím (260 vol)",
        "men phụ khoa optibac (210 vol)",
        "optibac phụ khoa (210 vol)",
        "thuốc optibac tím (210 vol)",
        "optibac tím 90 viên (260 vol)",
        "optibac tím pharmacity (210 vol)"
      ],
      "totalVolumeTarget": 9460,
      "estimatedTraffic": "3,000-4,500 visits/month sau 6 tháng",
      "requiredElements": [
        "Hero section with product images (multiple angles)",
        "Pricing section (30 viên vs 90 viên comparison)",
        "Product specs & ingredients table",
        "Benefits section (6-8 key benefits)",
        "How it works (mechanism of action)",
        "Usage instructions (brief, link to full guide)",
        "Customer reviews section (integrate ratings)",
        "FAQ accordion (top 10 questions)",
        "Related products carousel",
        "Strong CTAs (Mua ngay, Thêm vào giỏ)",
        "Trust badges (Chính hãng, Giao nhanh, Đổi trả 30 ngày)"
      ],
      "seoOptimizations": [
        "Schema markup: Product, AggregateRating, Offer",
        "Title: Optibac Tím 90 Viên - Men Vi Sinh Phụ Khoa For Women | Giá Tốt",
        "Meta description: focus on benefits + price + fast shipping",
        "H1: match target keyword exactly",
        "Image alt texts: descriptive with keyword variations",
        "Internal links: từ blog posts về product page"
      ]
    },
    
    "supportingContent": [
      {
        "clusterId": "cluster_2",
        "clusterName": "Usage Instructions",
        "status": "expand_existing",
        "currentContent": {
          "url": "/blogs/.../optibac-tim-uong-bao-lau-thi-ngung",
          "position": 3,
          "contentType": "Blog"
        },
        "action": "Optimize & Expand",
        "addKeywords": [
          "cách uống optibac tím (140 vol)",
          "liều dùng optibac tím (20 vol)",
          "optibac tím uống lúc nào (70 vol)",
          "hướng dẫn sử dụng optibac tím (20 vol)"
        ],
        "addSections": [
          "Visual step-by-step guide with images",
          "Best time to take (morning vs evening)",
          "With food or empty stomach?",
          "Storage instructions",
          "Week-by-week progress timeline",
          "When to stop / how to cycle off"
        ],
        "estimatedImpact": "Position 3 → 1-2, +150-200 visits/month",
        "effort": "3-4 hours",
        "priority": "high"
      },
      {
        "clusterId": "cluster_3",
        "clusterName": "Side Effects & Safety",
        "status": "create_new",
        "contentType": "FAQ Blog Post",
        "title": "Optibac Tím Có Tác Dụng Phụ Không? An Toàn & Lưu Ý Khi Sử Dụng",
        "url": "/blogs/optibac-tim-tac-dung-phu",
        "targetKeywords": [
          "uống optibac tím có tác dụng phụ không (260 vol)",
          "uống optibac tím ra nhiều dịch (260 vol)",
          "uống optibac tím bị ngứa (90 vol)",
          "tác dụng phụ của optibac tím (20 vol)",
          "optibac tím bầu uống được không (50 vol)"
        ],
        "totalVolumeTarget": 680,
        "difficulty": 49.8,
        "estimatedTraffic": "400-600 visits/month",
        "priority": "high",
        "reasoning": "LOW difficulty (49.8%) + high user concern = quick win"
      },
      {
        "clusterId": "cluster_5",
        "clusterName": "Benefits & Effects",
        "status": "create_new",
        "contentType": "Review Article",
        "title": "Optibac Tím Có Tốt Không? Review Từ Chuyên Gia & 500+ Người Dùng",
        "url": "/blogs/optibac-tim-co-tot-khong-review",
        "targetKeywords": [
          "optibac tím có tốt không (70 vol)",
          "công dụng optibac tím (90 vol)",
          "tác dụng của optibac tím (90 vol)",
          "review optibac tím (30 vol)"
        ],
        "totalVolumeTarget": 280,
        "priority": "medium"
      },
      {
        "clusterId": "cluster_6",
        "clusterName": "Product Authenticity",
        "status": "create_new",
        "contentType": "Short Guide",
        "title": "Cách Phân Biệt Optibac Tím Thật Giả - 5 Dấu Hiệu Nhận Biết",
        "priority": "low",
        "reasoning": "Low volume (60), nice-to-have content"
      }
    ]
  },
  
  "contentRoadmap": {
    "week_1_4": {
      "theme": "Critical Foundation",
      "goals": [
        "Launch product page",
        "Optimize existing blog to #1",
        "Establish basic content structure"
      ],
      "content": [
        {
          "week": 1,
          "priority": "critical",
          "title": "Create Product Page",
          "type": "Product Page",
          "targetCluster": "Product Information + Purchasing",
          "estimatedEffort": "12-16 hours (design + content + dev)",
          "expectedImpact": "Foundation for 67% of traffic opportunity",
          "tasks": [
            "Product photography (multiple angles)",
            "Write all product copy",
            "Implement schema markup",
            "Setup review system",
            "Configure pricing (30v vs 90v)",
            "Add to cart functionality",
            "Internal linking from blog"
          ]
        },
        {
          "week": 2,
          "priority": "high",
          "title": "Optimize Existing Usage Blog",
          "type": "Content Optimization",
          "currentUrl": "/blogs/.../optibac-tim-uong-bao-lau-thi-ngung",
          "estimatedEffort": "3-4 hours",
          "expectedImpact": "Position 3 → 1-2, +150 visits/month",
          "tasks": [
            "Add missing keywords to content",
            "Create visual usage guide with images",
            "Add 'Best time to take' section",
            "Add storage instructions",
            "Improve title/meta",
            "Add internal links to product page"
          ]
        },
        {
          "week": 3,
          "priority": "high",
          "title": "Create Safety & Side Effects Guide",
          "type": "FAQ Blog Post",
          "url": "/blogs/optibac-tim-tac-dung-phu",
          "targetVolume": 680,
          "difficulty": 49.8,
          "estimatedEffort": "6-8 hours",
          "expectedImpact": "+400-600 visits/month",
          "reasoning": "LOW difficulty, HIGH concern topic = quick win"
        },
        {
          "week": 4,
          "priority": "medium",
          "title": "Internal Linking Audit",
          "type": "Technical SEO",
          "estimatedEffort": "2-3 hours",
          "tasks": [
            "Link all blog posts → product page",
            "Link product page → relevant blogs",
            "Ensure proper anchor text distribution",
            "Fix any broken links"
          ]
        }
      ],
      "milestones": [
        "✅ Product page live by end of Week 1",
        "✅ Existing blog optimized by end of Week 2",
        "✅ Safety guide published by end of Week 3",
        "✅ Internal linking structure solid by end of Week 4"
      ]
    },
    
    "week_5_8": {
      "theme": "Content Expansion",
      "goals": [
        "Cover all major clusters",
        "Build topical authority",
        "Capture informational traffic"
      ],
      "content": [
        {
          "week": 5,
          "title": "Create Benefits & Review Article",
          "type": "Review Article",
          "targetVolume": 280,
          "estimatedEffort": "8-10 hours"
        },
        {
          "week": 6,
          "title": "Create Authenticity Guide",
          "type": "Short Guide",
          "targetVolume": 60,
          "estimatedEffort": "4-5 hours"
        },
        {
          "week": 7,
          "title": "Product Page Optimization Round 1",
          "type": "Optimization",
          "tasks": [
            "Add user reviews",
            "A/B test product descriptions",
            "Optimize images for speed",
            "Add more FAQ questions"
          ]
        },
        {
          "week": 8,
          "title": "Content Performance Analysis",
          "type": "Analytics Review",
          "tasks": [
            "Review GSC data (should have data by now)",
            "Identify underperforming content",
            "Plan optimization priorities for Month 3"
          ]
        }
      ]
    },
    
    "week_9_12": {
      "theme": "Optimization & Scale",
      "goals": [
        "Optimize based on performance data",
        "Scale what works",
        "Fine-tune conversions"
      ],
      "content": [
        {
          "week": 9,
          "title": "Optimize Low-Performing Content",
          "based_on": "Week 8 analysis"
        },
        {
          "week": 10,
          "title": "Create Comparison Content (if needed)",
          "type": "Comparison Article",
          "reasoning": "Based on competitor analysis and user questions"
        },
        {
          "week": 11,
          "title": "Product Page Optimization Round 2",
          "focus": "Conversion rate optimization"
        },
        {
          "week": 12,
          "title": "Strategy Review & Plan Month 4-6",
          "deliverable": "Updated strategy based on 3-month results"
        }
      ]
    }
  },
  
  "competitivePositioning": {
    "yourCurrentState": {
      "position": 3,
      "contentType": "Blog",
      "strength": "Good informational content",
      "weakness": "No product page to capture transactional intent"
    },
    
    "topCompetitors": [
      {
        "rank": "1-2",
        "domain": "nhathuoclongchau.com.vn",
        "strengths": [
          "2 positions in top 9",
          "Rich snippets (price + ratings)",
          "1000+ reviews",
          "Strong brand recognition"
        ],
        "weaknesses": [
          "Generic product descriptions",
          "Lacking detailed usage guides",
          "No comparison content"
        ]
      },
      {
        "rank": "7",
        "domain": "pharmacity.vn",
        "strengths": [
          "82,677 reviews (massive social proof)",
          "Fast shipping",
          "Strong e-commerce platform"
        ]
      },
      {
        "rank": "8",
        "domain": "shopee.vn",
        "strengths": [
          "13,950 reviews",
          "Lowest prices",
          "Platform trust"
        ]
      }
    ],
    
    "differentiationStrategy": {
      "approach": "Educational E-commerce Hybrid",
      "keyDifferentiators": [
        "Comprehensive educational content (blogs)",
        "Medical/expert credibility",
        "Detailed product information",
        "Responsive customer support",
        "Authentic user reviews with verification"
      ],
      "uniqueValueProposition": "Chúng tôi không chỉ bán sản phẩm - chúng tôi giáo dục khách hàng về cách sử dụng đúng và an toàn",
      "contentEdge": [
        "Safety & side effects guide (competitors don't have)",
        "Week-by-week progress expectations",
        "Expert Q&A section",
        "Authentic usage stories"
      ]
    },
    
    "competitiveAdvantages": [
      "Strong blog presence (#3 position)",
      "Can combine product + education seamlessly",
      "Lower competition on informational queries",
      "Opportunity to own 'safety & side effects' niche"
    ],
    
    "threats": [
      "Big pharmacy chains have more reviews",
      "E-commerce platforms have pricing advantages",
      "Established trust and brand recognition"
    ],
    
    "strategyToWin": "Focus on EDUCATION first to build trust, then convert on PRODUCT page. Link blog readers to product naturally. Own the 'safe usage expert' positioning."
  },
  
  "quickWins": {
    "next_7_days": [
      {
        "day": "1-2",
        "action": "Optimize Existing Blog Title & Meta",
        "currentTitle": "[Giải Đáp] Optibac Tím Uống Bao Lâu Thì Ngưng?",
        "newTitle": "Optibac Tím Uống Bao Lâu? Hướng Dẫn Chi Tiết Liều Dùng & Thời Gian",
        "impact": "Better CTR, more keyword coverage",
        "effort": "30 minutes"
      },
      {
        "day": "2-3",
        "action": "Add FAQ Schema to Existing Blog",
        "impact": "Potential rich snippet in SERP",
        "effort": "1 hour"
      },
      {
        "day": "3-5",
        "action": "Add 'Best Time to Take' Section to Blog",
        "keywords": ["optibac tím uống lúc nào", "nên uống optibac tím vào lúc nào"],
        "impact": "+70 volume coverage",
        "effort": "2 hours"
      },
      {
        "day": "5-7",
        "action": "Internal Linking: Blog → Future Product Page",
        "implementation": "Add contextual links with CTA: 'Xem thông tin sản phẩm và giá'",
        "impact": "Prepare for product page launch",
        "effort": "1 hour"
      }
    ]
  },
  
  "expectedOutcomes": {
    "trafficProjection": {
      "current": "~300-500 visits/month (estimated based on #3 position)",
      "month_3": "~2,000-3,000 visits/month (+500% growth)",
      "breakdown_month_3": {
        "product_page": "1,200-1,800 visits",
        "usage_blog_optimized": "400-600 visits",
        "safety_guide": "400-600 visits"
      },
      "month_6": "~4,500-6,000 visits/month (+1100% growth)",
      "month_12": "~6,000-8,000 visits/month (+1500% growth)"
    },
    
    "rankingImprovements": {
      "current_top10_keywords": "Estimated 3-5 keywords",
      "month_3": "15-20 keywords in top 10",
      "month_6": "30-40 keywords in top 10",
      "month_12": "50-60 keywords in top 10",
      "targetPosition_mainKeyword": "Position 3 → Position 1-2 (product page)"
    },
    
    "clusterCoverage": {
      "current": "17% (1/6 clusters covered)",
      "month_3": "67% (4/6 clusters covered)",
      "month_6": "83% (5/6 clusters covered)",
      "month_12": "100% (6/6 clusters covered)"
    },
    
    "conversionProjection": {
      "assumedCVR": "2% (e-commerce average for health products)",
      "month_3": "40-60 conversions/month",
      "month_6": "90-120 conversions/month",
      "month_12": "120-160 conversions/month"
    },
    
    "revenueImpact": {
      "avgOrderValue": "₫700,000 (assuming mix of 30v and 90v)",
      "month_3": "₫28-42M revenue/month from SEO traffic",
      "month_6": "₫63-84M revenue/month",
      "month_12": "₫84-112M revenue/month"
    },
    
    "confidence": "75%",
    "assumptions": [
      "Product page launched by Week 1",
      "All content created on schedule",
      "No major algorithm updates",
      "Competition remains similar",
      "GSC data validates traffic estimates",
      "Conversion rate matches industry average"
    ],
    
    "risks": [
      "Competitors may improve their content",
      "New competitors may enter SERP",
      "Google algorithm changes",
      "Product availability issues"
    ]
  },
  
  "kpisToTrack": {
    "organic_metrics": [
      {
        "metric": "Organic Traffic",
        "source": "Google Analytics",
        "current": "300-500/month (estimated)",
        "target_30d": "800-1,200/month",
        "target_90d": "2,000-3,000/month",
        "target_180d": "4,500-6,000/month"
      },
      {
        "metric": "Keywords in Top 10",
        "source": "GSC / Rank Tracker",
        "current": "3-5",
        "target_30d": "8-12",
        "target_90d": "15-20",
        "target_180d": "30-40"
      },
      {
        "metric": "Main Keyword Position",
        "source": "GSC",
        "current": "Position 3",
        "target_30d": "Position 3 (stable)",
        "target_90d": "Position 1-2",
        "target_180d": "Position 1"
      },
      {
        "metric": "Cluster Coverage",
        "source": "Manual tracking",
        "current": "17% (1/6)",
        "target_30d": "50% (3/6)",
        "target_90d": "67% (4/6)",
        "target_180d": "83% (5/6)"
      }
    ],
    
    "engagement_metrics": [
      {
        "metric": "Avg Session Duration",
        "target": ">2 minutes",
        "why": "Indicates content quality and engagement"
      },
      {
        "metric": "Bounce Rate",
        "target": "<60%",
        "why": "Shows content relevance"
      },
      {
        "metric": "Pages per Session",
        "target": ">1.5",
        "why": "Internal linking effectiveness"
      }
    ],
    
    "conversion_metrics": [
      {
        "metric": "E-commerce Conversion Rate",
        "target": "2-3%",
        "why": "Benchmark for health products"
      },
      {
        "metric": "Add to Cart Rate",
        "target": "5-8%",
        "why": "Product page effectiveness"
      },
      {
        "metric": "Revenue from Organic",
        "target_90d": "₫28-42M/month",
        "target_180d": "₫63-84M/month"
      }
    ],
    
    "tracking_cadence": {
      "daily": ["Traffic", "Rankings for main keyword"],
      "weekly": ["All keyword positions", "Conversion rate"],
      "monthly": ["Full strategy review", "Content performance analysis"]
    }
  }
}
```

**UI Component:** `KeywordStrategy.jsx`

**Display:** [Same as previous comprehensive design with all sections]

**Acceptance Criteria:**
- ✅ Strategy based on ALL collected data
- ✅ Recommendations specific and actionable
- ✅ Timeline realistic (90 days)
- ✅ Metrics and KPIs clear
- ✅ Roadmap executable
- ✅ UI displays full strategy
- ✅ Export to PDF/CSV works
```

---

## ✅ SUMMARY: IMPLEMENTATION CHECKLIST

### Giai đoạn 1: Data Collection (Tasks 1.1-1.5)
- [ ] Project structure created
- [ ] Google Ads API integration
- [ ] SerpAPI integration
- [ ] GSC API integration (conditional)
- [ ] All UI sections display raw data
- [ ] Loading states work
- [ ] Error handling implemented

### Giai đoạn 2: AI Analysis (Tasks 2.1-2.4)
- [ ] Keyword clustering (LLM)
- [ ] Search intent analysis (LLM)
- [ ] Content gap analysis (LLM)
- [ ] Final strategy generation (LLM)
- [ ] All AI outputs display correctly
- [ ] Strategy export functionality

### Testing & Validation
- [ ] Test with real keyword: "optibac tím"
- [ ] Verify all API calls return expected data
- [ ] Validate LLM outputs are actionable
- [ ] UI matches design specifications
- [ ] Mobile responsive
- [ ] Performance optimized

### Documentation
- [ ] API documentation
- [ ] Component documentation
- [ ] User guide for Keyword Overview
- [ ] Strategy interpretation guide

---
# Content Optimizer - Integration Guide

## ✅ Completed Features

### 1. Core Utilities (client/src/lib/content-optimizer-utils.ts)
- ✅ SEO scoring algorithm
- ✅ Readability analysis for Vietnamese
- ✅ Keyword density calculation
- ✅ Image alt text checking
- ✅ Sentence length analysis
- ✅ Helper functions (stripHTML, highlightKeywords, getExcerpt)

### 2. Component State Setup
- ✅ SEOAnalysis and ReadabilityAnalysis states added
- ✅ Show/hide toggles for tips sections
- ✅ Import statements ready

## 🔨 Next Integration Steps

### Step 1: Update `handleGetImprovementIdeas` Function

Replace the current mock implementation with real analysis:

```typescript
const handleGetImprovementIdeas = async () => {
  if (targetKeywords.length === 0) {
    toast({
      title: "Thiếu từ khóa",
      description: "Vui lòng thêm ít nhất một từ khóa mục tiêu",
      variant: "destructive",
    });
    return;
  }

  if (!toolId) return;

  setIsAnalyzing(true);

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Run SEO analysis
  const seoResult = analyzeSEO(
    content,
    h1Title,
    titleTag,
    metaDescription,
    targetKeywords
  );
  setSeoAnalysis(seoResult);

  // Run Readability analysis
  const readabilityResult = analyzeReadability(content);
  setReadabilityAnalysis(readabilityResult);

  // Update scores
  setScores({
    seo: seoResult.score,
    readability: readabilityResult.score,
    toneOfVoice: 100, // Placeholder - implement later
  });

  // Combine all recommendations
  const allTips: OptimizationTip[] = [];

  // Add SEO recommendations
  seoResult.recommendations.forEach((rec) => {
    const severity = rec.includes('H1') || rec.includes('title') ? 'high' :
                     rec.includes('meta') ? 'medium' : 'low';
    allTips.push({
      type: 'seo',
      severity,
      message: rec,
      suggestion: rec
    });
  });

  // Add Readability recommendations
  readabilityResult.recommendations.forEach((rec) => {
    if (rec.startsWith('✓')) return; // Skip positive feedback

    allTips.push({
      type: 'readability',
      severity: rec.includes('quá dài') || rec.includes('phức tạp') ? 'high' : 'medium',
      message: rec.split('.')[0],
      suggestion: rec
    });
  });

  setOptimizationTips(allTips);
  setIsAnalyzing(false);

  toast({
    title: "Phân tích hoàn tất",
    description: `SEO Score: ${seoResult.score}/100 | Readability: ${readabilityResult.score}/100`,
  });
};
```

### Step 2: Add Detailed Scoring Breakdown UI

Add this section in the sidebar after the main score display:

```tsx
{/* Detailed SEO Breakdown */}
{seoAnalysis && (
  <div className="mt-4 space-y-2 pt-4 border-t">
    <button
      onClick={() => setShowSeoTips(!showSeoTips)}
      className="flex items-center justify-between w-full text-sm font-medium hover:text-primary"
    >
      <span>Chi tiết phân tích SEO</span>
      {showSeoTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>

    {showSeoTips && (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Từ khóa trong H1:</span>
          <span className={seoAnalysis.h1HasKeyword ? "text-green-600" : "text-red-600"}>
            {seoAnalysis.h1HasKeyword ? "✓" : "✗"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Từ khóa trong Title:</span>
          <span className={seoAnalysis.titleHasKeyword ? "text-green-600" : "text-red-600"}>
            {seoAnalysis.titleHasKeyword ? "✓" : "✗"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Từ khóa trong Meta:</span>
          <span className={seoAnalysis.metaHasKeyword ? "text-green-600" : "text-red-600"}>
            {seoAnalysis.metaHasKeyword ? "✓" : "✗"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Từ khóa đầu bài:</span>
          <span className={seoAnalysis.keywordInFirstParagraph ? "text-green-600" : "text-red-600"}>
            {seoAnalysis.keywordInFirstParagraph ? "✓" : "✗"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Mật độ từ khóa:</span>
          <span className={seoAnalysis.keywordDensity >= 1 && seoAnalysis.keywordDensity <= 2.5 ? "text-green-600" : "text-orange-600"}>
            {seoAnalysis.keywordDensity.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Hình ảnh thiếu alt:</span>
          <span className={seoAnalysis.imagesWithoutAlt === 0 ? "text-green-600" : "text-orange-600"}>
            {seoAnalysis.imagesWithoutAlt}/{seoAnalysis.totalImages}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Số từ khóa:</span>
          <span>{seoAnalysis.keywordCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Tổng số từ:</span>
          <span>{seoAnalysis.wordCount}</span>
        </div>
      </div>
    )}
  </div>
)}

{/* Detailed Readability Breakdown */}
{readabilityAnalysis && (
  <div className="mt-4 space-y-2 pt-4 border-t">
    <button
      onClick={() => setShowReadabilityTips(!showReadabilityTips)}
      className="flex items-center justify-between w-full text-sm font-medium hover:text-primary"
    >
      <span>Chi tiết phân tích Readability</span>
      {showReadabilityTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>

    {showReadabilityTips && (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Độ dài câu TB:</span>
          <span className={readabilityAnalysis.avgSentenceLength <= 20 ? "text-green-600" : "text-orange-600"}>
            {readabilityAnalysis.avgSentenceLength.toFixed(1)} từ
          </span>
        </div>
        <div className="flex justify-between">
          <span>Câu quá dài (>25 từ):</span>
          <span className={readabilityAnalysis.longSentences === 0 ? "text-green-600" : "text-orange-600"}>
            {readabilityAnalysis.longSentences}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Đoạn văn khó:</span>
          <span className={readabilityAnalysis.difficultParagraphs.length === 0 ? "text-green-600" : "text-orange-600"}>
            {readabilityAnalysis.difficultParagraphs.length}
          </span>
        </div>

        {readabilityAnalysis.difficultParagraphs.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <p className="font-medium mb-1">Đoạn văn cần cải thiện:</p>
            {readabilityAnalysis.difficultParagraphs.map((para, idx) => (
              <div key={idx} className="text-xs text-muted-foreground bg-orange-50 p-2 rounded mt-1">
                {para}
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
)}
```

### Step 3: Update Score Display with Better Visual

```tsx
<div className="flex gap-2 mt-3">
  <Badge
    variant="outline"
    className={`${
      scores.seo >= 75 ? 'bg-green-50 text-green-700 border-green-200' :
      scores.seo >= 50 ? 'bg-orange-50 text-orange-700 border-orange-200' :
      'bg-red-50 text-red-700 border-red-200'
    }`}
  >
    SEO {scores.seo}
  </Badge>
  <Badge
    variant="outline"
    className={`${
      scores.readability >= 75 ? 'bg-purple-50 text-purple-700 border-purple-200' :
      scores.readability >= 50 ? 'bg-orange-50 text-orange-700 border-orange-200' :
      'bg-red-50 text-red-700 border-red-200'
    }`}
  >
    Readability {scores.readability}
  </Badge>
  <Badge variant="outline">
    Tone ✓
  </Badge>
</div>
```

## 📊 Scoring Criteria Reference

### SEO Score Breakdown (100 points total)
- **H1 contains keyword**: 25 points
- **Title tag contains keyword**: 20 points
- **Meta description contains keyword**: 15 points
- **Keyword in first paragraph**: 15 points
- **Optimal keyword density (1-2%)**: 15 points
- **All images have alt text**: 10 points

### Readability Score (100 points, penalty-based)
- **Base score**: 100
- **Average sentence > 25 words**: -20 points
- **Average sentence 20-25 words**: -10 points
- **More than 5 long sentences**: -15 points
- **2-5 long sentences**: -8 points
- **More than 3 difficult paragraphs**: -15 points
- **1-3 difficult paragraphs**: -8 points

### Recommendations Priority
- **High severity** (red): Missing H1, missing keywords in H1/title, very long sentences
- **Medium severity** (orange): Missing meta, keyword density issues, some long sentences
- **Low severity** (blue): Minor improvements, suggestions

## 🎯 Testing Scenarios

### Test 1: Empty Content
- Expected: Low scores, recommendations to add content

### Test 2: Content with Keywords
- Add target keyword: "DHA Nordic"
- Add H1: "Kẹo Dếo DHA Nordic Naturals"
- Add title: "DHA Nordic - Bổ sung Omega-3 cho trẻ"
- Expected: Higher SEO score

### Test 3: Long Sentences
- Add paragraph with very long sentences (>30 words)
- Expected: Lower readability score, recommendations to shorten

### Test 4: Images without Alt
- Add `<img src="test.jpg">` without alt
- Expected: SEO recommendation to add alt text

## 🚀 Future Enhancements

1. **Tone of Voice Analysis**
   - Formal vs casual detection
   - Brand voice consistency
   - Emotional tone analysis

2. **Keyword Highlighting in Editor**
   - Visual marks in TinyMCE
   - Click to see keyword occurrences
   - Density heatmap

3. **Export Report**
   - PDF export with scores
   - Detailed recommendations
   - Before/after comparison

4. **Real-time Updates**
   - Update scores as user types
   - Debounced analysis (500ms delay)
   - Live keyword density indicator

5. **Competitor Analysis**
   - Fetch top 10 SERP results
   - Compare keyword usage
   - Suggest optimal length

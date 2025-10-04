# Content Optimizer - Primary & Secondary Keyword Strategy

## Overview
Implemented a sophisticated keyword strategy that separates Primary and Secondary keywords with different density targets, following SEO best practices for optimal content optimization.

## Keyword Structure

### Primary Keyword
- **Count**: Exactly 1 keyword (required)
- **Purpose**: Main focus keyword for the content
- **Density Target**: 1-1.5%
- **Visual Indicator**: Green badge (#bbf7d0 background)
- **Priority**: Used for H1, Title, Meta checks

### Secondary Keywords
- **Count**: Multiple keywords (optional)
- **Purpose**: Supporting keywords for topical relevance
- **Density Target**: 0.3-0.8% (total for all secondary keywords)
- **Visual Indicator**: Yellow badges (#fef08a background)
- **Priority**: Complementary to primary keyword

### Total Density
- **Target**: 1.5-2.5%
- **Calculation**: Primary + Secondary combined
- **Importance**: Prevents keyword stuffing while ensuring adequate coverage

## UI Components

### Primary Keyword Input
```tsx
<Input
  id="primary-keyword"
  value={primaryKeyword}
  placeholder="Nhập từ khóa chính (1 từ khóa duy nhất)..."
  required
/>
```

**Features**:
- Single input field (no multi-add functionality)
- Required field (marked with red asterisk)
- Shows density target: 1-1.5%
- Displays green badge when keyword is entered
- Bold/semibold styling to emphasize importance

### Secondary Keywords Input
```tsx
<Input
  id="secondary-keywords"
  value={secondaryKeywordInput}
  onKeyDown={(e) => e.key === 'Enter' && handleAddSecondaryKeyword()}
/>
<Button onClick={handleAddSecondaryKeyword}>Add</Button>
```

**Features**:
- Multi-keyword input with "Add" button
- Enter key to add keyword
- Shows density target: 0.3-0.8% (total)
- Yellow badges for each keyword
- Click badge to remove
- Shows total combined density target

### Density Guidance
Each keyword section shows clear density targets:
- Primary: `Mật độ đề xuất: 1-1.5%` (green text)
- Secondary: `Mật độ đề xuất (tổng): 0.3-0.8%` (yellow text)
- Total: `Tổng mật độ (Primary + Secondary): 1.5-2.5%` (blue text)

## Scoring Algorithm

### Updated SEO Analysis Function
```typescript
export function analyzeSEO(
  content: string,
  h1Title: string,
  titleTag: string,
  metaDescription: string,
  primaryKeyword: string,
  secondaryKeywords: string[]
): SEOAnalysis
```

### Scoring Breakdown (100 points total)

1. **H1 has primary keyword** - 25 points
2. **Title tag has primary keyword** - 20 points
3. **Meta description has primary keyword** - 15 points
4. **Primary keyword in first paragraph** - 15 points
5. **Primary keyword density** - 10 points
   - 1-1.5%: Full 10 points
   - 1.5-2%: 7 points (slightly high)
   - >2%: 3 points (too high)
   - <1% but >0: 5 points (too low)
6. **Secondary keywords density** - 5 points
   - 0.3-0.8%: Full 5 points
   - 0.8-1.2%: 3 points (slightly high)
   - >1.2%: 1 point (too high)
   - <0.3% but >0: 2 points (too low)
7. **Total keyword density** - 5 points
   - 1.5-2.5%: Full 5 points
   - 2.5-3.5%: 3 points (slightly high)
   - >3.5%: 1 point (too high)
   - <1.5% but >0: 2 points (too low)
8. **Images have alt text** - 10 points

### Density Calculation Logic
```typescript
const primaryKeywordCount = countKeywords(textContent, [primaryKeyword]);
const secondaryKeywordCount = countKeywords(textContent, secondaryKeywords);

const primaryKeywordDensity = calculateKeywordDensity(textContent, [primaryKeyword]);
const secondaryKeywordDensity = calculateKeywordDensity(textContent, secondaryKeywords);
const totalKeywordDensity = primaryKeywordDensity + secondaryKeywordDensity;
```

## Visual Highlighting

### Editor Highlighting
When "Highlight Từ khóa" button is clicked:

**Primary Keyword**:
```html
<mark style="background-color: #bbf7d0; padding: 2px 0; font-weight: 600;">keyword</mark>
```
- Light green background (#bbf7d0)
- Bold font weight
- Stands out more prominently

**Secondary Keywords**:
```html
<mark style="background-color: #fef08a; padding: 2px 0;">keyword</mark>
```
- Yellow background (#fef08a)
- Normal font weight
- Visually distinct from primary

### Metadata Field Highlighting
Shows found keywords below H1, Title, and Meta fields:

**Primary Keyword Badge**:
```tsx
<span className="bg-green-100 text-green-800 font-semibold">
  {primaryKeyword}
</span>
```

**Secondary Keyword Badge**:
```tsx
<span className="bg-yellow-100 text-yellow-800">
  {secondaryKeyword}
</span>
```

## SEO Breakdown Display

### Updated Metrics Panel
Shows three separate density metrics with color-coded indicators:

```tsx
// Primary Keyword Density
<div>
  <span>Mật độ từ khóa chính:</span>
  <span className={isOptimal ? "text-green-600" : "text-orange-600"}>
    {primaryKeywordDensity.toFixed(2)}%
    <span>(tối ưu: 1-1.5%)</span>
  </span>
</div>

// Secondary Keyword Density (if exists)
<div>
  <span>Mật độ từ khóa phụ:</span>
  <span className={isOptimal ? "text-green-600" : "text-orange-600"}>
    {secondaryKeywordDensity.toFixed(2)}%
    <span>(tối ưu: 0.3-0.8%)</span>
  </span>
</div>

// Total Density
<div>
  <span>Tổng mật độ:</span>
  <span className={isOptimal ? "text-green-600" : "text-orange-600"}>
    {totalKeywordDensity.toFixed(2)}%
    <span>(tối ưu: 1.5-2.5%)</span>
  </span>
</div>
```

### Occurrence Counts
```tsx
<div>
  <span>Từ khóa chính xuất hiện:</span>
  <span>{primaryKeywordCount} lần</span>
</div>

{secondaryKeywords.length > 0 && (
  <div>
    <span>Từ khóa phụ xuất hiện:</span>
    <span>{secondaryKeywordCount} lần</span>
  </div>
)}
```

## Data Interface

### Updated SEOAnalysis Interface
```typescript
export interface SEOAnalysis {
  score: number;

  // Separate density tracking
  primaryKeywordDensity: number;
  secondaryKeywordDensity: number;
  totalKeywordDensity: number;

  // Location checks (using primary keyword)
  h1HasKeyword: boolean;
  titleHasKeyword: boolean;
  metaHasKeyword: boolean;
  keywordInFirstParagraph: boolean;

  // Separate occurrence counts
  primaryKeywordCount: number;
  secondaryKeywordCount: number;

  // Other metrics
  imagesWithoutAlt: number;
  totalImages: number;
  wordCount: number;
  recommendations: string[];
}
```

## Best Practices Implemented

### 1. SEO Best Practices
- ✅ Focus on one primary keyword per page
- ✅ Support with related secondary keywords
- ✅ Avoid keyword stuffing (total density cap)
- ✅ Primary keyword in strategic locations (H1, Title, Meta)
- ✅ Natural keyword distribution

### 2. User Experience
- ✅ Clear visual distinction between primary/secondary
- ✅ Density targets shown upfront
- ✅ Real-time validation
- ✅ Color-coded feedback (green = good, orange/red = needs work)
- ✅ Easy keyword management (add/remove)

### 3. Content Strategy
- ✅ Primary keyword drives main topic
- ✅ Secondary keywords expand topical relevance
- ✅ Balanced density prevents over-optimization
- ✅ Supports semantic SEO approach

## Example Usage Workflow

### 1. Setup Keywords
```
Primary Keyword: "content marketing strategy"
Secondary Keywords: "SEO content", "content planning", "marketing tactics"
```

### 2. Analyze Content
System checks:
- Primary density: 1.2% ✓ (within 1-1.5%)
- Secondary density: 0.5% ✓ (within 0.3-0.8%)
- Total density: 1.7% ✓ (within 1.5-2.5%)

### 3. Review Feedback
**Green indicators**:
- ✓ H1 contains "content marketing strategy"
- ✓ Title contains primary keyword
- ✓ Primary density optimal

**Orange indicators**:
- ⚠ Secondary density slightly low (0.5%, could be 0.6-0.8%)

### 4. Optimize
- Add 1-2 more instances of secondary keywords
- Re-analyze to confirm improvement

## Recommendations Algorithm

### Primary Keyword Recommendations
```typescript
if (primaryKeywordDensity < 1) {
  recommendations.push(`Tăng mật độ từ khóa chính (${density}%, nên 1-1.5%)`);
} else if (primaryKeywordDensity > 2) {
  recommendations.push(`Giảm mật độ từ khóa chính (${density}%, nên 1-1.5%)`);
}
```

### Secondary Keyword Recommendations
```typescript
if (secondaryKeywordDensity < 0.3) {
  recommendations.push(`Tăng mật độ từ khóa phụ (${density}%, nên 0.3-0.8%)`);
} else if (secondaryKeywordDensity > 1.2) {
  recommendations.push(`Giảm mật độ từ khóa phụ (${density}%, nên 0.3-0.8%)`);
}
```

### Total Density Recommendations
```typescript
if (totalKeywordDensity < 1.5) {
  recommendations.push(`Tăng tổng mật độ từ khóa (${density}%, nên 1.5-2.5%)`);
} else if (totalKeywordDensity > 3.5) {
  recommendations.push(`Giảm tổng mật độ từ khóa (${density}%, nên 1.5-2.5%)`);
}
```

## Technical Implementation

### State Management
```typescript
// Separate state for primary/secondary
const [primaryKeyword, setPrimaryKeyword] = useState("");
const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);

// Computed property for backward compatibility
const allKeywords = primaryKeyword ? [primaryKeyword, ...secondaryKeywords] : secondaryKeywords;
```

### Validation
- Primary keyword is required before analysis
- Toast notification if primary keyword is missing
- Secondary keywords are optional

## Migration Notes

### Breaking Changes
- `analyzeSEO()` signature changed from 5 to 6 parameters
- `SEOAnalysis` interface replaced `keywordDensity` with three separate fields
- Removed `keywordCount` in favor of separate primary/secondary counts

### Backward Compatibility
- `allKeywords` computed property maintains combined keyword list
- Existing highlighting logic works with both keyword types
- UI gracefully handles zero secondary keywords

## Testing Checklist

- [x] Build compiles without errors
- [ ] Primary keyword input accepts single keyword
- [ ] Secondary keyword input accepts multiple keywords
- [ ] Density calculations are accurate
- [ ] Scoring algorithm weights correctly
- [ ] Primary keyword highlighted in green
- [ ] Secondary keywords highlighted in yellow
- [ ] SEO breakdown shows all three density metrics
- [ ] Recommendations are contextually accurate
- [ ] Required validation works for primary keyword

## Related Files

- `/client/src/lib/content-optimizer-utils.ts` - Scoring engine
- `/client/src/pages/content-optimizer.tsx` - UI implementation
- `/docs/CONTENT_OPTIMIZER_KEYWORD_HIGHLIGHTING.md` - Highlighting feature
- `/docs/CONTENT_OPTIMIZER_FEATURES.md` - Overall features

## Version History

- **v2.0** (2025-10-04): Primary/Secondary keyword split with separate density tracking and scoring
- **v1.0** (2025-10-04): Initial keyword highlighting implementation

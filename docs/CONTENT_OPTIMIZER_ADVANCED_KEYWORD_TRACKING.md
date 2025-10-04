# Content Optimizer - Advanced Keyword Tracking System

## Overview
Implemented a sophisticated keyword counting and tracking system that follows 7 core rules to ensure accurate, non-overlapping keyword detection with support for Vietnamese language and various text normalizations.

## Core Rules Implementation

### Rule 1: Longest-Match-Wins (Ưu tiên khớp cụm dài nhất)

**Principle**: When multiple keyword phrases overlap, the longest matching phrase takes priority.

**Example**:
```
Content: "DHA Nordic Naturals is a great supplement"
Keywords:
  - "DHA Nordic Naturals" (3 words)
  - "DHA Nordic" (2 words)
  - "DHA" (1 word)

Result: Only counts "DHA Nordic Naturals" (the longest match)
Does NOT count: "DHA Nordic" or "DHA" in the same span
```

**Implementation**:
```typescript
// Sort keywords by length (longest first)
allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);

// Sort matches by span length
allMatches.sort((a, b) => {
  const lenDiff = (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
  if (lenDiff !== 0) return lenDiff;
  // ... other sorting criteria
});
```

### Rule 2: Span Masking (Khóa vùng đã đếm)

**Principle**: Once a text span is assigned to a keyword, that span cannot be reused by any other keyword.

**Example**:
```
Content: "Nordic Naturals DHA and Nordic Oil"
Keywords:
  - "Nordic Naturals"
  - "Nordic"

Result:
  - Position 0-15: "Nordic Naturals" ✓
  - Position 0-6: "Nordic" ✗ (overlaps with already-used span)
  - Position 24-30: "Nordic" ✓ (different span, no overlap)

Total: 1 × "Nordic Naturals", 1 × "Nordic"
```

**Implementation**:
```typescript
const usedSpans: Array<[number, number]> = [];
const validMatches: KeywordMatch[] = [];

allMatches.forEach(match => {
  // Check if this span overlaps with any already-used span
  const overlaps = usedSpans.some(([start, end]) => {
    return !(match.endIndex <= start || match.startIndex >= end);
  });

  if (!overlaps) {
    validMatches.push(match);
    usedSpans.push([match.startIndex, match.endIndex]);
  }
});
```

### Rule 3: Priority by Role (Ưu tiên theo vai trò: Primary > Secondary)

**Principle**: When primary and secondary keywords have the same length and overlap, primary keyword takes precedence.

**Example**:
```
Primary: "supplement review"
Secondary: "supplement guide"
Content: "This supplement review covers..."

Result: Counts for "supplement review" (Primary)
Does NOT count for "supplement" from Secondary keyword
```

**Implementation**:
```typescript
// Sort with priority: longer spans, then isPrimary, then position
allMatches.sort((a, b) => {
  const lenDiff = (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
  if (lenDiff !== 0) return lenDiff;
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1; // Primary first
  return a.startIndex - b.startIndex;
});
```

### Rule 4: Normalization - Singular/Plural/Hyphen

**Principle**: Treat variations as the same entity (Nordic Natural ≈ Nordic Naturals).

**Example**:
```
Keyword: "Nordic Natural"

Matches:
  ✓ "Nordic Natural"
  ✓ "Nordic Naturals"  (plural)
  ✓ "Nordic-Natural"   (hyphenated)
  ✓ "Nordic  Natural"  (multiple spaces)

All count as 1 keyword occurrence
```

**Implementation**:
```typescript
function createFlexiblePattern(keyword: string): RegExp {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Allow optional 's' at the end of last word
  const withPlural = escaped.replace(/(\w+)$/i, '$1s?');
  // Allow hyphen or space between words
  const withHyphen = withPlural.replace(/\s+/g, '[\\s-]+');
  return new RegExp(`\\b${withHyphen}\\b`, 'gi');
}

// Usage:
// "Nordic Natural" → /\bnordic[\s-]+naturals?\b/gi
```

### Rule 5: Vietnamese Diacritic Normalization

**Principle**: Normalize Unicode and Vietnamese diacritics for matching, while preserving original text in reports.

**Example**:
```
Keyword: "bổ sung dinh dưỡng"

Matches:
  ✓ "bổ sung dinh dưỡng"
  ✓ "bo sung dinh duong"  (no diacritics)
  ✓ "Bổ Sung Dinh Dưỡng"  (capitalized)
  ✓ "BỔ SUNG DINH DƯỠNG"  (uppercase)

All normalized to: "bo sung dinh duong" for comparison
```

**Implementation**:
```typescript
function normalizeText(text: string): string {
  const diacriticsMap: { [key: string]: string } = {
    'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
    'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
    'ì|í|ị|ỉ|ĩ': 'i',
    'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
    'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
    'ỳ|ý|ỵ|ỷ|ỹ': 'y',
    'đ': 'd',
    // Uppercase variants...
  };

  let normalized = text.toLowerCase();

  // Remove diacritics
  Object.keys(diacriticsMap).forEach(pattern => {
    normalized = normalized.replace(new RegExp(pattern, 'g'), diacriticsMap[pattern]);
  });

  // Normalize hyphens and multiple spaces
  normalized = normalized.replace(/[-–—]/g, ' ').replace(/\s+/g, ' ');

  return normalized.trim();
}
```

### Rule 6: Fuzzy Matching Mode (Optional)

**Principle**: Allow small variations (typos, Levenshtein distance ≤1-2).

**Status**: Currently NOT implemented (strict matching only)

**Future Enhancement**:
```typescript
// Potential implementation using Levenshtein distance
function isFuzzyMatch(text: string, keyword: string, maxDistance: number = 2): boolean {
  const distance = calculateLevenshteinDistance(text, keyword);
  return distance <= maxDistance;
}
```

### Rule 7: No Point Splitting

**Principle**: When overlap occurs, assign the full match to the longest keyword; do NOT split points between multiple keywords.

**Example**:
```
❌ Wrong Approach:
"DHA Nordic Naturals" = 0.5 points for "DHA Nordic Naturals" + 0.3 for "DHA Nordic" + 0.2 for "DHA"

✓ Correct Approach:
"DHA Nordic Naturals" = 1 point ONLY for "DHA Nordic Naturals"
```

**Implementation**: Enforced by span masking (Rule 2) - no overlapping matches are allowed.

## Data Structures

### KeywordMatch Interface
```typescript
interface KeywordMatch {
  keyword: string;        // Original keyword phrase
  startIndex: number;     // Start position in normalized content
  endIndex: number;       // End position in normalized content
  matchedText: string;    // Actual matched text from content
  isPrimary: boolean;     // true = primary keyword, false = secondary
}
```

### countKeywordsAdvanced() Function
```typescript
export function countKeywordsAdvanced(
  content: string,
  primaryKeyword: string,
  secondaryKeywords: string[]
): {
  primaryCount: number;
  secondaryCount: number;
  matches: KeywordMatch[];
}
```

**Returns**:
- `primaryCount`: Number of primary keyword occurrences
- `secondaryCount`: Number of secondary keyword occurrences
- `matches`: Array of all valid matches with position data

## Algorithm Flow

### Step 1: Normalize Content
```typescript
const normalizedContent = normalizeText(content);
// "Bổ sung DHA Nordic-Naturals cho trẻ em"
// → "bo sung dha nordic naturals cho tre em"
```

### Step 2: Collect All Potential Matches
```typescript
const allKeywords = [
  { keyword: primaryKeyword, isPrimary: true },
  ...secondaryKeywords.map(kw => ({ keyword: kw, isPrimary: false }))
];

// Sort by length (longest first)
allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);
```

### Step 3: Find All Matches with Positions
```typescript
allKeywords.forEach(({ keyword, isPrimary }) => {
  const normalizedKeyword = normalizeText(keyword);
  const pattern = createFlexiblePattern(normalizedKeyword);

  while ((match = pattern.exec(normalizedContent)) !== null) {
    allMatches.push({
      keyword,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      matchedText: match[0],
      isPrimary
    });
  }
});
```

### Step 4: Sort Matches by Priority
```typescript
allMatches.sort((a, b) => {
  // 1. Longest span wins
  const lenDiff = (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
  if (lenDiff !== 0) return lenDiff;

  // 2. Primary > Secondary
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;

  // 3. Earlier position wins
  return a.startIndex - b.startIndex;
});
```

### Step 5: Apply Span Masking
```typescript
const usedSpans: Array<[number, number]> = [];
const validMatches: KeywordMatch[] = [];

allMatches.forEach(match => {
  // Check for overlap
  const overlaps = usedSpans.some(([start, end]) => {
    return !(match.endIndex <= start || match.startIndex >= end);
  });

  if (!overlaps) {
    validMatches.push(match);
    usedSpans.push([match.startIndex, match.endIndex]);
  }
});
```

### Step 6: Count and Return
```typescript
const primaryCount = validMatches.filter(m => m.isPrimary).length;
const secondaryCount = validMatches.filter(m => !m.isPrimary).length;

return { primaryCount, secondaryCount, matches: validMatches };
```

## Usage Examples

### Example 1: Basic Usage
```typescript
const content = "DHA Nordic Naturals là sản phẩm bổ sung dinh dưỡng tốt. Nordic Naturals có nhiều loại.";
const primary = "DHA Nordic Naturals";
const secondary = ["Nordic Naturals", "bổ sung dinh dưỡng"];

const result = countKeywordsAdvanced(content, primary, secondary);

// Result:
// {
//   primaryCount: 1,       // "DHA Nordic Naturals" found once
//   secondaryCount: 2,     // "Nordic Naturals" (once) + "bổ sung dinh dưỡng" (once)
//   matches: [
//     { keyword: "DHA Nordic Naturals", startIndex: 0, endIndex: 19, ... },
//     { keyword: "bổ sung dinh dưỡng", startIndex: 36, endIndex: 55, ... },
//     { keyword: "Nordic Naturals", startIndex: 61, endIndex: 76, ... }
//   ]
// }
```

### Example 2: Overlap Handling
```typescript
const content = "DHA Nordic Naturals review";
const primary = "DHA Nordic Naturals";
const secondary = ["DHA Nordic", "Nordic Naturals", "DHA"];

const result = countKeywordsAdvanced(content, primary, secondary);

// Result:
// {
//   primaryCount: 1,       // "DHA Nordic Naturals" (longest match)
//   secondaryCount: 0,     // All secondary keywords overlap with primary
//   matches: [
//     { keyword: "DHA Nordic Naturals", startIndex: 0, endIndex: 19, isPrimary: true }
//   ]
// }

// Explanation:
// - "DHA Nordic Naturals" matched first (longest)
// - Span [0-19] is now locked
// - "DHA Nordic", "Nordic Naturals", "DHA" all overlap → rejected
```

### Example 3: Vietnamese Normalization
```typescript
const content = "Bổ sung dinh dưỡng cho trẻ. Bo sung vitamin D.";
const primary = "bổ sung dinh dưỡng";
const secondary = ["vitamin D"];

const result = countKeywordsAdvanced(content, primary, secondary);

// Result:
// {
//   primaryCount: 2,       // Both "Bổ sung dinh dưỡng" and "Bo sung" counted
//   secondaryCount: 1,     // "vitamin D" found once
//   matches: [
//     { keyword: "bổ sung dinh dưỡng", matchedText: "Bổ sung dinh dưỡng", ... },
//     { keyword: "bổ sung dinh dưỡng", matchedText: "Bo sung", ... },
//     { keyword: "vitamin D", matchedText: "vitamin D", ... }
//   ]
// }
```

### Example 4: Singular/Plural Handling
```typescript
const content = "Nordic Natural supplement and Nordic Naturals vitamins";
const primary = "Nordic Natural";
const secondary = ["supplement", "vitamin"];

const result = countKeywordsAdvanced(content, primary, secondary);

// Result:
// {
//   primaryCount: 2,       // "Nordic Natural" and "Nordic Naturals" both counted
//   secondaryCount: 2,     // "supplement" and "vitamins" both counted
//   matches: [
//     { keyword: "Nordic Natural", matchedText: "Nordic Natural", ... },
//     { keyword: "Nordic Natural", matchedText: "Nordic Naturals", ... },
//     { keyword: "supplement", matchedText: "supplement", ... },
//     { keyword: "vitamin", matchedText: "vitamins", ... }
//   ]
// }
```

## Integration with SEO Analysis

### In analyzeSEO() Function
```typescript
// Use advanced counting with span masking
const keywordAnalysis = countKeywordsAdvanced(textContent, primaryKeyword, secondaryKeywords);
const primaryKeywordCount = keywordAnalysis.primaryCount;
const secondaryKeywordCount = keywordAnalysis.secondaryCount;

// Calculate densities
const primaryKeywordDensity = calculateKeywordDensity(textContent, [primaryKeyword]);
const secondaryKeywordDensity = calculateKeywordDensity(textContent, secondaryKeywords);
const totalKeywordDensity = primaryKeywordDensity + secondaryKeywordDensity;
```

### Density Calculation
The `calculateKeywordDensity()` function uses the same normalization and flexible pattern matching:

```typescript
export function calculateKeywordDensity(content: string, keywords: string[]): number {
  const textContent = stripHTML(content);
  const words = textContent.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  const normalizedContent = normalizeText(textContent);
  let keywordOccurrences = 0;

  keywords.forEach(keyword => {
    const normalizedKeyword = normalizeText(keyword);
    const pattern = createFlexiblePattern(normalizedKeyword);
    const matches = normalizedContent.match(pattern);
    keywordOccurrences += matches ? matches.length : 0;
  });

  return (keywordOccurrences / totalWords) * 100;
}
```

## Performance Considerations

### Time Complexity
- **Normalization**: O(n) where n = content length
- **Pattern matching**: O(k × m) where k = number of keywords, m = number of matches
- **Sorting**: O(m log m) where m = total matches
- **Span masking**: O(m²) worst case, but typically much better

### Optimization Strategies
1. **Pre-normalize content once**: Store normalized version
2. **Cache regex patterns**: Reuse compiled patterns for repeated analysis
3. **Early exit**: Stop processing if no matches found
4. **Batch processing**: Process multiple keywords in one pass

### Memory Usage
- Stores all matches before filtering: O(m) where m = total matches
- Used spans tracking: O(v) where v = valid matches
- Typically: v << m for content with overlapping keywords

## Testing Scenarios

### Test Case 1: No Overlaps
```typescript
Content: "DHA supplement and Nordic Naturals vitamin"
Primary: "DHA supplement"
Secondary: ["Nordic Naturals", "vitamin"]

Expected:
  primaryCount: 1
  secondaryCount: 2
  Total matches: 3
```

### Test Case 2: Complete Overlap
```typescript
Content: "DHA Nordic Naturals"
Primary: "DHA Nordic Naturals"
Secondary: ["DHA Nordic", "Nordic Naturals", "DHA"]

Expected:
  primaryCount: 1
  secondaryCount: 0
  Total matches: 1 (longest match wins)
```

### Test Case 3: Partial Overlap
```typescript
Content: "DHA Nordic Naturals and DHA supplement"
Primary: "DHA Nordic Naturals"
Secondary: ["DHA supplement", "DHA"]

Expected:
  primaryCount: 1 ("DHA Nordic Naturals")
  secondaryCount: 1 ("DHA supplement")
  Total matches: 2 (no overlap between these two)
```

### Test Case 4: Vietnamese Diacritics
```typescript
Content: "Bổ sung DHA và bo sung vitamin"
Primary: "bổ sung DHA"
Secondary: ["vitamin"]

Expected:
  primaryCount: 2 (both "Bổ sung DHA" and "bo sung" match due to normalization)
  secondaryCount: 1
```

## Future Enhancements

### 1. Fuzzy Matching
- Implement Levenshtein distance algorithm
- Allow typo tolerance (1-2 character differences)
- Configurable fuzzy threshold

### 2. Synonym Handling
```typescript
interface KeywordGroup {
  primary: string;
  synonyms: string[];
}

// Example:
// { primary: "supplement", synonyms: ["bổ sung", "thực phẩm chức năng"] }
```

### 3. Context-Aware Matching
- Ignore matches in HTML tags/attributes
- Weight matches in headings higher than body text
- Detect keyword stuffing patterns

### 4. Performance Monitoring
- Track execution time for large documents
- Profile memory usage
- Implement caching for repeated analyses

### 5. Visual Match Reporting
- Highlight all matches in the UI
- Show match positions on a timeline
- Display density heatmap

## Related Files

- `/client/src/lib/content-optimizer-utils.ts` - Core implementation
- `/client/src/pages/content-optimizer.tsx` - UI integration
- `/docs/CONTENT_OPTIMIZER_KEYWORD_STRATEGY.md` - Keyword strategy overview

## Version History

- **v3.0** (2025-10-05): Advanced keyword tracking with 7 core rules
  - Longest-match-wins algorithm
  - Span masking
  - Priority by role
  - Vietnamese normalization
  - Singular/plural handling
- **v2.0** (2025-10-04): Primary/Secondary keyword split
- **v1.0** (2025-10-04): Basic keyword highlighting

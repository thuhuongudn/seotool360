/**
 * Content Optimizer Utilities
 * Client-side scoring and analysis for SEO and Readability
 */

// ============================================
// SEO SCORING UTILITIES
// ============================================

export interface SEOAnalysis {
  score: number; // 0-100
  primaryKeywordDensity: number;
  secondaryKeywordDensity: number;
  totalKeywordDensity: number;
  h1HasKeyword: boolean;
  titleHasKeyword: boolean;
  metaHasKeyword: boolean;
  keywordInFirstParagraph: boolean;
  imagesWithoutAlt: number;
  totalImages: number;
  wordCount: number;
  primaryKeywordCount: number;
  secondaryKeywordCount: number;
  recommendations: string[];
}

export interface ReadabilityIssue {
  type: 'long_sentence' | 'long_paragraph' | 'complex_word' | 'passive_voice';
  text: string; // The problematic text
  excerpt: string; // Short preview for display
  suggestion: string; // What to do about it
  position: number; // Character position in content
  severity: 'high' | 'medium' | 'low';
}

export interface ReadabilityAnalysis {
  score: number; // 0-100 (Flesch Reading Ease adapted for Vietnamese)
  grade: string; // "Very Easy" | "Easy" | "Fairly Easy" | "Standard" | "Fairly Difficult" | "Difficult" | "Very Confusing"
  avgSentenceLength: number;
  longSentences: number; // sentences > 25 words
  avgWordLength: number;
  difficultParagraphs: string[]; // paragraphs that are too long or complex (legacy, kept for compatibility)
  issues: ReadabilityIssue[]; // Detailed clickable issues
  recommendations: string[];
}

/**
 * Normalize text for keyword matching
 * - Remove Vietnamese diacritics
 * - Lowercase
 * - Normalize hyphens/spaces
 */
function normalizeText(text: string): string {
  // Vietnamese diacritic removal map
  const diacriticsMap: { [key: string]: string } = {
    'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
    'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
    'ì|í|ị|ỉ|ĩ': 'i',
    'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
    'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
    'ỳ|ý|ỵ|ỷ|ỹ': 'y',
    'đ': 'd',
    'À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ': 'A',
    'È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ': 'E',
    'Ì|Í|Ị|Ỉ|Ĩ': 'I',
    'Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ': 'O',
    'Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ': 'U',
    'Ỳ|Ý|Ỵ|Ỷ|Ỹ': 'Y',
    'Đ': 'D'
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

/**
 * Create regex pattern that matches singular/plural variants
 * Example: "natural" matches "natural" and "naturals"
 */
function createFlexiblePattern(keyword: string): RegExp {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Allow optional 's' at the end of last word
  const withPlural = escaped.replace(/(\w+)$/i, '$1s?');
  // Allow hyphen or space between words
  const withHyphen = withPlural.replace(/\s+/g, '[\\s-]+');
  return new RegExp(`\\b${withHyphen}\\b`, 'gi');
}

/**
 * Advanced keyword counting with span masking
 *
 * Rules (PRIORITY ORDER):
 * 1. Primary ALWAYS wins: Primary keyword takes priority even if secondary is longer
 * 2. Span Masking: Once a span is assigned, it can't be reused for another keyword
 * 3. Longest-Match-Wins: Among same type (primary or secondary), longer phrase wins
 * 4. Normalization: Handles singular/plural, hyphens, Vietnamese diacritics
 *
 * Example: Primary="dha nordic", Secondary=["dha nordic naturals"]
 * When "DHA Nordic Naturals" appears → Counted as PRIMARY (not secondary)
 */
interface KeywordMatch {
  keyword: string;
  startIndex: number;
  endIndex: number;
  matchedText: string;
  isPrimary: boolean;
}

export function countKeywordsAdvanced(
  content: string,
  primaryKeyword: string,
  secondaryKeywords: string[]
): { primaryCount: number; secondaryCount: number; matches: KeywordMatch[] } {
  if (!content || !primaryKeyword) {
    return { primaryCount: 0, secondaryCount: 0, matches: [] };
  }

  const normalizedContent = normalizeText(content);
  const allMatches: KeywordMatch[] = [];

  // Collect all potential matches with their positions
  const allKeywords = [
    { keyword: primaryKeyword, isPrimary: true },
    ...secondaryKeywords.map(kw => ({ keyword: kw, isPrimary: false }))
  ];

  // Sort keywords by length (longest first) for longest-match-wins
  allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);

  allKeywords.forEach(({ keyword, isPrimary }) => {
    const normalizedKeyword = normalizeText(keyword);
    const pattern = createFlexiblePattern(normalizedKeyword);

    let match;
    const originalPattern = new RegExp(pattern.source, pattern.flags);

    while ((match = originalPattern.exec(normalizedContent)) !== null) {
      allMatches.push({
        keyword,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        matchedText: match[0],
        isPrimary
      });
    }
  });

  // Sort matches: PRIMARY FIRST (always wins), then longer spans, then by position
  // CRITICAL: Primary keyword takes priority even if secondary keyword is longer
  allMatches.sort((a, b) => {
    // Rule 1: Primary always wins
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    // Rule 2: If both same type, longer span wins
    const lenDiff = (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
    if (lenDiff !== 0) return lenDiff;
    // Rule 3: If same type and length, earlier position wins
    return a.startIndex - b.startIndex;
  });

  // Apply span masking: track used spans
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

  // Count primary and secondary matches
  const primaryCount = validMatches.filter(m => m.isPrimary).length;
  const secondaryCount = validMatches.filter(m => !m.isPrimary).length;

  return { primaryCount, secondaryCount, matches: validMatches };
}

/**
 * Calculate keyword density (percentage of content that is the keyword)
 * Uses advanced counting with span masking
 */
export function calculateKeywordDensity(content: string, keywords: string[]): number {
  if (keywords.length === 0 || !content) return 0;

  const textContent = stripHTML(content);
  const words = textContent.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  if (totalWords === 0) return 0;

  // Use simple counting for density calculation
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

/**
 * Check if keywords appear in first paragraph
 * Uses normalized matching for Vietnamese diacritics and variants
 */
export function hasKeywordInFirstParagraph(content: string, keywords: string[]): boolean {
  if (keywords.length === 0 || !content) return false;

  // Extract text from HTML
  const textContent = stripHTML(content);
  const paragraphs = textContent.split(/\n\n+/).filter(Boolean);

  if (paragraphs.length === 0) return false;

  const normalizedFirstParagraph = normalizeText(paragraphs[0]);
  return keywords.some(kw => {
    const normalizedKeyword = normalizeText(kw);
    const pattern = createFlexiblePattern(normalizedKeyword);
    return pattern.test(normalizedFirstParagraph);
  });
}

/**
 * Count images and check alt attributes
 */
export function analyzeImages(htmlContent: string): { total: number; withoutAlt: number } {
  const imgRegex = /<img[^>]*>/gi;
  const images = htmlContent.match(imgRegex) || [];

  let withoutAlt = 0;
  images.forEach(img => {
    const hasAlt = /alt\s*=\s*["'][^"']+["']/i.test(img);
    if (!hasAlt) withoutAlt++;
  });

  return {
    total: images.length,
    withoutAlt
  };
}

/**
 * Count keyword occurrences in content (simple version for backward compatibility)
 * For advanced counting with span masking, use countKeywordsAdvanced()
 */
export function countKeywords(content: string, keywords: string[]): number {
  if (keywords.length === 0 || !content) return 0;

  const normalizedContent = normalizeText(content);
  let count = 0;

  keywords.forEach(keyword => {
    const normalizedKeyword = normalizeText(keyword);
    const pattern = createFlexiblePattern(normalizedKeyword);
    const matches = normalizedContent.match(pattern);
    count += matches ? matches.length : 0;
  });

  return count;
}

/**
 * Analyze SEO and generate score with separate primary and secondary keywords
 *
 * Density targets:
 * - Primary keyword: 1-1.5%
 * - Secondary keywords: 0.3-0.8% (total)
 * - Total density: 1.5-2.5%
 */
export function analyzeSEO(
  content: string,
  h1Title: string,
  titleTag: string,
  metaDescription: string,
  primaryKeyword: string,
  secondaryKeywords: string[]
): SEOAnalysis {
  // Extract ONLY content text (excluding title, meta, alt attributes)
  // But INCLUDE H1 in the content
  const contentWithH1 = h1Title ? `<h1>${h1Title}</h1>\n${content}` : content;
  const textContent = stripHTML(contentWithH1);
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  const imageAnalysis = analyzeImages(content);

  // IMPORTANT: Don't filter secondary keywords - let advanced counting handle priority
  // Advanced algorithm will automatically prioritize Primary when overlap occurs
  // Example: primary="dha nordic", secondary=["dha nordic naturals"]
  // Content: "DHA Nordic Naturals" → counts as PRIMARY (priority rule)

  // Use advanced counting with span masking and primary priority
  const keywordAnalysis = countKeywordsAdvanced(textContent, primaryKeyword, secondaryKeywords);
  const primaryKeywordCount = keywordAnalysis.primaryCount;
  const secondaryKeywordCount = keywordAnalysis.secondaryCount;

  // Calculate densities using the SAME counts from advanced analysis
  const primaryKeywordDensity = wordCount > 0 ? (primaryKeywordCount / wordCount) * 100 : 0;
  const secondaryKeywordDensity = wordCount > 0 ? (secondaryKeywordCount / wordCount) * 100 : 0;
  const totalKeywordDensity = primaryKeywordDensity + secondaryKeywordDensity;

  // Check keyword presence in key locations (using normalized matching)
  const normalizedPrimary = normalizeText(primaryKeyword);
  const normalizedH1 = normalizeText(h1Title);
  const normalizedTitle = normalizeText(titleTag);
  const normalizedMeta = normalizeText(metaDescription);

  const h1HasKeyword = normalizedH1.includes(normalizedPrimary);
  const titleHasKeyword = normalizedTitle.includes(normalizedPrimary);
  const metaHasKeyword = normalizedMeta.includes(normalizedPrimary);
  const keywordInFirstParagraph = hasKeywordInFirstParagraph(content, [primaryKeyword]);

  // Calculate score (0-100)
  let score = 0;
  const recommendations: string[] = [];

  // H1 has primary keyword (25 points)
  if (h1HasKeyword) {
    score += 25;
  } else if (h1Title.trim()) {
    recommendations.push('Thêm từ khóa chính vào H1');
  } else {
    recommendations.push('Thêm tiêu đề H1 có chứa từ khóa chính');
  }

  // Title tag has primary keyword (20 points)
  if (titleHasKeyword) {
    score += 20;
  } else if (titleTag.trim()) {
    recommendations.push('Thêm từ khóa chính vào title tag');
  } else {
    recommendations.push('Thêm title tag có chứa từ khóa chính');
  }

  // Meta description has primary keyword (15 points)
  if (metaHasKeyword) {
    score += 15;
  } else if (metaDescription.trim()) {
    recommendations.push('Thêm từ khóa chính vào meta description');
  } else {
    recommendations.push('Thêm meta description có chứa từ khóa chính');
  }

  // Primary keyword in first paragraph (15 points)
  if (keywordInFirstParagraph) {
    score += 15;
  } else {
    recommendations.push('Thêm từ khóa chính vào đoạn đầu tiên của bài viết');
  }

  // Primary keyword density (10 points) - optimal is 1-1.5%
  if (primaryKeywordDensity >= 1 && primaryKeywordDensity <= 1.5) {
    score += 10;
  } else if (primaryKeywordDensity > 1.5 && primaryKeywordDensity <= 2) {
    recommendations.push(`Mật độ từ khóa chính hơi cao (${primaryKeywordDensity.toFixed(2)}%, nên 1-1.5%)`);
    score += 7;
  } else if (primaryKeywordDensity > 2) {
    recommendations.push(`Giảm mật độ từ khóa chính (${primaryKeywordDensity.toFixed(2)}%, nên 1-1.5%)`);
    score += 3;
  } else if (primaryKeywordDensity > 0) {
    recommendations.push(`Tăng mật độ từ khóa chính (${primaryKeywordDensity.toFixed(2)}%, nên 1-1.5%)`);
    score += 5;
  } else {
    recommendations.push('Thêm từ khóa chính vào nội dung');
  }

  // Secondary keywords density (5 points) - optimal is 0.3-0.8% total
  if (secondaryKeywords.length > 0) {
    if (secondaryKeywordDensity >= 0.3 && secondaryKeywordDensity <= 0.8) {
      score += 5;
    } else if (secondaryKeywordDensity > 0.8 && secondaryKeywordDensity <= 1.2) {
      recommendations.push(`Mật độ từ khóa phụ hơi cao (${secondaryKeywordDensity.toFixed(2)}%, nên 0.3-0.8%)`);
      score += 3;
    } else if (secondaryKeywordDensity > 1.2) {
      recommendations.push(`Giảm mật độ từ khóa phụ (${secondaryKeywordDensity.toFixed(2)}%, nên 0.3-0.8%)`);
      score += 1;
    } else if (secondaryKeywordDensity > 0) {
      recommendations.push(`Tăng mật độ từ khóa phụ (${secondaryKeywordDensity.toFixed(2)}%, nên 0.3-0.8%)`);
      score += 2;
    }
  } else {
    // No secondary keywords, give neutral score
    score += 2;
  }

  // Total keyword density (5 points) - optimal is 1.5-2.5%
  if (totalKeywordDensity >= 1.5 && totalKeywordDensity <= 2.5) {
    score += 5;
  } else if (totalKeywordDensity > 2.5 && totalKeywordDensity <= 3.5) {
    recommendations.push(`Tổng mật độ từ khóa hơi cao (${totalKeywordDensity.toFixed(2)}%, nên 1.5-2.5%)`);
    score += 3;
  } else if (totalKeywordDensity > 3.5) {
    recommendations.push(`Giảm tổng mật độ từ khóa (${totalKeywordDensity.toFixed(2)}%, nên 1.5-2.5%)`);
    score += 1;
  } else if (totalKeywordDensity > 0) {
    recommendations.push(`Tăng tổng mật độ từ khóa (${totalKeywordDensity.toFixed(2)}%, nên 1.5-2.5%)`);
    score += 2;
  }

  // Images have alt text (10 points)
  if (imageAnalysis.total > 0) {
    if (imageAnalysis.withoutAlt === 0) {
      score += 10;
    } else {
      recommendations.push(`Thêm alt text cho ${imageAnalysis.withoutAlt} hình ảnh`);
      score += Math.max(0, 10 - (imageAnalysis.withoutAlt * 2));
    }
  } else {
    // No images - neutral, don't penalize
    score += 5;
  }

  return {
    score: Math.min(100, score),
    primaryKeywordDensity,
    secondaryKeywordDensity,
    totalKeywordDensity,
    h1HasKeyword,
    titleHasKeyword,
    metaHasKeyword,
    keywordInFirstParagraph,
    imagesWithoutAlt: imageAnalysis.withoutAlt,
    totalImages: imageAnalysis.total,
    wordCount,
    primaryKeywordCount,
    secondaryKeywordCount,
    recommendations
  };
}

// ============================================
// READABILITY SCORING UTILITIES (Vietnamese)
// ============================================

/**
 * Calculate average sentence length
 * Updated to include colon (:) as sentence terminator
 */
export function calculateAvgSentenceLength(text: string): number {
  const sentences = text.split(/[.!?:]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  const totalWords = sentences.reduce((sum, sentence) => {
    const words = sentence.trim().split(/\s+/).filter(Boolean).length;
    return sum + words;
  }, 0);

  return totalWords / sentences.length;
}

/**
 * Find sentences that are too long (> 25 words for Vietnamese)
 */
export function findLongSentences(text: string): number {
  const sentences = text.split(/[.!?:]+/).filter(s => s.trim().length > 0);
  return sentences.filter(sentence => {
    const words = sentence.trim().split(/\s+/).filter(Boolean).length;
    return words > 25;
  }).length;
}

/**
 * Calculate average word length
 */
export function calculateAvgWordLength(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const totalChars = words.reduce((sum, word) => sum + word.length, 0);
  return totalChars / words.length;
}

/**
 * Find difficult paragraphs (too long or complex)
 */
export function findDifficultParagraphs(htmlContent: string): string[] {
  const textContent = stripHTML(htmlContent);
  const paragraphs = textContent.split(/\n\n+/).filter(p => p.trim().length > 0);

  const difficult: string[] = [];

  paragraphs.forEach(paragraph => {
    const words = paragraph.split(/\s+/).filter(Boolean).length;
    const sentences = paragraph.split(/[.!?:]+/).filter(s => s.trim().length > 0).length;

    // Paragraph is difficult if:
    // - More than 150 words
    // - Average sentence length > 30 words
    if (words > 150 || (sentences > 0 && words / sentences > 30)) {
      // Get first 100 characters for preview
      const preview = paragraph.substring(0, 100) + (paragraph.length > 100 ? '...' : '');
      difficult.push(preview);
    }
  });

  return difficult;
}

/**
 * Analyze readability and generate comprehensive score
 * Based on Semrush methodology adapted for Vietnamese
 */
export function analyzeReadability(htmlContent: string): ReadabilityAnalysis {
  const textContent = stripHTML(htmlContent);

  if (!textContent.trim()) {
    return {
      score: 0,
      grade: 'N/A',
      avgSentenceLength: 0,
      longSentences: 0,
      avgWordLength: 0,
      difficultParagraphs: [],
      issues: [],
      recommendations: ['Thêm nội dung để phân tích khả năng đọc']
    };
  }

  const avgSentenceLength = calculateAvgSentenceLength(textContent);
  const longSentences = findLongSentences(textContent);
  const avgWordLength = calculateAvgWordLength(textContent);
  const difficultParagraphs = findDifficultParagraphs(htmlContent);

  // Find detailed issues for clickable highlighting
  const issues = findReadabilityIssues(textContent, htmlContent);

  let score = 100;
  const recommendations: string[] = [];

  // Penalty for long sentences (ideal: 15-20 words for Vietnamese)
  if (avgSentenceLength > 25) {
    score -= 20;
    recommendations.push(`Câu trung bình quá dài (${avgSentenceLength.toFixed(1)} từ). Nên giữ ở 15-20 từ.`);
  } else if (avgSentenceLength > 20) {
    score -= 10;
    recommendations.push(`Một số câu hơi dài. Nên rút ngắn để dễ đọc hơn.`);
  }

  // Penalty for number of long sentences
  if (longSentences > 5) {
    score -= 15;
    recommendations.push(`Có ${longSentences} câu quá dài (>25 từ). Nên chia nhỏ.`);
  } else if (longSentences > 2) {
    score -= 8;
  }

  // Penalty for difficult paragraphs
  if (difficultParagraphs.length > 3) {
    score -= 15;
    recommendations.push(`Có ${difficultParagraphs.length} đoạn văn quá dài hoặc phức tạp. Nên chia nhỏ.`);
  } else if (difficultParagraphs.length > 0) {
    score -= 8;
  }

  // Bonus for good readability
  if (avgSentenceLength >= 12 && avgSentenceLength <= 20 && longSentences === 0) {
    recommendations.push('✓ Độ dài câu tốt');
  }

  if (difficultParagraphs.length === 0 && textContent.split(/\s+/).length > 100) {
    recommendations.push('✓ Đoạn văn dễ đọc');
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const grade = getReadabilityGrade(finalScore);

  return {
    score: finalScore,
    grade,
    avgSentenceLength,
    longSentences,
    avgWordLength,
    difficultParagraphs,
    issues,
    recommendations
  };
}

/**
 * Get readability grade based on Flesch Reading Ease score
 * Adapted from Semrush's grading system
 */
function getReadabilityGrade(score: number): string {
  if (score >= 90) return 'Rất dễ đọc';
  if (score >= 80) return 'Dễ đọc';
  if (score >= 70) return 'Khá dễ đọc';
  if (score >= 60) return 'Trung bình';
  if (score >= 50) return 'Khá khó đọc';
  if (score >= 30) return 'Khó đọc';
  return 'Rất khó đọc';
}

/**
 * Find detailed readability issues for clickable highlighting
 */
function findReadabilityIssues(textContent: string, htmlContent: string): ReadabilityIssue[] {
  const issues: ReadabilityIssue[] = [];

  // Step 1: Pre-process HTML to add sentence terminators after headings
  // This prevents headings from being merged with following sentences
  let processedHTML = htmlContent;

  // Replace closing heading tags with period + closing tag
  // Example: <h2>Title</h2> → <h2>Title.</h2>
  processedHTML = processedHTML.replace(/<\/h([1-6])>/gi, '.</h$1>');

  // Step 2: Extract text content with processed HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = processedHTML;
  let processedText = tempDiv.textContent || '';

  // Clean up double periods (in case heading already had period)
  processedText = processedText.replace(/\.\.+/g, '.');

  // Step 3: Split sentences with ENHANCED pattern
  // Include colon (:) as sentence terminator for Vietnamese content
  // Pattern matches: text + terminator (.!?:)
  const sentencePattern = /[^.!?:]+[.!?:]+/g;
  const sentences = processedText.match(sentencePattern) || [];

  sentences.forEach(sentence => {
    const trimmedSentence = sentence.trim();
    const wordCount = trimmedSentence.split(/\s+/).filter(Boolean).length;

    // Find long sentences (>25 words for Vietnamese)
    if (wordCount > 25) {
      const excerpt = trimmedSentence.length > 100
        ? trimmedSentence.substring(0, 100) + '...'
        : trimmedSentence;

      issues.push({
        type: 'long_sentence',
        text: trimmedSentence, // Now includes punctuation!
        excerpt,
        suggestion: `Câu này có ${wordCount} từ. Nên chia thành 2-3 câu ngắn hơn (15-20 từ/câu).`,
        position: textContent.indexOf(trimmedSentence.substring(0, 50)), // Search first 50 chars for better matching
        severity: wordCount > 35 ? 'high' : 'medium'
      });
    }
  });

  // Split into paragraphs
  const paragraphs = htmlContent.split(/<\/p>|<br\s*\/?>/gi).filter(p => {
    const text = stripHTML(p).trim();
    return text.length > 0;
  });

  paragraphs.forEach(paragraph => {
    const text = stripHTML(paragraph);
    const words = text.split(/\s+/).filter(Boolean);
    const sentenceCount = text.split(/[.!?:]+/).filter(s => s.trim().length > 0).length;

    // Find long paragraphs (>6 sentences or >150 words)
    if (sentenceCount > 6 || words.length > 150) {
      const excerpt = text.length > 150
        ? text.substring(0, 150) + '...'
        : text;

      issues.push({
        type: 'long_paragraph',
        text,
        excerpt,
        suggestion: `Đoạn văn này có ${sentenceCount} câu (${words.length} từ). Nên chia thành ${Math.ceil(sentenceCount / 4)} đoạn nhỏ hơn.`,
        position: htmlContent.indexOf(paragraph),
        severity: words.length > 200 ? 'high' : 'medium'
      });
    }
  });

  // Sort by position
  issues.sort((a, b) => a.position - b.position);

  return issues;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Strip HTML tags and get plain text
 * Properly decodes ALL HTML entities including &nbsp;, &amp;, etc.
 */
export function stripHTML(html: string): string {
  // First, create a temporary DOM element to decode HTML entities
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Get text content (this automatically decodes entities)
  let text = tempDiv.textContent || tempDiv.innerText || '';

  // Additional cleanup
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Highlight keywords in HTML content
 */
export function highlightKeywords(html: string, keywords: string[]): string {
  if (keywords.length === 0) return html;

  let result = html;
  keywords.forEach(keyword => {
    const regex = new RegExp(`(\\b${keyword}\\b)`, 'gi');
    result = result.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  });

  return result;
}

/**
 * Extract first N words from text
 */
export function getExcerpt(text: string, wordCount: number = 50): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= wordCount) return text;
  return words.slice(0, wordCount).join(' ') + '...';
}

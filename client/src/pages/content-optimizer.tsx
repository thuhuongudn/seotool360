import { useState, useRef, useEffect } from "react";
import { Loader2, FileText, Lightbulb, Eye, ChevronDown, ChevronUp, Highlighter, Search, TrendingUp, Copy } from "lucide-react";
import { Editor } from '@tinymce/tinymce-react';
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTokenManagement } from "@/hooks/use-token-management";
import { GEO_TARGET_CONSTANTS, LANGUAGE_CONSTANTS, DEFAULT_LANG } from "@/constants/google-ads-constants";
import { analyzeSEO, analyzeReadability, type SEOAnalysis, type ReadabilityAnalysis } from "@/lib/content-optimizer-utils";

interface ContentScores {
  seo: number;
  readability: number;
  toneOfVoice: number;
}

interface OptimizationTip {
  type: 'seo' | 'readability' | 'tone';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
}

function ContentOptimizerContent() {
  const toolId = useToolId("content-optimizer");
  const editorRef = useRef<any>(null);
  const [content, setContent] = useState("");

  // Separate primary and secondary keywords
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [secondaryKeywordInput, setSecondaryKeywordInput] = useState("");

  const [audienceLanguage, setAudienceLanguage] = useState(DEFAULT_LANG); // Default to Vietnamese
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [h1Title, setH1Title] = useState("");
  const [titleTag, setTitleTag] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // Left dock states
  const [activeTool, setActiveTool] = useState<'seo' | 'competitor' | null>('seo');

  // Competitor data tool states
  const [competitorLocation, setCompetitorLocation] = useState("2704"); // Default to Vietnam
  const [competitorLanguage, setCompetitorLanguage] = useState("vi"); // Default to Vietnamese
  const [competitorKeyword, setCompetitorKeyword] = useState("");
  const [competitorResults, setCompetitorResults] = useState<any[]>([]);
  const [isLoadingCompetitor, setIsLoadingCompetitor] = useState(false);

  // Scoring states
  const [scores, setScores] = useState<ContentScores>({
    seo: 0,
    readability: 0,
    toneOfVoice: 0,
  });

  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [readabilityAnalysis, setReadabilityAnalysis] = useState<ReadabilityAnalysis | null>(null);
  const [showSeoTips, setShowSeoTips] = useState(false);
  const [showReadabilityTips, setShowReadabilityTips] = useState(false);
  const [keywordHighlightEnabled, setKeywordHighlightEnabled] = useState(false);

  const [optimizationTips, setOptimizationTips] = useState<OptimizationTip[]>([]);

  // Readability optimizer states
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number | null>(null);
  const [optimizedText, setOptimizedText] = useState<string>("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [includeKeywordInOptimization, setIncludeKeywordInOptimization] = useState(false);

  const { toast } = useToast();
  const { canUseToken, executeWithToken, isProcessing: isTokenProcessing } = useTokenManagement();

  // Combine primary and secondary keywords for backward compatibility
  const allKeywords = primaryKeyword ? [primaryKeyword, ...secondaryKeywords] : secondaryKeywords;

  const handleAddSecondaryKeyword = () => {
    if (secondaryKeywordInput.trim() && !secondaryKeywords.includes(secondaryKeywordInput.trim())) {
      setSecondaryKeywords([...secondaryKeywords, secondaryKeywordInput.trim()]);
      setSecondaryKeywordInput("");
    }
  };

  const handleRemoveSecondaryKeyword = (keyword: string) => {
    setSecondaryKeywords(secondaryKeywords.filter(k => k !== keyword));
  };

  // Toggle keyword highlighting in editor
  const toggleKeywordHighlight = () => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const currentContent = editor.getContent();

    if (!keywordHighlightEnabled) {
      // Apply highlighting
      let highlightedContent = currentContent;

      // Highlight primary keyword in different color (green-yellow)
      if (primaryKeyword) {
        const escapedKeyword = primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!<[^>]*)(\\b${escapedKeyword}\\b)(?![^<]*>)`, 'gi');
        highlightedContent = highlightedContent.replace(regex, '<mark style="background-color: #bbf7d0; padding: 2px 0; font-weight: 600;">$1</mark>');
      }

      // Highlight secondary keywords in yellow
      secondaryKeywords.forEach(keyword => {
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!<[^>]*)(\\b${escapedKeyword}\\b)(?![^<]*>)`, 'gi');
        highlightedContent = highlightedContent.replace(regex, '<mark style="background-color: #fef08a; padding: 2px 0;">$1</mark>');
      });

      editor.setContent(highlightedContent);
      setKeywordHighlightEnabled(true);

      toast({
        title: "Đã bật highlight từ khóa",
        description: `Đang highlight ${allKeywords.length} từ khóa trong nội dung`,
      });
    } else {
      // Remove highlighting
      const cleanContent = currentContent.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
      editor.setContent(cleanContent);
      setKeywordHighlightEnabled(false);

      toast({
        title: "Đã tắt highlight từ khóa",
      });
    }
  };

  // Copy editor content to clipboard
  const handleCopyEditorContent = async () => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const htmlContent = editor.getContent();

    try {
      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "Đã copy nội dung",
        description: "Nội dung đã được sao chép với định dạng HTML",
      });
    } catch (err) {
      toast({
        title: "Lỗi",
        description: "Không thể copy nội dung",
        variant: "destructive",
      });
    }
  };

  // Auto-refresh highlighting when keywords change
  useEffect(() => {
    if (!editorRef.current || !keywordHighlightEnabled || allKeywords.length === 0) return;

    const editor = editorRef.current;

    // Remove old highlighting first
    let currentContent = editor.getContent();
    const cleanContent = currentContent.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');

    // Re-apply highlighting with current keywords
    let highlightedContent = cleanContent;

    // Highlight primary keyword in green
    if (primaryKeyword) {
      const escapedKeyword = primaryKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<!<[^>]*)(\\b${escapedKeyword}\\b)(?![^<]*>)`, 'gi');
      highlightedContent = highlightedContent.replace(regex, '<mark style="background-color: #bbf7d0; padding: 2px 0; font-weight: 600;">$1</mark>');
    }

    // Highlight secondary keywords in yellow
    secondaryKeywords.forEach(keyword => {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<!<[^>]*)(\\b${escapedKeyword}\\b)(?![^<]*>)`, 'gi');
      highlightedContent = highlightedContent.replace(regex, '<mark style="background-color: #fef08a; padding: 2px 0;">$1</mark>');
    });

    editor.setContent(highlightedContent);
    setContent(highlightedContent);
  }, [keywordHighlightEnabled, primaryKeyword, secondaryKeywords]);

  const handleGetImprovementIdeas = async () => {
    if (!primaryKeyword) {
      toast({
        title: "Thiếu từ khóa chính",
        description: "Vui lòng thêm từ khóa chính (Primary keyword)",
        variant: "destructive",
      });
      return;
    }

    if (!toolId) return;

    // Wrap with token consumption (1 token per analysis)
    await executeWithToken(toolId, 1, async () => {
      setIsAnalyzing(true);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Run SEO analysis with real scoring
      const seoResult = analyzeSEO(
        content,
        h1Title,
        titleTag,
        metaDescription,
        primaryKeyword,
        secondaryKeywords
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
                         rec.includes('meta') || rec.includes('mật độ') ? 'medium' : 'low';
        allTips.push({
          type: 'seo',
          severity,
          message: rec, // Keep full message (don't split)
          suggestion: rec
        });
      });

      // Add Readability recommendations
      readabilityResult.recommendations.forEach((rec) => {
        if (rec.startsWith('✓')) return; // Skip positive feedback

        allTips.push({
          type: 'readability',
          severity: rec.includes('quá dài') || rec.includes('phức tạp') ? 'high' : 'medium',
          message: rec, // Keep full message (don't split)
          suggestion: rec
        });
      });

      setOptimizationTips(allTips);
      setIsAnalyzing(false);

      toast({
        title: "Phân tích hoàn tất",
        description: `SEO Score: ${seoResult.score}/100 | Readability: ${readabilityResult.score}/100`,
      });

      return true; // executeWithToken expects a return value
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return "Good";
    if (score >= 50) return "Average";
    return "Needs work";
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return "bg-red-100 text-red-800 border-red-200";
    if (severity === 'medium') return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  // Domains to exclude from competitor results
  const EXCLUDE_DOMAINS = ['facebook.com', 'shopee.vn'];

  // Handle competitor insights (consumes 1 token)
  const handleUnlockInsights = async () => {
    if (!competitorKeyword.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập target keyword",
        variant: "destructive",
      });
      return;
    }

    if (!toolId) return;

    // Wrap with token consumption (1 token per analysis)
    await executeWithToken(toolId, 1, async () => {
      setIsLoadingCompetitor(true);

      try {
        const apiKey = import.meta.env.VITE_SERPER_API_KEY;

        if (!apiKey) {
          toast({
            title: "Lỗi cấu hình",
            description: "Thiếu VITE_SERPER_API_KEY trong .env.local",
            variant: "destructive",
          });
          setIsLoadingCompetitor(false);
          return false;
        }

        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: competitorKeyword.trim(),
            gl: 'vn',
            hl: 'vi'
          })
        });

        if (!response.ok) {
          throw new Error(`Serper API error: ${response.status}`);
        }

        const data = await response.json();

        // Filter out excluded domains
        const filteredResults = (data.organic || []).filter((result: any) => {
          const url = new URL(result.link);
          const hostname = url.hostname.replace('www.', '');
          return !EXCLUDE_DOMAINS.some(domain => hostname.includes(domain));
        });

        setCompetitorResults(filteredResults);

        toast({
          title: "Phân tích hoàn tất",
          description: `Tìm thấy ${filteredResults.length} kết quả từ Google Search`,
        });

        setIsLoadingCompetitor(false);
        return true;
      } catch (error) {
        console.error('Serper API error:', error);
        toast({
          title: "Lỗi khi gọi API",
          description: error instanceof Error ? error.message : "Vui lòng thử lại sau",
          variant: "destructive",
        });
        setIsLoadingCompetitor(false);
        return false;
      }
    });
  };

  // AI-powered readability optimizer
  const handleOptimizeText = async (issueIndex: number) => {
    if (!readabilityAnalysis?.issues?.[issueIndex]) return;

    const issue = readabilityAnalysis.issues[issueIndex];
    setSelectedIssueIndex(issueIndex);
    setIsOptimizing(true);

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("API key không được cấu hình. Vui lòng thêm VITE_OPENAI_API_KEY vào .env");
      }

      // Get language name for prompt
      const selectedLanguage = LANGUAGE_CONSTANTS.find(l => l.value === audienceLanguage);
      const languageName = selectedLanguage?.name || 'Vietnamese';

      // Build prompt based on issue type and keyword inclusion
      let prompt = `You are an SEO content writing expert. Optimize the following text for better readability in ${languageName}:\n\n"${issue.text}"\n\n`;

      if (issue.type === 'long_sentence') {
        prompt += `This is a long sentence (${issue.text.split(/\s+/).length} words). Break it into 2-3 shorter sentences (15-20 words each), preserving the meaning.`;
      } else if (issue.type === 'long_paragraph') {
        prompt += `This is a long paragraph. Break it into smaller paragraphs, each with 3-4 sentences, preserving the meaning.`;
      }

      if (includeKeywordInOptimization && primaryKeyword) {
        prompt += `\n\nIMPORTANT: Naturally insert the keyword "${primaryKeyword}" into the optimized text (if not already present).`;
      }

      prompt += `\n\nIMPORTANT: Return ONLY the optimized text in ${languageName}, with NO explanations or additional commentary.`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "N8n Toolkit - Content Optimizer",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
          verbosity: "low",
          reasoning_effort: "minimal",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.error?.message || `API trả về lỗi ${response.status}`;
        throw new Error(errorMessage);
      }

      const optimizedContent = data?.choices?.[0]?.message?.content;
      if (!optimizedContent) {
        throw new Error("API không trả về nội dung");
      }

      setOptimizedText(optimizedContent.trim());

      toast({
        title: "Tối ưu thành công",
        description: "Văn bản đã được tối ưu cho khả năng đọc",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi tối ưu",
        description: error.message || "Không thể tối ưu văn bản. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Scroll to and highlight issue text in editor
  // IMPROVED: Multi-strategy search with exact text matching
  const handleScrollToIssue = (issue: any, index: number) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    editor.focus();

    // Get editor body text (plain text version - same as how we analyze it)
    const body = editor.getBody();
    const bodyText = body.textContent || '';

    // Multi-strategy search (in order of preference)
    let searchText = '';
    let searchIndex = -1;

    // Strategy 1: Exact match with full sentence (best)
    searchText = issue.text.trim();
    searchIndex = bodyText.indexOf(searchText);

    // Strategy 2: Without trailing punctuation
    if (searchIndex === -1) {
      searchText = issue.text.replace(/[.!?]+\s*$/, '').trim();
      searchIndex = bodyText.indexOf(searchText);
    }

    // Strategy 3: First 10 words
    if (searchIndex === -1) {
      const words = issue.text.split(/\s+/).filter(Boolean);
      searchText = words.slice(0, Math.min(10, words.length)).join(' ');
      searchIndex = bodyText.indexOf(searchText);
    }

    // Strategy 4: Case-insensitive
    if (searchIndex === -1) {
      searchText = issue.text.trim();
      const lowerBody = bodyText.toLowerCase();
      const lowerSearch = searchText.toLowerCase();
      searchIndex = lowerBody.indexOf(lowerSearch);
    }

    // Strategy 5: First 5 words (most lenient)
    if (searchIndex === -1) {
      const words = issue.text.split(/\s+/).filter(Boolean);
      searchText = words.slice(0, Math.min(5, words.length)).join(' ');
      const lowerBody = bodyText.toLowerCase();
      const lowerSearch = searchText.toLowerCase();
      searchIndex = lowerBody.indexOf(lowerSearch);
    }

    if (searchIndex !== -1) {
      // Now map this index to the actual DOM text node
      const walker = document.createTreeWalker(
        body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentNode;
      let charCount = 0;

      // Walk through all text nodes
      while ((currentNode = walker.nextNode())) {
        const nodeText = currentNode.textContent || '';
        const nodeLength = nodeText.length;

        // Check if our searchIndex falls within this node
        if (charCount <= searchIndex && charCount + nodeLength > searchIndex) {
          // Found the node!
          const offsetInNode = searchIndex - charCount;
          const endOffset = Math.min(offsetInNode + searchText.length, nodeLength);

          // Create selection range
          const range = editor.dom.createRng();
          range.setStart(currentNode, offsetInNode);
          range.setEnd(currentNode, endOffset);

          editor.selection.setRng(range);
          editor.selection.scrollIntoView();

          toast({
            title: "✅ Đã tìm thấy",
            description: "Đã scroll và highlight đoạn văn cần sửa",
          });

          break;
        }

        charCount += nodeLength;
      }
    } else {
      toast({
        title: "Không tìm thấy",
        description: "Văn bản đã thay đổi hoặc không còn trong editor",
        variant: "destructive",
      });
    }

    // Select this issue for optimization
    setSelectedIssueIndex(index);
  };

  // Copy optimized text to clipboard
  const handleCopyOptimizedText = async () => {
    if (!optimizedText) return;

    try {
      await navigator.clipboard.writeText(optimizedText);
      toast({
        title: "Đã copy",
        description: "Văn bản đã tối ưu đã được copy vào clipboard. Paste vào editor để thay thế.",
      });
    } catch (error) {
      toast({
        title: "Lỗi copy",
        description: "Không thể copy vào clipboard. Vui lòng copy thủ công.",
        variant: "destructive",
      });
    }
  };

  // Replace original text with optimized version
  // TODO: Fix this function - currently disabled due to HTML vs plain text mismatch issues
  // Will be developed in future iteration
  const handleReplaceText = () => {
    if (!editorRef.current || !optimizedText || selectedIssueIndex === null) return;

    const issue = readabilityAnalysis?.issues?.[selectedIssueIndex];
    if (!issue) return;

    const editor = editorRef.current;
    const currentContent = editor.getContent();

    // Get plain text version
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentContent;
    const plainContent = tempDiv.textContent || '';

    // Try exact match first
    if (plainContent.includes(issue.text)) {
      // Found exact match - now replace in HTML
      // Use a more robust approach: find the text in the DOM and replace it
      const body = editor.getBody();
      const bodyText = body.textContent || '';

      if (bodyText.includes(issue.text)) {
        // Replace using innerHTML manipulation
        const bodyHTML = body.innerHTML;

        // Escape special regex characters in issue.text
        const escapedIssueText = issue.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Create a regex to find the text across HTML tags
        // This is tricky - we need to find the text even if it spans multiple tags

        // Simplified approach: Replace the entire content's text
        const newHTML = bodyHTML.replace(
          new RegExp(escapedIssueText.split(/\s+/).join('\\s*(?:<[^>]*>)?\\s*'), 'i'),
          optimizedText
        );

        if (newHTML !== bodyHTML) {
          editor.setContent(newHTML);
          setContent(newHTML);

          setOptimizedText("");
          setSelectedIssueIndex(null);
          setIncludeKeywordInOptimization(false);

          toast({
            title: "✅ Đã thay thế",
            description: "Văn bản đã được thay thế thành công",
          });

          setTimeout(() => {
            handleGetImprovementIdeas();
          }, 500);
          return;
        }
      }
    }

    // If we get here, replacement failed
    toast({
      title: "Không tìm thấy văn bản",
      description: "Vui lòng sử dụng nút Copy để thay thế thủ công.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex">
        {/* Right Dock */}
        <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-16 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col items-center py-4 gap-4 z-10">
          {/* SEO Tool Icon */}
          <button
            onClick={() => setActiveTool(activeTool === 'seo' ? null : 'seo')}
            className={`p-3 rounded-lg transition-colors ${
              activeTool === 'seo'
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            title="SEO Improvements"
          >
            <TrendingUp className="h-5 w-5" />
          </button>

          {/* Competitor Data Icon */}
          <button
            onClick={() => setActiveTool(activeTool === 'competitor' ? null : 'competitor')}
            className={`p-3 rounded-lg transition-colors ${
              activeTool === 'competitor'
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            title="Competitor Data"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* Dock Panel */}
        <div className={`fixed right-16 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-all duration-300 overflow-y-auto z-10 ${
          activeTool ? 'w-96' : 'w-0'
        }`}>
          {activeTool === 'seo' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                AI SEO Improvements
              </h2>

              {/* Audience Language */}
              <div className="space-y-2 mb-4">
                <Label className="text-sm font-medium">Audience language (optional)</Label>
                <Select value={audienceLanguage} onValueChange={setAudienceLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_CONSTANTS.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Get Improvement Ideas Button */}
              <Button
                onClick={handleGetImprovementIdeas}
                disabled={isAnalyzing || !primaryKeyword || !canUseToken || isTokenProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {(isAnalyzing || isTokenProcessing) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Get improvement ideas
              </Button>

              {/* Results Section */}
              {seoAnalysis && (
                <div className="mt-6 space-y-4">
                  {/* SEO Content Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">SEO content score</span>
                      <span className={`text-xl font-bold ${getScoreColor(scores.seo)}`}>
                        {getScoreLabel(scores.seo)}
                      </span>
                    </div>
                    <Progress value={scores.seo} className="h-2 mb-3" />
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          scores.seo >= 75 ? 'bg-green-50 text-green-700 border-green-200' :
                          scores.seo >= 50 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        SEO {scores.seo}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          scores.readability >= 75 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          scores.readability >= 50 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        Readability {scores.readability}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Tone ✓
                      </Badge>
                    </div>
                  </div>

                  {/* Detailed SEO Breakdown */}
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => setShowSeoTips(!showSeoTips)}
                      className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors mb-3"
                    >
                      <span>Chi tiết phân tích SEO</span>
                      {showSeoTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {showSeoTips && (
                      <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Từ khóa trong H1:</span>
                          <span className={seoAnalysis.h1HasKeyword ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {seoAnalysis.h1HasKeyword ? "✓ Có" : "✗ Không"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Từ khóa trong Title:</span>
                          <span className={seoAnalysis.titleHasKeyword ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {seoAnalysis.titleHasKeyword ? "✓ Có" : "✗ Không"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Từ khóa trong Meta:</span>
                          <span className={seoAnalysis.metaHasKeyword ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {seoAnalysis.metaHasKeyword ? "✓ Có" : "✗ Không"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Từ khóa ở đầu bài:</span>
                          <span className={seoAnalysis.keywordInFirstParagraph ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {seoAnalysis.keywordInFirstParagraph ? "✓ Có" : "✗ Không"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-muted-foreground">Mật độ từ khóa chính:</span>
                          <span className={seoAnalysis.primaryKeywordDensity >= 1 && seoAnalysis.primaryKeywordDensity <= 1.5 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                            {seoAnalysis.primaryKeywordDensity.toFixed(2)}%
                          </span>
                        </div>
                        {secondaryKeywords.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Mật độ từ khóa phụ:</span>
                            <span className={seoAnalysis.secondaryKeywordDensity >= 0.3 && seoAnalysis.secondaryKeywordDensity <= 0.8 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                              {seoAnalysis.secondaryKeywordDensity.toFixed(2)}%
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Tổng mật độ:</span>
                          <span className={seoAnalysis.totalKeywordDensity >= 1.5 && seoAnalysis.totalKeywordDensity <= 2.5 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                            {seoAnalysis.totalKeywordDensity.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-muted-foreground">Từ khóa chính:</span>
                          <span className="font-medium">{seoAnalysis.primaryKeywordCount} lần</span>
                        </div>
                        {secondaryKeywords.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Từ khóa phụ:</span>
                            <span className="font-medium">{seoAnalysis.secondaryKeywordCount} lần</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Tổng số từ:</span>
                          <span className="font-medium">{seoAnalysis.wordCount}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Readability Section */}
                  {readabilityAnalysis && (
                    <div className="pt-4 border-t">
                      <button
                        onClick={() => setShowReadabilityTips(!showReadabilityTips)}
                        className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors mb-3"
                      >
                        <span>Chi tiết Readability</span>
                        {showReadabilityTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {showReadabilityTips && (
                        <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Điểm đọc:</span>
                            <span className="font-medium">{readabilityAnalysis.grade}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Độ dài trung bình câu:</span>
                            <span className="font-medium">{readabilityAnalysis.avgSentenceLength.toFixed(1)} từ</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Điểm readability:</span>
                            <span className="font-medium">{readabilityAnalysis.grade}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!seoAnalysis && scores.seo === 0 && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-sm text-muted-foreground">
                  Click "Get improvement ideas" để phân tích
                </div>
              )}
            </div>
          )}

          {activeTool === 'competitor' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-indigo-600" />
                Competitor Data
              </h2>

              {/* Audience Location */}
              <div className="space-y-2 mb-4">
                <Label className="text-sm font-medium">Audience location</Label>
                <Select value={competitorLocation} onValueChange={setCompetitorLocation}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEO_TARGET_CONSTANTS.map((geo) => (
                      <SelectItem key={geo.value} value={geo.value}>
                        {geo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Audience Language */}
              <div className="space-y-2 mb-4">
                <Label className="text-sm font-medium">Audience language</Label>
                <Select value={competitorLanguage} onValueChange={setCompetitorLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_CONSTANTS.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Keyword */}
              <div className="space-y-2 mb-4">
                <Label className="text-sm font-medium">Your target keywords</Label>
                <Input
                  value={competitorKeyword}
                  onChange={(e) => setCompetitorKeyword(e.target.value)}
                  placeholder="Enter single keyword..."
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Only 1 keyword allowed
                </p>
              </div>

              {/* Unlock Insights Button */}
              <Button
                onClick={handleUnlockInsights}
                disabled={!competitorKeyword.trim() || !canUseToken || isTokenProcessing || isLoadingCompetitor}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {(isTokenProcessing || isLoadingCompetitor) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {!isTokenProcessing && !isLoadingCompetitor && <Lightbulb className="h-4 w-4 mr-2" />}
                Unlock insights
              </Button>

              {/* Titles Block - Competitor Results */}
              {competitorResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    Titles
                  </h3>
                  <div className="space-y-3">
                    {competitorResults.map((result, index) => (
                      <Card key={index} className="border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-1 line-clamp-2">
                                <a
                                  href={result.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {result.title}
                                </a>
                              </h4>
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {result.snippet}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-600 font-medium">
                                  {new URL(result.link).hostname.replace('www.', '')}
                                </span>
                                {result.position && (
                                  <Badge variant="outline" className="text-xs">
                                    #{result.position}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(result.title);
                                toast({
                                  title: "Đã sao chép",
                                  description: "Title đã được copy vào clipboard",
                                });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
                    <p className="flex items-center gap-2">
                      <Search className="h-3 w-3" />
                      Tìm thấy {competitorResults.length} kết quả (đã loại bỏ facebook.com, shopee.vn)
                    </p>
                  </div>
                </div>
              )}

              {competitorResults.length === 0 && !isLoadingCompetitor && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-muted-foreground">
                  <p>Nhập keyword và click "Unlock insights" để xem competitor titles</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${activeTool ? 'mr-[28rem]' : 'mr-16'}`}>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageNavigation breadcrumbItems={[{ label: "Content Optimizer" }]} backLink="/" />

        {/* Tool Description */}
        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-4 py-1 text-sm font-medium text-indigo-600 mb-4">
            <FileText className="h-4 w-4" />
            AI-Powered Content Optimization
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tối ưu hóa <span className="text-indigo-600">Content</span> toàn diện
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Phân tích và cải thiện nội dung theo 3 khía cạnh: SEO, Readability, và Tone of Voice.
            Nhận gợi ý từ AI dựa trên đối thủ cạnh tranh hàng đầu.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6">
          {/* Main Editor Area - Left 65% */}
          <div className="space-y-6">
            {/* Target Settings Card */}
            <Card>
              <CardHeader className={showMetadata ? "" : "pb-6"}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Track your content metrics in real time</CardTitle>
                    <CardDescription className="mt-1">
                      Provide your targets to get ideas for improvement based on your competitors' content.
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMetadata(!showMetadata)}
                  >
                    {showMetadata ? "Ẩn" : "Hiện"} Title Tag & Meta Description
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* H1 Title - Always visible */}
                <div className="space-y-2 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="h1-title" className="font-semibold">Tên sản phẩm/Blog (H1)</Label>
                    <span className="text-xs text-muted-foreground">{h1Title.length} ký tự</span>
                  </div>
                  <Input
                    id="h1-title"
                    value={h1Title}
                    onChange={(e) => setH1Title(e.target.value)}
                    placeholder="Nhập tên sản phẩm hoặc tiêu đề blog..."
                    className="w-full text-base font-semibold"
                  />
                  {allKeywords.length > 0 && h1Title && (
                    <p className="text-xs text-muted-foreground">
                      Từ khóa tìm thấy: {allKeywords.filter(kw => h1Title.toLowerCase().includes(kw.toLowerCase())).map(kw => (
                        <span
                          key={kw}
                          className={`inline-block px-1 rounded mx-0.5 ${
                            kw === primaryKeyword
                              ? 'bg-green-100 text-green-800 font-semibold'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {kw}
                        </span>
                      ))}
                      {allKeywords.filter(kw => h1Title.toLowerCase().includes(kw.toLowerCase())).length === 0 &&
                        <span className="text-orange-600">Chưa có từ khóa nào</span>
                      }
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground italic">
                    Đây là tiêu đề chính (thẻ H1) sẽ xuất hiện trên trang của bạn
                  </p>
                </div>

                {showMetadata && (
                  <div className="space-y-4 pb-4 border-b">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="title-tag">Title Tag</Label>
                        <span className="text-xs text-muted-foreground">{titleTag.length}/70</span>
                      </div>
                      <Input
                        id="title-tag"
                        value={titleTag}
                        onChange={(e) => setTitleTag(e.target.value)}
                        placeholder="Nhập title tag..."
                        maxLength={70}
                        className="w-full"
                      />
                      {allKeywords.length > 0 && titleTag && (
                        <p className="text-xs text-muted-foreground">
                          Từ khóa tìm thấy: {allKeywords.filter(kw => titleTag.toLowerCase().includes(kw.toLowerCase())).map(kw => (
                            <span
                              key={kw}
                              className={`inline-block px-1 rounded mx-0.5 ${
                                kw === primaryKeyword
                                  ? 'bg-green-100 text-green-800 font-semibold'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {kw}
                            </span>
                          ))}
                          {allKeywords.filter(kw => titleTag.toLowerCase().includes(kw.toLowerCase())).length === 0 &&
                            <span className="text-orange-600">Chưa có từ khóa nào</span>
                          }
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="meta-description">Mô tả trang (Meta Description)</Label>
                        <span className="text-xs text-muted-foreground">{metaDescription.length}/320</span>
                      </div>
                      <textarea
                        id="meta-description"
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        placeholder="Nhập mô tả trang..."
                        maxLength={320}
                        rows={4}
                        className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {allKeywords.length > 0 && metaDescription && (
                        <p className="text-xs text-muted-foreground">
                          Từ khóa tìm thấy: {allKeywords.filter(kw => metaDescription.toLowerCase().includes(kw.toLowerCase())).map(kw => (
                            <span
                              key={kw}
                              className={`inline-block px-1 rounded mx-0.5 ${
                                kw === primaryKeyword
                                  ? 'bg-green-100 text-green-800 font-semibold'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {kw}
                            </span>
                          ))}
                          {allKeywords.filter(kw => metaDescription.toLowerCase().includes(kw.toLowerCase())).length === 0 &&
                            <span className="text-orange-600">Chưa có từ khóa nào</span>
                          }
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Primary Keyword Input */}
                <div className="space-y-2 pb-3 border-b">
                  <Label htmlFor="primary-keyword" className="font-semibold text-base">
                    Primary Keyword <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="primary-keyword"
                    value={primaryKeyword}
                    onChange={(e) => setPrimaryKeyword(e.target.value)}
                    placeholder="Nhập từ khóa chính (1 từ khóa duy nhất)..."
                    className="font-medium"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mật độ đề xuất: <span className="font-medium text-green-700">1-1.5%</span>
                  </p>
                  {primaryKeyword && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        {primaryKeyword}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Secondary Keywords Input */}
                <div className="space-y-2">
                  <Label htmlFor="secondary-keywords" className="font-semibold text-base">
                    Secondary Keywords
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-keywords"
                      value={secondaryKeywordInput}
                      onChange={(e) => setSecondaryKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSecondaryKeyword()}
                      placeholder="Nhập từ khóa phụ và Enter..."
                    />
                    <Button onClick={handleAddSecondaryKeyword} size="sm">Add</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mật độ đề xuất (tổng): <span className="font-medium text-yellow-700">0.3-0.8%</span>
                    {' • '}
                    Tổng mật độ (Primary + Secondary): <span className="font-medium text-blue-700">1.5-2.5%</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {secondaryKeywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="px-3 py-1 cursor-pointer hover:bg-red-100"
                        onClick={() => handleRemoveSecondaryKeyword(keyword)}
                      >
                        {keyword} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editor Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Content Editor</CardTitle>
                    <CardDescription>
                      Paste your content or start writing. Use the toolbar for formatting.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyEditorContent}
                      disabled={!content}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy content
                    </Button>
                    <Button
                      variant={keywordHighlightEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={toggleKeywordHighlight}
                      disabled={allKeywords.length === 0}
                      className={keywordHighlightEnabled ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
                    >
                      <Highlighter className="h-4 w-4 mr-2" />
                      {keywordHighlightEnabled ? "Tắt Highlight" : "Highlight Từ khóa"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_KEY}
                    onInit={(_evt: any, editor: any) => editorRef.current = editor}
                    value={content}
                    onEditorChange={(newContent: string) => setContent(newContent)}
                    init={{
                      height: 1000,
                      menubar: false,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'help', 'wordcount'
                      ],
                      toolbar: 'undo redo | blocks | ' +
                        'bold italic underline forecolor backcolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'link image table | code fullscreen | removeformat help',
                      content_style: `
                        body {
                          font-family:Inter,Helvetica,Arial,sans-serif;
                          font-size:14px;
                          padding: 1rem;
                          line-height: 1.6;
                        }
                        mark {
                          background-color: #fef08a;
                          padding: 2px 0;
                          border-radius: 2px;
                        }
                      `,
                      branding: false,
                      promotion: false
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {content.replace(/<[^>]*>/g, '').length} ký tự • {content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} từ
                  </p>
                  {keywordHighlightEnabled && allKeywords.length > 0 && (
                    <p className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                      🔍 Highlighting {allKeywords.length} từ khóa
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - 35% */}
          <div className="space-y-6">
            {/* Content Metrics Card - At top */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Content Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Words</span>
                  <span className="font-semibold">
                    {(() => {
                      const contentWithH1 = h1Title ? `<h1>${h1Title}</h1>\n${content}` : content;
                      const textContent = contentWithH1.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                      return textContent.split(/\s+/).filter(Boolean).length;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Characters</span>
                  <span className="font-semibold">
                    {(() => {
                      const contentWithH1 = h1Title ? `<h1>${h1Title}</h1>\n${content}` : content;
                      return contentWithH1.replace(/<[^>]*>/g, '').length;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Target Keywords</span>
                  <span className="font-semibold">{allKeywords.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Language</span>
                  <span className="font-semibold text-sm">
                    {LANGUAGE_CONSTANTS.find(l => l.value === audienceLanguage)?.name || 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Readability Issues Card - Full height matching Content Editor */}
            {readabilityAnalysis && readabilityAnalysis.issues && readabilityAnalysis.issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Vấn đề Readability cần sửa</span>
                    <span className="text-sm text-muted-foreground font-normal">
                      {readabilityAnalysis.issues.length} vấn đề
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[1650px] overflow-y-auto">
                    {readabilityAnalysis.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                          selectedIssueIndex === index
                            ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50 dark:bg-blue-950'
                            : issue.severity === 'high'
                            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                            : issue.severity === 'medium'
                            ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
                            : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                        }`}
                        onClick={() => handleScrollToIssue(issue, index)}
                      >
                        <div className="space-y-2">
                          <div className="text-sm">
                            <div className="font-medium mb-1 flex items-center justify-between">
                              <span>{issue.type === 'long_sentence' ? '📝 Câu quá dài' : '📄 Đoạn văn quá dài'}</span>
                              <span className="text-xs text-muted-foreground">👆 Click để xem</span>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2 italic">
                              "{issue.excerpt}"
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                              💡 {issue.suggestion}
                            </div>
                          </div>

                          {/* Optimizer Controls */}
                          <div className="flex flex-col gap-2 pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`include-keyword-${index}`}
                                checked={selectedIssueIndex === index && includeKeywordInOptimization}
                                onChange={(e) => {
                                  if (selectedIssueIndex === index) {
                                    setIncludeKeywordInOptimization(e.target.checked);
                                  }
                                }}
                                disabled={selectedIssueIndex !== index}
                                className="rounded border-gray-300"
                              />
                              <label
                                htmlFor={`include-keyword-${index}`}
                                className="text-xs text-muted-foreground cursor-pointer"
                              >
                                Bao gồm Primary Keyword "{primaryKeyword || 'N/A'}"
                              </label>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOptimizeText(index);
                                }}
                                disabled={isOptimizing || !primaryKeyword}
                              >
                                {isOptimizing && selectedIssueIndex === index ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Đang tối ưu...
                                  </>
                                ) : (
                                  <>✨ Tối ưu</>
                                )}
                              </Button>

                              {selectedIssueIndex === index && optimizedText && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="flex-1 text-xs h-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyOptimizedText();
                                  }}
                                >
                                  📋 Copy
                                </Button>
                              )}
                            </div>

                            {/* Show optimized text */}
                            {selectedIssueIndex === index && optimizedText && (
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-xs">
                                <div className="font-medium text-green-700 dark:text-green-400 mb-1">
                                  ✅ Văn bản đã tối ưu:
                                </div>
                                <div className="text-muted-foreground">
                                  {optimizedText}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function LoadingToolShell() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang tải Content Optimizer...</p>
        </div>
      </main>
    </div>
  );
}

export default function ContentOptimizer() {
  const toolId = useToolId("content-optimizer");

  if (!toolId) {
    return <LoadingToolShell />;
  }

  return (
    <ToolPermissionGuard toolId={toolId} toolName="Content Optimizer">
      <ContentOptimizerContent />
    </ToolPermissionGuard>
  );
}

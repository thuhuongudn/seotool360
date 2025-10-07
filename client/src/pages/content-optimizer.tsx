import { useState, useRef, useEffect } from "react";
import { Loader2, FileText, Lightbulb, Eye, ChevronDown, ChevronUp, Highlighter, Search, TrendingUp, Copy, Image, Download, MessageSquare } from "lucide-react";
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
import { buildToneAnalysisPrompt } from "@/lib/tone-of-voice-prompts";

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
  const [activeTool, setActiveTool] = useState<'seo' | 'competitor' | 'images' | 'tone' | null>('seo');

  // Tone of Voice tool states
  const [toneIndustry, setToneIndustry] = useState("pharma");
  const [isAnalyzingTone, setIsAnalyzingTone] = useState(false);
  const [toneAnalysisResult, setToneAnalysisResult] = useState<any | null>(null);
  const [selectedCriterion, setSelectedCriterion] = useState<string | null>(null);

  // Competitor data tool states
  const [competitorLocation, setCompetitorLocation] = useState("2704"); // Default to Vietnam
  const [competitorLanguage, setCompetitorLanguage] = useState("vi"); // Default to Vietnamese
  const [competitorKeyword, setCompetitorKeyword] = useState("");
  const [competitorResults, setCompetitorResults] = useState<any[]>([]);
  const [isLoadingCompetitor, setIsLoadingCompetitor] = useState(false);

  // Toggle states for competitor sections
  const [showGoogleResults, setShowGoogleResults] = useState(true); // Default open after unlock
  const [showTopImages, setShowTopImages] = useState(false); // Default closed

  // Image results
  const [imageResults, setImageResults] = useState<any[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Page structure states
  const [selectedPageStructure, setSelectedPageStructure] = useState<{
    url: string;
    title: string;
    headings: { level: 'h1' | 'h2' | 'h3'; text: string }[];
  } | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlingUrl, setCrawlingUrl] = useState<string>("");

  // Image search tool states
  const [imageSearchMode, setImageSearchMode] = useState<'ai' | 'unsplash'>('unsplash');
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashResults, setUnsplashResults] = useState<any[]>([]);
  const [isLoadingUnsplash, setIsLoadingUnsplash] = useState(false);
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [generatedAiImage, setGeneratedAiImage] = useState<string | null>(null);
  const [showPromptGuide, setShowPromptGuide] = useState(false);

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
  const [showReadabilityCard, setShowReadabilityCard] = useState(true);

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
        description: "Vui lòng nhập từ khóa chính để bắt đầu phân tích",
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
      setShowReadabilityCard(true); // Auto-show card when new analysis is done

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
    if (score >= 75) return "Tốt";
    if (score >= 50) return "Trung bình";
    return "Cần cải thiện";
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return "bg-red-100 text-red-800 border-red-200";
    if (severity === 'medium') return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  // Domains to exclude from competitor results
  const EXCLUDE_DOMAINS = ['facebook.com', 'shopee.vn'];

  // Extract headings from Firecrawl markdown
  const extractHeadingsFromMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const headings: { level: 'h1' | 'h2' | 'h3'; text: string }[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        headings.push({ level: 'h3', text: trimmed.replace('### ', '') });
      } else if (trimmed.startsWith('## ')) {
        headings.push({ level: 'h2', text: trimmed.replace('## ', '') });
      } else if (trimmed.startsWith('# ')) {
        headings.push({ level: 'h1', text: trimmed.replace('# ', '') });
      }
    });

    return headings;
  };

  // Handle crawl page structure with Firecrawl
  const handleCrawlStructure = async (url: string, title: string) => {
    setIsCrawling(true);
    setCrawlingUrl(url);

    try {
      const apiKey = import.meta.env.VITE_FIRECRAWL_API_KEY;

      if (!apiKey) {
        toast({
          title: "Lỗi cấu hình",
          description: "Thiếu VITE_FIRECRAWL_API_KEY trong .env.local",
          variant: "destructive",
        });
        setIsCrawling(false);
        return;
      }

      // Call Firecrawl API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown'],
          onlyMainContent: true
          // NOTE: Do NOT add 'timeout' parameter - it causes SCRAPE_TIMEOUT errors
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const markdown = data.data?.markdown || '';

      // Extract headings from markdown
      const headings = extractHeadingsFromMarkdown(markdown);

      setSelectedPageStructure({
        url,
        title,
        headings
      });

      toast({
        title: "Crawl thành công",
        description: `Tìm thấy ${headings.length} headings trong trang`,
      });
    } catch (error) {
      console.error('Firecrawl error:', error);

      let errorMessage = "Vui lòng thử lại sau";

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timeout - Trang web quá chậm hoặc quá lớn để crawl";
        } else if (error.message.includes('408')) {
          errorMessage = "Timeout (408) - Trang web không phản hồi kịp thời. Thử trang khác hoặc đợi vài phút.";
        } else if (error.message.includes('403')) {
          errorMessage = "Bị chặn (403) - Website này chặn bot crawling";
        } else if (error.message.includes('429')) {
          errorMessage = "Quá nhiều request (429) - Đợi vài phút rồi thử lại";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Lỗi khi crawl",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCrawling(false);
      setCrawlingUrl("");
    }
  };

  // Handle AI Image generation with Gemini 2.5 Flash Image via OpenRouter
  const handleGenerateAiImage = async () => {
    if (!aiImagePrompt.trim()) {
      toast({
        title: "Thiếu mô tả ảnh",
        description: "Vui lòng mô tả ảnh bạn muốn tạo",
        variant: "destructive",
      });
      return;
    }

    if (!toolId) return;

    // Wrap with token consumption (1 token per generation)
    await executeWithToken(toolId, 1, async () => {
      setIsGeneratingAiImage(true);
      setGeneratedAiImage(null);

      try {
        const apiKey = import.meta.env.VITE_GEMINI_2_5_FLASH_IMG;

        if (!apiKey) {
          toast({
            title: "Lỗi cấu hình",
            description: "Thiếu VITE_GEMINI_2_5_FLASH_IMG trong .env.local",
            variant: "destructive",
          });
          setIsGeneratingAiImage(false);
          return;
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: aiImagePrompt.trim()
              }
            ],
            modalities: ['image', 'text']
          })
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Extract base64 image from response
        if (data.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
          const imageDataUrl = data.choices[0].message.images[0].image_url.url;
          setGeneratedAiImage(imageDataUrl);

          toast({
            title: "Tạo ảnh thành công",
            description: "Ảnh AI đã được tạo",
          });
        } else {
          throw new Error('Không nhận được ảnh từ API');
        }
      } catch (error) {
        console.error('AI Image generation error:', error);
        toast({
          title: "Lỗi tạo ảnh",
          description: error instanceof Error ? error.message : "Vui lòng thử lại sau",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingAiImage(false);
      }

      return true;
    });
  };

  // Handle Unsplash image search
  const handleUnsplashSearch = async () => {
    if (!unsplashQuery.trim()) {
      toast({
        title: "Thiếu từ khóa",
        description: "Vui lòng nhập từ khóa tìm kiếm ảnh",
        variant: "destructive",
      });
      return;
    }

    if (!toolId) return;

    // Wrap with token consumption (1 token per search)
    await executeWithToken(toolId, 1, async () => {
      setIsLoadingUnsplash(true);

      try {
        const apiKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

        if (!apiKey) {
          toast({
            title: "Lỗi cấu hình",
            description: "Thiếu VITE_UNSPLASH_ACCESS_KEY trong .env.local",
            variant: "destructive",
          });
          setIsLoadingUnsplash(false);
          return;
        }

        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashQuery)}&per_page=12`,
          {
            headers: {
              'Authorization': `Client-ID ${apiKey}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Unsplash API error: ${response.status}`);
        }

        const data = await response.json();
        setUnsplashResults(data.results || []);

        toast({
          title: "Tìm kiếm thành công",
          description: `Tìm thấy ${data.results?.length || 0} ảnh`,
        });
      } catch (error) {
        console.error('Unsplash error:', error);
        toast({
          title: "Lỗi khi tìm ảnh",
          description: error instanceof Error ? error.message : "Vui lòng thử lại sau",
          variant: "destructive",
        });
      } finally {
        setIsLoadingUnsplash(false);
      }

      return true;
    });
  };

  // Handle Tone of Voice analysis
  const handleAnalyzeTone = async () => {
    if (!content.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập nội dung để phân tích",
        variant: "destructive",
      });
      return;
    }

    return executeWithToken(toolId, 1, async () => {
      try {
        setIsAnalyzingTone(true);

        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

        if (!apiKey) {
          toast({
            title: "Lỗi cấu hình",
            description: "Thiếu VITE_OPENAI_API_KEY trong .env.local",
            variant: "destructive",
          });
          setIsAnalyzingTone(false);
          return false;
        }

        // Build prompt from template
        const criteriaPrompt = buildToneAnalysisPrompt(toneIndustry, content);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "N8N Toolkit - Content Optimizer",
          },
          body: JSON.stringify({
            model: "openai/gpt-5", // GPT-5 (alias for gpt-5-thinking)
            messages: [
              {
                role: "user",
                content: criteriaPrompt
              }
            ],
            reasoning_effort: "medium", // Medium reasoning depth for balanced analysis
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        const resultText = data.choices[0].message.content;

        // Extract JSON from markdown code blocks if present
        const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/) || resultText.match(/```\n([\s\S]*?)\n```/);
        const jsonText = jsonMatch ? jsonMatch[1] : resultText;

        const result = JSON.parse(jsonText.trim());

        setToneAnalysisResult(result);

        toast({
          title: "Phân tích hoàn tất",
          description: `Điểm: ${result.total_score}/15 - ${result.verdict}`,
        });

        return true;
      } catch (error) {
        console.error('Tone analysis error:', error);
        toast({
          title: "Lỗi khi phân tích",
          description: error instanceof Error ? error.message : "Vui lòng thử lại",
          variant: "destructive",
        });
        return false;
      } finally {
        setIsAnalyzingTone(false);
      }
    });
  };

  // Format criteria name for display
  const formatCriteriaName = (key: string): string => {
    const names: Record<string, string> = {
      'T1_neutral_tone': 'T1: Giọng điệu trung tính',
      'T2_medical_clarity': 'T2: Ngôn ngữ chuyên môn rõ ràng',
      'T3_no_exaggeration': 'T3: Tránh phóng đại cảm xúc',
      'T4_fair_balance': 'T4: Cân bằng lợi ích/rủi ro',
      'T5_evidence_citation': 'T5: Trích dẫn chứng cứ',
      'T6_expert_author': 'T6: Tác giả/duyệt chuyên môn',
      'T7_disclaimer_transparency': 'T7: Minh bạch thương mại',
      'T8_plain_structure': 'T8: Cấu trúc dễ hiểu',
      'T9_empathy_language': 'T9: Ngôn ngữ đồng cảm',
      'T10_update_freshness': 'T10: Tính cập nhật & chính xác',
    };
    return names[key] || key;
  };

  // Toggle Google results section
  const handleToggleGoogleResults = () => {
    if (!showGoogleResults) {
      // Opening Google results -> close images
      setShowTopImages(false);
    }
    setShowGoogleResults(!showGoogleResults);
  };

  // Toggle Top Images section
  const handleToggleTopImages = () => {
    if (!showTopImages) {
      // Opening images -> close Google results
      setShowGoogleResults(false);
    }
    setShowTopImages(!showTopImages);
  };

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
      setIsLoadingImages(true);

      try {
        const apiKey = import.meta.env.VITE_SERPER_API_KEY;

        if (!apiKey) {
          toast({
            title: "Lỗi cấu hình",
            description: "Thiếu VITE_SERPER_API_KEY trong .env.local",
            variant: "destructive",
          });
          setIsLoadingCompetitor(false);
          setIsLoadingImages(false);
          return false;
        }

        // Fetch both search results and images in parallel
        const [searchResponse, imagesResponse] = await Promise.all([
          fetch('https://google.serper.dev/search', {
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
          }),
          fetch('https://google.serper.dev/images', {
            method: 'POST',
            headers: {
              'X-API-KEY': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              q: competitorKeyword.trim(),
              location: 'Vietnam',
              gl: 'vn',
              hl: 'vi'
            })
          })
        ]);

        if (!searchResponse.ok) {
          throw new Error(`Serper Search API error: ${searchResponse.status}`);
        }

        if (!imagesResponse.ok) {
          throw new Error(`Serper Images API error: ${imagesResponse.status}`);
        }

        const searchData = await searchResponse.json();
        const imagesData = await imagesResponse.json();

        // Filter out excluded domains from search results
        const filteredResults = (searchData.organic || []).filter((result: any) => {
          const url = new URL(result.link);
          const hostname = url.hostname.replace('www.', '');
          return !EXCLUDE_DOMAINS.some(domain => hostname.includes(domain));
        });

        setCompetitorResults(filteredResults);
        setImageResults(imagesData.images || []);
        setShowGoogleResults(true); // Auto-open Google results after unlock

        toast({
          title: "Phân tích hoàn tất",
          description: `Tìm thấy ${filteredResults.length} kết quả và ${imagesData.images?.length || 0} hình ảnh`,
        });

        setIsLoadingCompetitor(false);
        setIsLoadingImages(false);
        return true;
      } catch (error) {
        console.error('Serper API error:', error);
        toast({
          title: "Lỗi khi gọi API",
          description: error instanceof Error ? error.message : "Vui lòng thử lại sau",
          variant: "destructive",
        });
        setIsLoadingCompetitor(false);
        setIsLoadingImages(false);
        return false;
      }
    });
  };

  // AI-powered readability optimizer
  const handleOptimizeText = async (issueIndex: number) => {
    if (!readabilityAnalysis?.issues?.[issueIndex]) return;
    if (!toolId) return;

    // Wrap with token consumption (1 token per optimization)
    await executeWithToken(toolId, 1, async () => {
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

      return true; // executeWithToken expects a return value
    });
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
            title="Cải thiện SEO"
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
            title="Dữ liệu đối thủ"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Images Tool Icon */}
          <button
            onClick={() => setActiveTool(activeTool === 'images' ? null : 'images')}
            className={`p-3 rounded-lg transition-colors ${
              activeTool === 'images'
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            title="Tìm ảnh"
          >
            <Image className="h-5 w-5" />
          </button>

          <button
            onClick={() => setActiveTool(activeTool === 'tone' ? null : 'tone')}
            className={`p-3 rounded-lg transition-colors ${
              activeTool === 'tone'
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            title="Tone of Voice"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>

        {/* Dock Panel */}
        <div className={`fixed right-16 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-all duration-300 overflow-y-auto z-20 shadow-lg ${
          activeTool ? 'w-96' : 'w-0'
        }`}>
          {activeTool === 'seo' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Cải Thiện SEO Bằng AI
              </h2>

              {/* Audience Language */}
              <div className="space-y-2 mb-4">
                <Label className="text-sm font-medium">Ngôn ngữ độc giả (tuỳ chọn)</Label>
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
                {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Nhận Gợi Ý Cải Thiện
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
                  Nhấn "Nhận Gợi Ý Cải Thiện" để bắt đầu phân tích
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

              {/* Location & Language - Same row, locked to Vietnam/Vietnamese */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Location */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Location</Label>
                    <Select value={competitorLocation} onValueChange={setCompetitorLocation}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2704">Vietnam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Language</Label>
                    <Select value={competitorLanguage} onValueChange={setCompetitorLanguage}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi">Vietnamese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  **Chỉ khả dụng ở Việt Nam và ngôn ngữ Tiếng Việt, các vùng/ngôn ngữ khác sẽ được thêm vào sớm.
                </p>
              </div>

              {/* Target Keyword */}
              <div className="space-y-2 mb-4">
                <Label className="text-sm font-medium">Từ khóa mục tiêu của bạn</Label>
                <Input
                  value={competitorKeyword}
                  onChange={(e) => setCompetitorKeyword(e.target.value)}
                  placeholder="Nhập từ khóa đơn..."
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Chỉ cho phép 1 từ khóa
                </p>
              </div>

              {/* Unlock Insights Button */}
              <Button
                onClick={handleUnlockInsights}
                disabled={!competitorKeyword.trim() || !canUseToken || isTokenProcessing || isLoadingCompetitor}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                title="Tốn 1 token"
              >
                {isLoadingCompetitor && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {!isLoadingCompetitor && <Lightbulb className="h-4 w-4 mr-2" />}
                Mở khóa thông tin
              </Button>

              {/* Titles Block - Competitor Results */}
              {competitorResults.length > 0 && (
                <div className="mt-6">
                  <div
                    className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded transition-colors"
                    onClick={handleToggleGoogleResults}
                  >
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                      Kết quả từ Google
                    </h3>
                    {showGoogleResults ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {showGoogleResults && (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {competitorResults.map((result, index) => (
                      <Card
                        key={index}
                        className="border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handleCrawlStructure(result.link, result.title)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {isCrawling && crawlingUrl === result.link && (
                                <div className="mb-2 flex items-center gap-2 text-xs text-indigo-600">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Đang crawl structures...</span>
                                </div>
                              )}
                              <h4 className="text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-2">
                                <a
                                  href={result.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {result.title}
                                </a>
                              </h4>

                              {result.snippet && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Mô tả:
                                  </p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {result.snippet}
                                  </p>
                                </div>
                              )}

                              {result.priceRange && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Giá:
                                  </p>
                                  <p className="text-xs font-medium text-green-700 dark:text-green-400">
                                    {result.priceRange}
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-green-600 font-medium">
                                  {new URL(result.link).hostname.replace('www.', '')}
                                </span>
                                {result.position && (
                                  <Badge variant="outline" className="text-xs">
                                    Vị trí #{result.position}
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
                    <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
                      <p className="flex items-center gap-2">
                        <Search className="h-3 w-3" />
                        Tìm thấy {competitorResults.length} kết quả (đã loại bỏ facebook.com, shopee.vn)
                      </p>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* Top Images Section - Only show when data is available */}
              {imageResults.length > 0 && (
                <div className="mt-6">
                  <div
                    className="flex items-center justify-between mb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded transition-colors"
                    onClick={handleToggleTopImages}
                  >
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4 text-indigo-600" />
                      Top hình ảnh (Google Img)
                    </h3>
                    {showTopImages ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {showTopImages && (
                    <div className="max-h-[400px] overflow-y-auto pr-2">
                      <div className="grid grid-cols-2 gap-3">
                        {imageResults.slice(0, 8).map((image, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                          >
                            <a
                              href={image.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={image.imageUrl}
                                alt={image.title || 'Google image result'}
                                className="w-full h-32 object-cover"
                                loading="lazy"
                              />
                            </a>
                            <div className="p-2 bg-white dark:bg-gray-900">
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {image.title || 'No title'}
                              </p>
                              <a
                                href={image.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:underline line-clamp-1"
                              >
                                {new URL(image.link).hostname.replace('www.', '')}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
                        <p className="flex items-center gap-2">
                          <Eye className="h-3 w-3" />
                          Hiển thị 8/{imageResults.length} hình ảnh
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {competitorResults.length === 0 && !isLoadingCompetitor && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-muted-foreground">
                  <p>Nhập từ khóa và nhấn "Mở khóa thông tin" để xem tiêu đề của đối thủ</p>
                </div>
              )}
            </div>
          )}

          {activeTool === 'images' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Image className="h-5 w-5 text-indigo-600" />
                Tìm Ảnh
              </h2>

              {/* Mode Selection */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={imageSearchMode === 'ai' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setImageSearchMode('ai');
                    setGeneratedAiImage(null); // Reset when switching
                  }}
                  className="flex-1 relative"
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  AI Image
                  <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">new</span>
                </Button>
                <Button
                  variant={imageSearchMode === 'unsplash' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImageSearchMode('unsplash')}
                  className="flex-1"
                >
                  <Image className="h-4 w-4 mr-2" />
                  Unsplash
                </Button>
              </div>

              {/* AI Image Mode */}
              {imageSearchMode === 'ai' && (
                <div className="space-y-4">
                  {/* Prompt Guide - Collapsible */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 space-y-2">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setShowPromptGuide(!showPromptGuide)}
                    >
                      <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        Hướng dẫn viết prompt hiệu quả
                      </h4>
                      {showPromptGuide ? (
                        <ChevronUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>

                    {/* Always show first 2 items (30%) */}
                    <ul className="text-xs text-indigo-600 dark:text-indigo-400 space-y-1 list-disc list-inside">
                      <li><strong>Chủ thể:</strong> Mô tả chi tiết đối tượng/cảnh (VD: "Vietnamese street food vendor")</li>
                      <li><strong>Phong cách:</strong> "photorealistic", "cinematic", "illustration", "watercolor"</li>
                    </ul>

                    {/* Expandable content */}
                    {showPromptGuide && (
                      <>
                        <ul className="text-xs text-indigo-600 dark:text-indigo-400 space-y-1 list-disc list-inside">
                          <li><strong>Ánh sáng:</strong> "golden hour", "soft lighting", "dramatic shadows"</li>
                          <li><strong>Camera:</strong> "35mm lens", "shallow depth of field", "f/1.8", "bokeh"</li>
                          <li><strong>Màu sắc:</strong> "warm tones", "vibrant colors", "muted palette"</li>
                          <li><strong>Tránh:</strong> "no text", "no watermark", "no blurry"</li>
                        </ul>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">
                          💡 Càng chi tiết, kết quả càng chính xác!
                        </p>
                      </>
                    )}

                    {!showPromptGuide && (
                      <button
                        onClick={() => setShowPromptGuide(true)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Xem thêm →
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mô tả ảnh bạn muốn tạo</Label>
                    <textarea
                      value={aiImagePrompt}
                      onChange={(e) => setAiImagePrompt(e.target.value)}
                      placeholder="VD: A photorealistic Vietnamese street food vendor at golden hour, serving pho, warm lighting, 35mm lens, shallow depth of field, cinematic, detailed textures, no text, no watermark"
                      rows={5}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-muted-foreground">
                      {aiImagePrompt.length}/500 ký tự
                    </p>
                  </div>

                  <Button
                    onClick={handleGenerateAiImage}
                    disabled={!aiImagePrompt.trim() || !canUseToken || isTokenProcessing || isGeneratingAiImage}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    title="Tốn 1 token"
                  >
                    {isGeneratingAiImage && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {!isGeneratingAiImage && <Lightbulb className="h-4 w-4 mr-2" />}
                    {isGeneratingAiImage ? 'Đang tạo ảnh...' : 'Tạo ảnh AI'}
                  </Button>

                  {/* AI Generated Image Result */}
                  {generatedAiImage && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Ảnh đã tạo</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = generatedAiImage;
                            link.download = `ai-image-${Date.now()}.png`;
                            link.click();

                            toast({
                              title: "Đang tải ảnh",
                              description: "Ảnh AI sẽ được tải xuống máy",
                            });
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Tải về
                        </Button>
                      </div>

                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <img
                          src={generatedAiImage}
                          alt="AI Generated"
                          className="w-full h-auto"
                        />
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Được tạo bởi Gemini 2.5 Flash Image qua <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">OpenRouter</a>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Unsplash Mode */}
              {imageSearchMode === 'unsplash' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tìm kiếm ảnh</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={unsplashQuery}
                        onChange={(e) => setUnsplashQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUnsplashSearch()}
                        placeholder="Nhập từ khóa tìm ảnh..."
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleUnsplashSearch}
                    disabled={!unsplashQuery.trim() || isLoadingUnsplash || !canUseToken || isTokenProcessing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    title="Tốn 1 token"
                  >
                    {isLoadingUnsplash && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {!isLoadingUnsplash && <Search className="h-4 w-4 mr-2" />}
                    Tìm kiếm
                  </Button>

                  {/* Unsplash Results */}
                  {unsplashResults.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          {unsplashResults.length} kết quả
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                        {unsplashResults.map((photo) => (
                          <div
                            key={photo.id}
                            className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-all"
                          >
                            <img
                              src={photo.urls.small}
                              alt={photo.alt_description || photo.description || 'Unsplash photo'}
                              className="w-full h-32 object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  // Download image
                                  const link = document.createElement('a');
                                  link.href = photo.urls.full;
                                  link.download = `unsplash-${photo.id}.jpg`;
                                  link.target = '_blank';
                                  link.click();

                                  toast({
                                    title: "Đang tải ảnh",
                                    description: "Ảnh sẽ được tải xuống máy",
                                  });
                                }}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Tải về
                              </Button>
                            </div>
                            <div className="p-2 bg-white dark:bg-gray-900">
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {photo.alt_description || photo.description || 'No description'}
                              </p>
                              <a
                                href={photo.user.links.html}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:underline"
                              >
                                {photo.user.name}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-muted-foreground mt-3">
                        Ảnh từ <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Unsplash</a>
                      </p>
                    </div>
                  )}

                  {unsplashResults.length === 0 && !isLoadingUnsplash && unsplashQuery && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-muted-foreground text-center">
                      <p>Không tìm thấy ảnh nào. Thử từ khóa khác.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTool === 'tone' && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                Tone of Voice
              </h2>

              <div className="space-y-4">
                {/* Industry Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Lĩnh vực</Label>
                  <Select value={toneIndustry} onValueChange={setToneIndustry} disabled>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pharma">Dược phẩm - YMYL</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-amber-600 dark:text-amber-400">📌 Ghi chú:</span> Hiện Tone of Voice chỉ khả dụng cho lĩnh vực Dược phẩm - YMYL.
                  </p>
                </div>

                {/* Analyze Button */}
                <Button
                  onClick={handleAnalyzeTone}
                  disabled={!content.trim() || isAnalyzingTone || !canUseToken || isTokenProcessing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  title="Phân tích Tone of Voice (tốn 1 token)"
                >
                  {isAnalyzingTone && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {!isAnalyzingTone && <MessageSquare className="h-4 w-4 mr-2" />}
                  {isAnalyzingTone ? 'Đang phân tích...' : 'Phân tích Tone of Voice'}
                </Button>

                {!content.trim() && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2">
                    Vui lòng nhập nội dung trong trình soạn thảo để phân tích.
                  </p>
                )}

                {/* Analysis Results */}
                {toneAnalysisResult && (
                  <div className="mt-4 space-y-4">
                    {/* Overall Score */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">Tổng điểm</span>
                        <Badge
                          className={`text-base ${
                            toneAnalysisResult.total_score >= 12 ? 'bg-green-500' :
                            toneAnalysisResult.total_score >= 10 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                        >
                          {toneAnalysisResult.total_score}/15
                        </Badge>
                      </div>
                      <Progress value={(toneAnalysisResult.total_score / 15) * 100} className="h-2" />
                      <p className="text-xs mt-2 font-medium">
                        {toneAnalysisResult.verdict === 'PASS' && (
                          <span className="text-green-600 dark:text-green-400">✅ ĐẠT - Đủ chuẩn xuất bản</span>
                        )}
                        {toneAnalysisResult.verdict === 'NEED REVIEW' && (
                          <span className="text-amber-600 dark:text-amber-400">⚠️ CẦN REVIEW - Cần chỉnh sửa thêm</span>
                        )}
                        {toneAnalysisResult.verdict === 'FAIL' && (
                          <span className="text-red-600 dark:text-red-400">❌ KHÔNG ĐẠT - Cần sửa đổi nghiêm trọng</span>
                        )}
                      </p>
                    </div>

                    {/* Critical Errors */}
                    {toneAnalysisResult.errors && toneAnalysisResult.errors.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                          🚫 Lỗi nghiêm trọng
                          <span className="text-xs font-normal">(Tự động FAIL)</span>
                        </h4>
                        <div className="space-y-2">
                          {toneAnalysisResult.errors.map((error: any, idx: number) => {
                            // Support both string and object format
                            const errorText = typeof error === 'string' ? error : error.description;
                            const errorCode = typeof error === 'object' ? error.code : null;
                            const violationText = typeof error === 'object' ? error.text : null;

                            return (
                              <div key={idx} className="bg-white dark:bg-gray-900 rounded p-3 space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold shrink-0">
                                    {errorCode || `E${idx + 1}`}
                                  </span>
                                  <p className="text-xs text-red-700 dark:text-red-300 font-medium flex-1">
                                    {errorText}
                                  </p>
                                </div>
                                {violationText && (
                                  <div className="ml-8 pl-3 border-l-2 border-red-300 dark:border-red-700">
                                    <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                      Đoạn vi phạm:
                                    </p>
                                    <p className="text-xs text-red-600 dark:text-red-400 italic bg-red-100 dark:bg-red-900/30 rounded px-2 py-1">
                                      "{violationText}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Detailed Criteria Scores */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Chi tiết đánh giá (click để xem lỗi)</h4>
                      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
                        {Object.entries(toneAnalysisResult.criteria || {}).map(([key, criterionData]) => {
                          const score = typeof criterionData === 'number' ? criterionData : criterionData?.score || 0;
                          const issues = typeof criterionData === 'object' && criterionData?.issues ? criterionData.issues : [];
                          const isExpanded = selectedCriterion === key;

                          return (
                            <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded overflow-hidden">
                              <button
                                onClick={() => setSelectedCriterion(isExpanded ? null : key)}
                                className="flex items-center justify-between w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <span className="text-xs text-foreground flex items-center gap-2">
                                  {formatCriteriaName(key)}
                                  {issues.length > 0 && (
                                    <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded">
                                      {issues.length} lỗi
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-xs ${
                                    score === 3 ? 'bg-green-50 text-green-700 border-green-200' :
                                    score === 2 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    score === 1 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                    {score}/3
                                  </Badge>
                                  {issues.length > 0 && (
                                    isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                  )}
                                </div>
                              </button>

                              {/* Issue Details */}
                              {isExpanded && issues.length > 0 && (
                                <div className="px-2 pb-2 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                                  {issues.map((issue: any, idx: number) => (
                                    <div key={idx} className="bg-white dark:bg-gray-900 rounded p-2 space-y-1">
                                      <div className="flex items-start gap-2">
                                        <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-medium shrink-0">
                                          #{idx + 1}
                                        </span>
                                        <div className="flex-1 space-y-1">
                                          {issue.text && (
                                            <div>
                                              <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Đoạn vi phạm:</p>
                                              <p className="text-xs text-red-600 dark:text-red-400 italic bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
                                                "{issue.text}"
                                              </p>
                                            </div>
                                          )}
                                          {issue.reason && (
                                            <div>
                                              <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Lý do:</p>
                                              <p className="text-xs text-gray-700 dark:text-gray-300">{issue.reason}</p>
                                            </div>
                                          )}
                                          {issue.suggestion && (
                                            <div>
                                              <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Gợi ý sửa:</p>
                                              <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
                                                {issue.suggestion}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {isExpanded && issues.length === 0 && (
                                <div className="px-2 pb-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                                  <p className="text-xs text-green-600 dark:text-green-400 text-center">
                                    ✓ Không có vấn đề nào được phát hiện
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${activeTool ? 'mr-[29rem]' : 'mr-16'}`}>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageNavigation breadcrumbItems={[{ label: "Tối Ưu Nội Dung" }]} backLink="/" />

        {/* Tool Description */}
        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-4 py-1 text-sm font-medium text-indigo-600 mb-4">
            <FileText className="h-4 w-4" />
            Tối Ưu Nội Dung Bằng AI
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tối Ưu Hóa <span className="text-indigo-600">Nội Dung</span> Toàn Diện
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Phân tích và cải thiện nội dung theo 3 khía cạnh: SEO, Độ dễ đọc và Giọng văn.
            Nhận gợi ý từ AI dựa trên đối thủ cạnh tranh hàng đầu.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6">
          {/* Main Editor Area - Left 65% */}
          <div className="space-y-6">
            {/* Target Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Theo dõi chỉ số nội dung theo thời gian thực</CardTitle>
                <CardDescription className="mt-1">
                  Cung cấp mục tiêu của bạn để nhận gợi ý cải thiện dựa trên nội dung đối thủ cạnh tranh.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* H1 Title */}
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

                {/* Title Tag & Meta Description - Always visible */}
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
                      placeholder="Nhập title tag hiển thị trên kết quả tìm kiếm..."
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
                    <p className="text-xs text-muted-foreground italic">
                      Title Tag xuất hiện trên kết quả tìm kiếm Google và tab trình duyệt
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="meta-description">Meta Description</Label>
                      <span className="text-xs text-muted-foreground">{metaDescription.length}/320</span>
                    </div>
                    <textarea
                      id="meta-description"
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder="Nhập mô tả trang hiển thị dưới tiêu đề trên kết quả tìm kiếm..."
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
                    <p className="text-xs text-muted-foreground italic">
                      Meta Description hiển thị dưới tiêu đề trên Google, thu hút người dùng click vào
                    </p>
                  </div>
                </div>

                {/* Primary Keyword Input */}
                <div className="space-y-2 pb-3 border-b">
                  <Label htmlFor="primary-keyword" className="font-semibold text-base">
                    Từ Khóa Chính <span className="text-red-500">*</span>
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
                    Từ Khóa Phụ
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-keywords"
                      value={secondaryKeywordInput}
                      onChange={(e) => setSecondaryKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSecondaryKeyword()}
                      placeholder="Nhập từ khóa phụ và nhấn Enter..."
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
                    <CardTitle>Trình Soạn Thảo Nội Dung</CardTitle>
                    <CardDescription>
                      Dán nội dung của bạn hoặc bắt đầu viết. Sử dụng thanh công cụ để định dạng.
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
                      Sao chép nội dung
                    </Button>
                    <Button
                      variant={keywordHighlightEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={toggleKeywordHighlight}
                      disabled={allKeywords.length === 0}
                      className={keywordHighlightEnabled ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
                    >
                      <Highlighter className="h-4 w-4 mr-2" />
                      {keywordHighlightEnabled ? "Tắt Highlight" : "Highlight Từ Khóa"}
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
            {/* Content Metrics / Structures Card - Conditional Display */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedPageStructure ? 'Cấu Trúc Trang' : 'Chỉ Số Nội Dung'}
                </CardTitle>
                {selectedPageStructure && (
                  <CardDescription className="text-xs mt-2">
                    <a
                      href={selectedPageStructure.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {selectedPageStructure.title}
                    </a>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {!selectedPageStructure ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Số từ</span>
                      <span className="font-semibold">
                        {(() => {
                          const contentWithH1 = h1Title ? `<h1>${h1Title}</h1>\n${content}` : content;
                          const textContent = contentWithH1.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                          return textContent.split(/\s+/).filter(Boolean).length;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Số ký tự</span>
                      <span className="font-semibold">
                        {(() => {
                          const contentWithH1 = h1Title ? `<h1>${h1Title}</h1>\n${content}` : content;
                          return contentWithH1.replace(/<[^>]*>/g, '').length;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Từ khóa mục tiêu</span>
                      <span className="font-semibold">{allKeywords.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Ngôn ngữ</span>
                      <span className="font-semibold text-sm">
                        {LANGUAGE_CONSTANTS.find(l => l.value === audienceLanguage)?.name || 'N/A'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Structures Display */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          Tìm thấy {selectedPageStructure.headings.length} headings
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPageStructure(null)}
                          className="text-xs h-7"
                        >
                          Đóng
                        </Button>
                      </div>

                      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                        {selectedPageStructure.headings.map((heading, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded text-sm ${
                              heading.level === 'h1'
                                ? 'bg-indigo-50 dark:bg-indigo-950 border-l-4 border-indigo-600 pl-3 font-bold'
                                : heading.level === 'h2'
                                ? 'bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 pl-6 font-semibold'
                                : 'bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400 pl-9 font-normal'
                            }`}
                          >
                            <span className="text-xs text-muted-foreground mr-2 uppercase">
                              {heading.level}
                            </span>
                            {heading.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Readability Issues Card - Full height matching Content Editor */}
            {readabilityAnalysis && readabilityAnalysis.issues && readabilityAnalysis.issues.length > 0 && showReadabilityCard && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vấn đề Readability cần sửa</CardTitle>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">
                      {readabilityAnalysis.issues.length} vấn đề
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowReadabilityCard(false);
                        setSelectedIssueIndex(null);
                        setOptimizedText("");
                      }}
                      className="text-xs h-7"
                    >
                      Đóng
                    </Button>
                  </div>
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
                                disabled={isOptimizing || !primaryKeyword || !canUseToken || isTokenProcessing}
                                title="Tốn 1 token"
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

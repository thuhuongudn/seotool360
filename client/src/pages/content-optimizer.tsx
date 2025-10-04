import { useState, useRef, useEffect } from "react";
import { Loader2, FileText, Lightbulb, Eye, ChevronDown, ChevronUp, Highlighter } from "lucide-react";
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
import { GEO_TARGET_CONSTANTS } from "@/constants/google-ads-constants";
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

  const [audienceLocation, setAudienceLocation] = useState("2704");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [h1Title, setH1Title] = useState("");
  const [titleTag, setTitleTag] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

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

  const { toast } = useToast();
  const { canUseToken } = useTokenManagement();

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

  // Auto-update content state when highlighting changes
  useEffect(() => {
    if (editorRef.current && keywordHighlightEnabled && allKeywords.length > 0) {
      const editor = editorRef.current;
      const currentContent = editor.getContent();
      setContent(currentContent);
    }
  }, [keywordHighlightEnabled, allKeywords]);

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
        message: rec.split('.')[0] || rec,
        suggestion: rec
      });
    });

    // Add Readability recommendations
    readabilityResult.recommendations.forEach((rec) => {
      if (rec.startsWith('✓')) return; // Skip positive feedback

      allTips.push({
        type: 'readability',
        severity: rec.includes('quá dài') || rec.includes('phức tạp') ? 'high' : 'medium',
        message: rec.split('.')[0] || rec,
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor Area - Left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
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

                <div className="space-y-2">
                  <Label>Audience location</Label>
                  <Select value={audienceLocation} onValueChange={setAudienceLocation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GEO_TARGET_CONSTANTS.slice(0, 10).map((geo) => (
                        <SelectItem key={geo.value} value={geo.value}>
                          {geo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

                <Button
                  onClick={handleGetImprovementIdeas}
                  disabled={isAnalyzing || !primaryKeyword || !canUseToken}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Get improvement ideas
                </Button>
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
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Editor
                    apiKey={import.meta.env.VITE_TINYMCE_KEY}
                    onInit={(_evt: any, editor: any) => editorRef.current = editor}
                    value={content}
                    onEditorChange={(newContent: string) => setContent(newContent)}
                    init={{
                      height: 500,
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

          {/* Right Sidebar - 1/3 */}
          <div className="space-y-6">
            {/* SEO Improvements Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">SEO Improvements</CardTitle>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Tips
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">SEO content score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(scores.seo)}`}>
                      {getScoreLabel(scores.seo)}
                    </span>
                  </div>
                  <Progress value={scores.seo} className="h-2" />
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
                </div>

                {/* Detailed SEO Breakdown */}
                {seoAnalysis && (
                  <div className="mt-4 space-y-2 pt-4 border-t">
                    <button
                      onClick={() => setShowSeoTips(!showSeoTips)}
                      className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors"
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
                            <span className="text-xs text-muted-foreground ml-1">(tối ưu: 1-1.5%)</span>
                          </span>
                        </div>
                        {secondaryKeywords.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Mật độ từ khóa phụ:</span>
                            <span className={seoAnalysis.secondaryKeywordDensity >= 0.3 && seoAnalysis.secondaryKeywordDensity <= 0.8 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                              {seoAnalysis.secondaryKeywordDensity.toFixed(2)}%
                              <span className="text-xs text-muted-foreground ml-1">(tối ưu: 0.3-0.8%)</span>
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Tổng mật độ:</span>
                          <span className={seoAnalysis.totalKeywordDensity >= 1.5 && seoAnalysis.totalKeywordDensity <= 2.5 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                            {seoAnalysis.totalKeywordDensity.toFixed(2)}%
                            <span className="text-xs text-muted-foreground ml-1">(tối ưu: 1.5-2.5%)</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-muted-foreground">Hình ảnh thiếu alt:</span>
                          <span className={seoAnalysis.imagesWithoutAlt === 0 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                            {seoAnalysis.imagesWithoutAlt}/{seoAnalysis.totalImages}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-muted-foreground">Từ khóa chính xuất hiện:</span>
                          <span className="font-medium">{seoAnalysis.primaryKeywordCount} lần</span>
                        </div>
                        {secondaryKeywords.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Từ khóa phụ xuất hiện:</span>
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
                )}

                {/* Detailed Readability Breakdown */}
                {readabilityAnalysis && (
                  <div className="mt-4 space-y-2 pt-4 border-t">
                    <button
                      onClick={() => setShowReadabilityTips(!showReadabilityTips)}
                      className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors"
                    >
                      <span>Chi tiết phân tích Readability</span>
                      {showReadabilityTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {showReadabilityTips && (
                      <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Độ dài câu trung bình:</span>
                          <span className={readabilityAnalysis.avgSentenceLength <= 20 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                            {readabilityAnalysis.avgSentenceLength.toFixed(1)} từ
                            <span className="text-xs text-muted-foreground ml-1">(tối ưu: 15-20)</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Câu quá dài (&gt;25 từ):</span>
                          <span className={readabilityAnalysis.longSentences === 0 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                            {readabilityAnalysis.longSentences}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Đoạn văn phức tạp:</span>
                          <span className={readabilityAnalysis.difficultParagraphs.length === 0 ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                            {readabilityAnalysis.difficultParagraphs.length}
                          </span>
                        </div>

                        {readabilityAnalysis.difficultParagraphs.length > 0 && (
                          <div className="mt-2 pt-2 border-t space-y-1">
                            <p className="font-medium text-orange-700">Đoạn văn cần cải thiện:</p>
                            {readabilityAnalysis.difficultParagraphs.slice(0, 3).map((para, idx) => (
                              <div key={idx} className="text-xs text-muted-foreground bg-orange-50 dark:bg-orange-950 p-2 rounded border border-orange-200">
                                {para}
                              </div>
                            ))}
                            {readabilityAnalysis.difficultParagraphs.length > 3 && (
                              <p className="text-xs text-muted-foreground italic">
                                +{readabilityAnalysis.difficultParagraphs.length - 3} đoạn khác...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {optimizationTips.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="text-sm font-semibold flex items-center justify-between">
                      SEO Improvements
                      <span className="text-xs text-muted-foreground">{optimizationTips.filter(t => t.type === 'seo').length}</span>
                    </h4>
                    {optimizationTips.filter(t => t.type === 'seo').map((tip, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${getSeverityColor(tip.severity)}`}
                      >
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <div className="font-medium">{tip.message}</div>
                            <div className="text-xs mt-1 opacity-90">{tip.suggestion}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {scores.seo === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nhấn "Get improvement ideas" để nhận gợi ý tối ưu
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Content Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Words</span>
                  <span className="font-semibold">{content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Characters</span>
                  <span className="font-semibold">{content.replace(/<[^>]*>/g, '').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Target Keywords</span>
                  <span className="font-semibold">{allKeywords.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Location</span>
                  <span className="font-semibold text-sm">
                    {GEO_TARGET_CONSTANTS.find(g => g.value === audienceLocation)?.name || 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
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

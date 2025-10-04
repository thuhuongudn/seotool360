import { useState, useRef } from "react";
import { Loader2, FileText, Lightbulb, RefreshCw, Eye } from "lucide-react";
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
  const [targetKeywords, setTargetKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [audienceLocation, setAudienceLocation] = useState("2704");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const [titleTag, setTitleTag] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // Scoring states
  const [scores, setScores] = useState<ContentScores>({
    seo: 0,
    readability: 0,
    toneOfVoice: 0,
  });

  const [optimizationTips, setOptimizationTips] = useState<OptimizationTip[]>([]);

  const { toast } = useToast();
  const { executeWithToken, canUseToken } = useTokenManagement();

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !targetKeywords.includes(keywordInput.trim())) {
      setTargetKeywords([...targetKeywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setTargetKeywords(targetKeywords.filter(k => k !== keyword));
  };

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

    // Simulate analysis - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock scores
    setScores({
      seo: 65,
      readability: 75,
      toneOfVoice: 80,
    });

    // Mock tips
    setOptimizationTips([
      {
        type: 'seo',
        severity: 'high',
        message: 'Add target keyword',
        suggestion: `Thêm từ khóa "${targetKeywords[0]}" vào tiêu đề H1`,
      },
      {
        type: 'seo',
        severity: 'medium',
        message: 'Add a title',
        suggestion: 'Thêm thẻ title cho trang',
      },
      {
        type: 'readability',
        severity: 'medium',
        message: 'Improve sentence length',
        suggestion: 'Một số câu quá dài, nên chia nhỏ để dễ đọc hơn',
      },
    ]);

    setIsAnalyzing(false);

    toast({
      title: "Phân tích hoàn tất",
      description: "Đã tạo gợi ý cải thiện cho nội dung của bạn",
    });
  };

  const handleGenerateMetadata = async () => {
    if (!content.trim()) {
      toast({
        title: "Chưa có nội dung",
        description: "Vui lòng nhập nội dung trước khi tạo metadata",
        variant: "destructive",
      });
      return;
    }

    // Simulate metadata generation - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setTitleTag(`${targetKeywords[0] || 'Tiêu đề'} - Hướng dẫn chi tiết và đánh giá`);
    setMetaDescription(`Khám phá ${targetKeywords[0] || 'nội dung'} với hướng dẫn toàn diện. Tìm hiểu các tính năng, lợi ích và cách sử dụng hiệu quả.`);

    toast({
      title: "Đã tạo metadata",
      description: "Title tag và meta description đã được tạo tự động",
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
                    {showMetadata ? "Hide" : "Show"} Title Tag and Meta Description
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showMetadata && (
                  <div className="space-y-4 pb-4 border-b">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="title-tag">Title Tag</Label>
                        <span className="text-xs text-muted-foreground">{titleTag.length}/60</span>
                      </div>
                      <Input
                        id="title-tag"
                        value={titleTag}
                        onChange={(e) => setTitleTag(e.target.value)}
                        placeholder="Nhập title tag..."
                        maxLength={60}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="meta-description">Meta Description</Label>
                        <span className="text-xs text-muted-foreground">{metaDescription.length}/150</span>
                      </div>
                      <textarea
                        id="meta-description"
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        placeholder="Nhập meta description..."
                        maxLength={150}
                        rows={3}
                        className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <Button
                      onClick={handleGenerateMetadata}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate metadata with AI
                    </Button>
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

                <div className="space-y-2">
                  <Label>Your target keywords</Label>
                  <div className="flex gap-2">
                    <Input
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                      placeholder="Nhập từ khóa và Enter..."
                    />
                    <Button onClick={handleAddKeyword} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {targetKeywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="px-3 py-1 cursor-pointer hover:bg-red-100"
                        onClick={() => handleRemoveKeyword(keyword)}
                      >
                        {keyword} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleGetImprovementIdeas}
                  disabled={isAnalyzing || targetKeywords.length === 0 || !canUseToken}
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
                <CardTitle>Content Editor</CardTitle>
                <CardDescription>
                  Paste your content or start writing. Use the toolbar for formatting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Editor
                    apiKey="your-api-key-here"
                    onInit={(_evt: any, editor: any) => editorRef.current = editor}
                    value={content}
                    onEditorChange={(newContent: string) => setContent(newContent)}
                    init={{
                      height: 500,
                      menubar: false,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                      ],
                      toolbar: 'undo redo | blocks | ' +
                        'bold italic forecolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'removeformat | help',
                      content_style: 'body { font-family:Inter,Helvetica,Arial,sans-serif; font-size:14px; padding: 1rem; }'
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {content.replace(/<[^>]*>/g, '').length} ký tự • {content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} từ
                </p>
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
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      SEO {scores.seo}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      Readability {scores.readability}
                    </Badge>
                    <Badge variant="outline">
                      Tone ✓
                    </Badge>
                  </div>
                </div>

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
                  <span className="font-semibold">{targetKeywords.length}</span>
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

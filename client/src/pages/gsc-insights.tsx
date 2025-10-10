import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, BarChart3, Search, Calendar, Download, AlertCircle, ExternalLink } from "lucide-react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTokenManagement } from "@/hooks/use-token-management";

type AnalysisMode = "queries-for-page" | "pages-for-keyword";
type TimePreset = "last7d" | "last28d" | "last90d";
type SearchType = "web" | "image" | "video" | "news";

interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCResponse {
  mode: AnalysisMode;
  value: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  searchType: string;
  dataState: string;
  totalResults: number;
  rows: GSCRow[];
}

function GSCInsightsContent() {
  const toolId = useToolId("gsc-insights");
  const [mode, setMode] = useState<AnalysisMode>("queries-for-page");
  const [siteUrl, setSiteUrl] = useState("");
  const [value, setValue] = useState("");
  const [timePreset, setTimePreset] = useState<TimePreset>("last28d");
  const [searchType, setSearchType] = useState<SearchType>("web");
  const [result, setResult] = useState<GSCResponse | null>(null);
  const { toast } = useToast();
  const { executeWithToken, canUseToken, isProcessing: isTokenProcessing } = useTokenManagement();

  const mutation = useMutation({
    mutationFn: async (payload: {
      siteUrl: string;
      mode: AnalysisMode;
      value: string;
      timePreset: TimePreset;
      searchType: SearchType;
    }) => {
      const response = await apiRequest("POST", "/api/gsc-insights", payload);
      return await response.json() as GSCResponse;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Phân tích hoàn tất",
        description: `Tìm thấy ${data.totalResults} kết quả`,
      });
    },
    onError: (error) => {
      const description = error instanceof Error ? error.message : "Không thể phân tích dữ liệu Search Console.";
      toast({
        title: "Có lỗi xảy ra",
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!siteUrl.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập Site URL.",
        variant: "destructive",
      });
      return;
    }

    if (!value.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: mode === "queries-for-page" ? "Vui lòng nhập URL cần phân tích." : "Vui lòng nhập keyword cần phân tích.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      siteUrl: siteUrl.trim(),
      mode,
      value: value.trim(),
      timePreset,
      searchType,
    };

    // Wrap API call with token consumption (1 token per analysis)
    if (!toolId) return;
    await executeWithToken(toolId, 1, async () => {
      mutation.mutate(payload);
      return true;
    });
  };

  const handleExportCSV = () => {
    if (!result || !result.rows.length) return;

    const headers = [
      mode === "queries-for-page" ? "Query" : "Page",
      "Clicks",
      "Impressions",
      "CTR (%)",
      "Position"
    ];

    const csvContent = [
      headers.join(","),
      ...result.rows.map((row) => [
        `"${row.keys[0]}"`,
        row.clicks,
        row.impressions,
        (row.ctr * 100).toFixed(2),
        row.position.toFixed(1),
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `gsc-insights-${mode}-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Xuất CSV thành công",
      description: `Đã xuất ${result.rows.length} dòng dữ liệu.`,
    });
  };

  const isSubmitting = mutation.isPending || isTokenProcessing;
  const hasResults = !!result && result.rows.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Search Console Insights" }]} backLink="/" />

        {/* Tool Description Section */}
        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-600/10 px-4 py-1 text-sm font-medium text-green-600 mb-4">
            <BarChart3 className="h-4 w-4" />
            Google Search Console Insights
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Phân tích <span className="text-green-600">hiệu suất nội dung</span> trên Google Search
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Xem top 100 queries/pages với dữ liệu clicks, impressions, CTR và position từ Google Search Console.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
          {/* Input Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình phân tích</CardTitle>
                <CardDescription>
                  Chọn chế độ phân tích và nhập thông tin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {/* Site URL */}
                  <div className="space-y-2">
                    <Label htmlFor="siteUrl">Site URL (GSC Property)</Label>
                    <Input
                      id="siteUrl"
                      placeholder="https://example.com"
                      value={siteUrl}
                      onChange={(e) => setSiteUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      URL phải khớp chính xác với property trong Search Console
                    </p>
                  </div>

                  {/* Analysis Mode */}
                  <div className="space-y-2">
                    <Label>Chế độ phân tích</Label>
                    <RadioGroup value={mode} onValueChange={(v) => setMode(v as AnalysisMode)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="queries-for-page" id="mode-queries" />
                        <Label htmlFor="mode-queries" className="font-normal cursor-pointer">
                          Queries cho URL (xem keyword nào driving traffic đến page)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pages-for-keyword" id="mode-pages" />
                        <Label htmlFor="mode-pages" className="font-normal cursor-pointer">
                          Pages cho Keyword (xem page nào ranking cho keyword)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Value Input */}
                  <div className="space-y-2">
                    <Label htmlFor="value">
                      {mode === "queries-for-page" ? "Page URL" : "Keyword"}
                    </Label>
                    <Input
                      id="value"
                      placeholder={
                        mode === "queries-for-page"
                          ? "https://example.com/blog/seo-tips"
                          : "seo tools"
                      }
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </div>

                  {/* Time Range */}
                  <div className="space-y-2">
                    <Label>Khoảng thời gian</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["last7d", "last28d", "last90d"] as TimePreset[]).map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          variant={timePreset === preset ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTimePreset(preset)}
                        >
                          {preset === "last7d" ? "7 ngày" : preset === "last28d" ? "28 ngày" : "90 ngày"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Search Type */}
                  <div className="space-y-2">
                    <Label htmlFor="searchType">Loại tìm kiếm</Label>
                    <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
                      <SelectTrigger id="searchType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="news">News</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submit Button */}
                  <Button type="submit" className="w-full" disabled={isSubmitting || !canUseToken}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Search className="h-4 w-4" />
                    Phân tích
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Kết quả phân tích</CardTitle>
                    {result && (
                      <CardDescription>
                        {result.startDate} đến {result.endDate} • {result.searchType}
                      </CardDescription>
                    )}
                  </div>
                  {hasResults && (
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <Download className="h-4 w-4" />
                      Xuất CSV
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isSubmitting && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Đang phân tích dữ liệu Search Console...</p>
                  </div>
                )}

                {!isSubmitting && !result && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Nhập thông tin và bấm "Phân tích" để xem kết quả.
                  </div>
                )}

                {!isSubmitting && result && result.rows.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Không tìm thấy dữ liệu cho {mode === "queries-for-page" ? "URL" : "keyword"} này trong khoảng thời gian đã chọn.
                    </AlertDescription>
                  </Alert>
                )}

                {hasResults && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Top {result.totalResults} kết quả</Badge>
                      <Badge variant="outline">{result.searchType}</Badge>
                    </div>

                    {/* Table */}
                    <div className="max-h-[600px] overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead className="min-w-[300px]">
                              {mode === "queries-for-page" ? "Query" : "Page"}
                            </TableHead>
                            <TableHead className="text-right">Clicks</TableHead>
                            <TableHead className="text-right">Impressions</TableHead>
                            <TableHead className="text-right">CTR</TableHead>
                            <TableHead className="text-right">Position</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.rows.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {mode === "pages-for-keyword" && row.keys[0].startsWith("http") ? (
                                  <a
                                    href={row.keys[0]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    {row.keys[0]}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  row.keys[0]
                                )}
                              </TableCell>
                              <TableCell className="text-right">{row.clicks.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{row.impressions.toLocaleString()}</TableCell>
                              <TableCell className="text-right">{(row.ctr * 100).toFixed(2)}%</TableCell>
                              <TableCell className="text-right">{row.position.toFixed(1)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
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
          <p className="text-sm text-muted-foreground">Đang tải công cụ Search Console Insights...</p>
        </div>
      </main>
    </div>
  );
}

export default function GSCInsights() {
  const toolId = useToolId("gsc-insights");

  if (!toolId) {
    return <LoadingToolShell />;
  }

  return (
    <ToolPermissionGuard toolId={toolId} toolName="Search Console Insights">
      <GSCInsightsContent />
    </ToolPermissionGuard>
  );
}

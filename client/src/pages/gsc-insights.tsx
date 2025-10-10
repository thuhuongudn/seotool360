import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, BarChart3, Search, Download, AlertCircle, ExternalLink, TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTokenManagement } from "@/hooks/use-token-management";

type AnalysisMode = "queries-for-page" | "pages-for-keyword" | "url-and-query";
type TimePreset = "last7d" | "last28d" | "last90d" | "custom";
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
  totalResults: number;
  rows: GSCRow[];
  timeSeriesData?: GSCRow[];
  previousTimeSeriesData?: GSCRow[];
  comparisonData?: {
    current: { clicks: number; impressions: number; ctr: number; position: number };
    previous: { clicks: number; impressions: number; ctr: number; position: number };
    changes: {
      clicks: number;
      clicksPercent: number;
      impressions: number;
      impressionsPercent: number;
      ctr: number;
      ctrPercent: number;
      position: number;
      positionPercent: number;
    };
  };
}

// Predefined GSC properties
const GSC_SITES = [
  "https://nhathuocvietnhat.vn",
];

function GSCInsightsContent() {
  const toolId = useToolId("gsc-insights");
  const [mode, setMode] = useState<AnalysisMode>("queries-for-page");
  const [siteUrl, setSiteUrl] = useState(GSC_SITES[0]);
  const [value, setValue] = useState("");
  const [timePreset, setTimePreset] = useState<TimePreset>("last28d");
  const [searchType, setSearchType] = useState<SearchType>("web");
  const [result, setResult] = useState<GSCResponse | null>(null);
  const [sortField, setSortField] = useState<"clicks" | "impressions" | "ctr" | "position" | null>("impressions");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Cải tiến 1: Custom date range
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Cải tiến 2: Comparison mode
  const [comparisonMode, setComparisonMode] = useState(false);

  // Cải tiến 3: Combined filter state
  const [selectedPageUrl, setSelectedPageUrl] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState("");

  // Cải tiến 4: Chart visibility toggles
  const [showClicks, setShowClicks] = useState(true);
  const [showImpressions, setShowImpressions] = useState(true);
  const [showCtr, setShowCtr] = useState(false);
  const [showPosition, setShowPosition] = useState(false);

  // Cải tiến 5: Selected rows for export
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  const { toast } = useToast();
  const { executeWithToken, canUseToken, isProcessing: isTokenProcessing } = useTokenManagement();

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiRequest("POST", "/api/gsc-insights", payload);
      return await response.json() as GSCResponse;
    },
    onSuccess: (data) => {
      console.log('[GSC Insights] Response data:', data);
      console.log('[GSC Insights] Has previousTimeSeriesData:', !!data.previousTimeSeriesData);
      console.log('[GSC Insights] previousTimeSeriesData length:', data.previousTimeSeriesData?.length);
      setResult(data);
      setSelectedRows(new Set());
      toast({
        title: "Phân tích hoàn tất",
        description: `Tìm thấy ${data.totalResults} kết quả`,
      });
    },
    onError: (error) => {
      toast({
        title: "Có lỗi xảy ra",
        description: error instanceof Error ? error.message : "Không thể phân tích dữ liệu.",
        variant: "destructive",
      });
    },
  });

  const calculateDateRange = () => {
    if (timePreset === "custom") {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    const days = timePreset === "last7d" ? 7 : timePreset === "last28d" ? 28 : 90;
    const startDateObj = new Date(today);
    startDateObj.setDate(startDateObj.getDate() - days);
    return { startDate: startDateObj.toISOString().split('T')[0], endDate };
  };

  const calculatePreviousPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays);

    return {
      previousStartDate: prevStart.toISOString().split('T')[0],
      previousEndDate: prevEnd.toISOString().split('T')[0],
    };
  };

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

    if (mode !== "url-and-query" && !value.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: mode === "queries-for-page" ? "Vui lòng nhập URL." : "Vui lòng nhập keyword.",
        variant: "destructive",
      });
      return;
    }

    if (timePreset === "custom" && (!customStartDate || !customEndDate)) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn ngày bắt đầu và kết thúc.",
        variant: "destructive",
      });
      return;
    }

    const dateRange = calculateDateRange();
    const payload: any = {
      siteUrl: siteUrl.trim(),
      mode,
      value: value.trim(),
      timePreset,
      searchType,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      comparisonMode,
    };

    if (mode === "url-and-query") {
      payload.pageUrl = selectedPageUrl;
      payload.keyword = selectedKeyword;
    }

    if (comparisonMode) {
      const prevPeriod = calculatePreviousPeriod(dateRange.startDate, dateRange.endDate);
      payload.previousStartDate = prevPeriod.previousStartDate;
      payload.previousEndDate = prevPeriod.previousEndDate;
    }

    if (!toolId) return;
    await executeWithToken(toolId, 1, async () => {
      mutation.mutate(payload);
      return true;
    });
  };

  const handleQueryClick = async (query: string) => {
    if (mode === "queries-for-page") {
      setMode("url-and-query");
      setSelectedPageUrl(value);
      setSelectedKeyword(query);
      setValue("");

      // Auto-execute analysis with combined filter
      const dateRange = calculateDateRange();
      const payload: any = {
        siteUrl: siteUrl.trim(),
        mode: "url-and-query",
        pageUrl: value.trim(),
        keyword: query,
        timePreset,
        searchType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        comparisonMode,
      };

      if (comparisonMode) {
        const prevPeriod = calculatePreviousPeriod(dateRange.startDate, dateRange.endDate);
        payload.previousStartDate = prevPeriod.previousStartDate;
        payload.previousEndDate = prevPeriod.previousEndDate;
      }

      if (!toolId) return;
      await executeWithToken(toolId, 1, async () => {
        mutation.mutate(payload);
        return true;
      });
    }
  };

  const handleSort = (field: "clicks" | "impressions" | "ctr" | "position") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortedRows = () => {
    if (!result || !sortField) return result?.rows || [];

    const sorted = [...result.rows].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortDirection === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return sorted;
  };

  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const toggleSelectAll = () => {
    if (!result) return;
    if (selectedRows.size === result.rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(result.rows.map((_, i) => i)));
    }
  };

  const handleExport = (exportAll: boolean) => {
    if (!result || !result.rows.length) return;

    const rowsToExport = exportAll
      ? result.rows
      : result.rows.filter((_, i) => selectedRows.has(i));

    if (rowsToExport.length === 0) {
      toast({
        title: "Không có dữ liệu",
        description: "Vui lòng chọn ít nhất một dòng để xuất.",
        variant: "destructive",
      });
      return;
    }

    if (exportFormat === "csv") {
      const headers = [
        mode === "queries-for-page" ? "Query" : mode === "pages-for-keyword" ? "Page" : "Date",
        "Clicks",
        "Impressions",
        "CTR (%)",
        "Position"
      ];

      const csvContent = [
        headers.join(","),
        ...rowsToExport.map((row) => [
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
        description: `Đã xuất ${rowsToExport.length} dòng dữ liệu.`,
      });
    } else {
      // Export as JSON
      const jsonData = rowsToExport.map(row => ({
        [mode === "queries-for-page" ? "query" : mode === "pages-for-keyword" ? "page" : "date"]: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: parseFloat((row.ctr * 100).toFixed(2)),
        position: parseFloat(row.position.toFixed(1)),
      }));

      const jsonString = JSON.stringify(jsonData, null, 2);

      // Copy to clipboard
      navigator.clipboard.writeText(jsonString).then(() => {
        toast({
          title: "Đã copy JSON",
          description: `Đã copy ${rowsToExport.length} dòng dữ liệu vào clipboard.`,
        });
      }).catch(() => {
        // Fallback: download as file
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `gsc-insights-${mode}-${Date.now()}.json`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Tải JSON thành công",
          description: `Đã tải ${rowsToExport.length} dòng dữ liệu.`,
        });
      });
    }
  };

  const isSubmitting = mutation.isPending || isTokenProcessing;
  const hasResults = !!result && result.rows.length > 0;

  const formatChartData = (timeSeriesData?: GSCRow[], previousTimeSeriesData?: GSCRow[]) => {
    if (!timeSeriesData) return [];

    const currentData = timeSeriesData.map(row => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr * 100,
      position: row.position,
    }));

    if (!comparisonMode || !previousTimeSeriesData || previousTimeSeriesData.length === 0) {
      return currentData;
    }

    // Sort both arrays by date
    const sortedCurrent = [...currentData].sort((a, b) => a.date.localeCompare(b.date));
    const sortedPrevious = [...previousTimeSeriesData]
      .map(row => ({
        clicks_prev: row.clicks,
        impressions_prev: row.impressions,
        ctr_prev: row.ctr * 100,
        position_prev: row.position,
      })); // Already sorted from API

    // Merge by index (align periods by relative position, not absolute date)
    return sortedCurrent.map((current, index) => ({
      ...current,
      ...(sortedPrevious[index] || {}),
    }));
  };

  const MetricCard = ({ label, current, previous, changePercent }: any) => {
    const isPositive = changePercent > 0;
    const isNegative = changePercent < 0;
    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const colorClass = isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-600";

    const formatValue = (val: number) => {
      if (label === "CTR") return `${(val * 100).toFixed(2)}%`;
      if (label === "Vị trí TB") return val.toFixed(1);
      return val.toLocaleString();
    };

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{label}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatValue(current)}</span>
              {comparisonMode && (
                <div className={`flex items-center gap-1 text-sm ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                  <span>{changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}%</span>
                </div>
              )}
            </div>
            {comparisonMode && previous !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Kỳ hiện tại:</span>
                <span className="font-medium">{formatValue(current)}</span>
                <span className="text-muted-foreground mx-1">•</span>
                <span className="text-muted-foreground">Kỳ trước:</span>
                <span className="font-medium">{formatValue(previous)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Search Console Insights" }]} backLink="/" />

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

        <div className="space-y-6">
          {/* Input Form - Compact horizontal layout */}
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình phân tích</CardTitle>
              <CardDescription>Chọn chế độ phân tích và nhập thông tin</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                {mode === "url-and-query" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="siteUrl">Site URL (GSC Property)</Label>
                        <Select value={siteUrl} onValueChange={setSiteUrl}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn site..." />
                          </SelectTrigger>
                          <SelectContent>
                            {GSC_SITES.map((site) => (
                              <SelectItem key={site} value={site}>
                                {site}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Chế độ phân tích</Label>
                        <RadioGroup value={mode} onValueChange={(v) => setMode(v as AnalysisMode)} className="flex flex-wrap gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="queries-for-page" id="mode-queries" />
                            <Label htmlFor="mode-queries" className="font-normal cursor-pointer">
                              Queries cho URL
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pages-for-keyword" id="mode-pages" />
                            <Label htmlFor="mode-pages" className="font-normal cursor-pointer">
                              Pages cho Keyword
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="url-and-query" id="mode-combined" />
                            <Label htmlFor="mode-combined" className="font-normal cursor-pointer">
                              URL + Query
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pageUrl">Page URL</Label>
                        <Input
                          id="pageUrl"
                          placeholder="https://example.com/page"
                          value={selectedPageUrl}
                          onChange={(e) => setSelectedPageUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="keyword">Keyword</Label>
                        <Input
                          id="keyword"
                          placeholder="seo tools"
                          value={selectedKeyword}
                          onChange={(e) => setSelectedKeyword(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Khoảng thời gian</Label>
                        <div className="flex gap-2">
                          {(["last7d", "last28d", "last90d"] as TimePreset[]).map((preset) => (
                            <Button
                              key={preset}
                              type="button"
                              variant={timePreset === preset ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTimePreset(preset)}
                              className="flex-1"
                            >
                              {preset === "last7d" ? "7d" : preset === "last28d" ? "28d" : "90d"}
                            </Button>
                          ))}
                        </div>
                      </div>
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
                      <div className="space-y-2">
                        <Label className="invisible">Actions</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="comparison-mode"
                            checked={comparisonMode}
                            onCheckedChange={setComparisonMode}
                          />
                          <Label htmlFor="comparison-mode" className="cursor-pointer text-sm">
                            So sánh kỳ trước
                          </Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="invisible">Submit</Label>
                        <Button type="submit" className="w-full" disabled={isSubmitting || !canUseToken}>
                          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                          <Search className="h-4 w-4" />
                          Phân tích
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="siteUrl">Site URL (GSC Property)</Label>
                      <Select value={siteUrl} onValueChange={setSiteUrl}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn site..." />
                        </SelectTrigger>
                        <SelectContent>
                          {GSC_SITES.map((site) => (
                            <SelectItem key={site} value={site}>
                              {site}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label>Chế độ & Giá trị</Label>
                      <div className="flex gap-2">
                        <Select value={mode} onValueChange={(v) => setMode(v as AnalysisMode)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="queries-for-page">Queries cho URL</SelectItem>
                            <SelectItem value="pages-for-keyword">Pages cho Keyword</SelectItem>
                            <SelectItem value="url-and-query">URL + Query</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder={
                            mode === "queries-for-page"
                              ? "https://example.com/blog/seo-tips"
                              : "seo tools"
                          }
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Khoảng thời gian</Label>
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {(["last7d", "last28d", "last90d", "custom"] as TimePreset[]).map((preset) => (
                            <Button
                              key={preset}
                              type="button"
                              variant={timePreset === preset ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTimePreset(preset)}
                              className="flex-1 px-2"
                            >
                              {preset === "last7d" ? "7d" : preset === "last28d" ? "28d" : preset === "last90d" ? "90d" : <CalendarIcon className="h-4 w-4" />}
                            </Button>
                          ))}
                        </div>
                        {timePreset === "custom" && (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              placeholder="Từ ngày"
                            />
                            <Input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              placeholder="Đến ngày"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="invisible">Actions</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="comparison-mode"
                            checked={comparisonMode}
                            onCheckedChange={setComparisonMode}
                          />
                          <Label htmlFor="comparison-mode" className="cursor-pointer text-sm">
                            So sánh
                          </Label>
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting || !canUseToken}>
                          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                          <Search className="h-4 w-4" />
                          Phân tích
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Comparison Metrics Cards */}
          {hasResults && comparisonMode && result.comparisonData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                label="Tổng số nhấp"
                current={result.comparisonData.current.clicks}
                previous={result.comparisonData.previous.clicks}
                changePercent={result.comparisonData.changes.clicksPercent}
              />
              <MetricCard
                label="Tổng số hiển thị"
                current={result.comparisonData.current.impressions}
                previous={result.comparisonData.previous.impressions}
                changePercent={result.comparisonData.changes.impressionsPercent}
              />
              <MetricCard
                label="CTR"
                current={result.comparisonData.current.ctr}
                previous={result.comparisonData.previous.ctr}
                changePercent={result.comparisonData.changes.ctrPercent}
              />
              <MetricCard
                label="Vị trí TB"
                current={result.comparisonData.current.position}
                previous={result.comparisonData.previous.position}
                changePercent={result.comparisonData.changes.positionPercent}
              />
            </div>
          )}

          {/* Time Series Chart */}
          {hasResults && result.timeSeriesData && result.timeSeriesData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Biểu đồ theo thời gian</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="show-clicks"
                        checked={showClicks}
                        onCheckedChange={(checked) => setShowClicks(checked as boolean)}
                      />
                      <Label htmlFor="show-clicks" className="text-sm cursor-pointer">Clicks</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="show-impressions"
                        checked={showImpressions}
                        onCheckedChange={(checked) => setShowImpressions(checked as boolean)}
                      />
                      <Label htmlFor="show-impressions" className="text-sm cursor-pointer">Impressions</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="show-ctr"
                        checked={showCtr}
                        onCheckedChange={(checked) => setShowCtr(checked as boolean)}
                      />
                      <Label htmlFor="show-ctr" className="text-sm cursor-pointer">CTR</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="show-position"
                        checked={showPosition}
                        onCheckedChange={(checked) => setShowPosition(checked as boolean)}
                      />
                      <Label htmlFor="show-position" className="text-sm cursor-pointer">Position</Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatChartData(result.timeSeriesData, result.previousTimeSeriesData)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    {showClicks && <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#3b82f6" name="Clicks (hiện tại)" />}
                    {showImpressions && <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#8b5cf6" name="Impressions (hiện tại)" />}
                    {showCtr && <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="#10b981" name="CTR (hiện tại)" />}
                    {showPosition && <Line yAxisId="right" type="monotone" dataKey="position" stroke="#f59e0b" name="Position (hiện tại)" />}
                    {comparisonMode && result.previousTimeSeriesData && showClicks && (
                      <Line yAxisId="left" type="monotone" dataKey="clicks_prev" stroke="#3b82f6" strokeDasharray="5 5" name="Clicks (kỳ trước)" />
                    )}
                    {comparisonMode && result.previousTimeSeriesData && showImpressions && (
                      <Line yAxisId="left" type="monotone" dataKey="impressions_prev" stroke="#8b5cf6" strokeDasharray="5 5" name="Impressions (kỳ trước)" />
                    )}
                    {comparisonMode && result.previousTimeSeriesData && showCtr && (
                      <Line yAxisId="right" type="monotone" dataKey="ctr_prev" stroke="#10b981" strokeDasharray="5 5" name="CTR (kỳ trước)" />
                    )}
                    {comparisonMode && result.previousTimeSeriesData && showPosition && (
                      <Line yAxisId="right" type="monotone" dataKey="position_prev" stroke="#f59e0b" strokeDasharray="5 5" name="Position (kỳ trước)" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          <div>
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
                    <div className="flex items-center gap-2">
                      <Select value={exportFormat} onValueChange={(v: "csv" | "json") => setExportFormat(v)}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="json">JSON (Copy)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport(false)}
                        disabled={selectedRows.size === 0}
                      >
                        <Download className="h-4 w-4" />
                        Xuất đã chọn ({selectedRows.size})
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport(true)}>
                        <Download className="h-4 w-4" />
                        Xuất toàn bộ
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isSubmitting && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Đang phân tích dữ liệu...</p>
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
                      Không tìm thấy dữ liệu trong khoảng thời gian đã chọn.
                    </AlertDescription>
                  </Alert>
                )}

                {hasResults && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Top {result.totalResults} kết quả</Badge>
                      <Badge variant="outline">{result.searchType}</Badge>
                    </div>

                    <div className="max-h-[600px] overflow-auto border rounded-lg">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedRows.size === result.rows.length && result.rows.length > 0}
                                onCheckedChange={toggleSelectAll}
                              />
                            </TableHead>
                            <TableHead className="min-w-[300px]">
                              {mode === "queries-for-page" ? "Query" : mode === "pages-for-keyword" ? "Page" : "Date"}
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort("clicks")}>
                              Clicks {sortField === "clicks" && (sortDirection === "desc" ? "↓" : "↑")}
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort("impressions")}>
                              Impressions {sortField === "impressions" && (sortDirection === "desc" ? "↓" : "↑")}
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort("ctr")}>
                              CTR {sortField === "ctr" && (sortDirection === "desc" ? "↓" : "↑")}
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort("position")}>
                              Position {sortField === "position" && (sortDirection === "desc" ? "↓" : "↑")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getSortedRows().map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedRows.has(idx)}
                                  onCheckedChange={() => toggleRowSelection(idx)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {mode === "queries-for-page" ? (
                                  <button
                                    onClick={() => handleQueryClick(row.keys[0])}
                                    className="text-blue-600 hover:underline text-left"
                                  >
                                    {row.keys[0]}
                                  </button>
                                ) : mode === "pages-for-keyword" && row.keys[0].startsWith("http") ? (
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
          <p className="text-sm text-muted-foreground">Đang tải công cụ...</p>
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

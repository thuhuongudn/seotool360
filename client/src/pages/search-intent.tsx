import { useMemo, useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Copy, BarChart3, Lightbulb } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import CopyMarkdownButton from "@/components/copy-markdown-button";
import MarkdownRenderer from "@/components/markdown-renderer";
import { useToolId } from "@/hooks/use-tool-id";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatNumber } from "@/lib/search-intent-utils";
import {
  DEFAULT_LANG,
  DEFAULT_GEO,
  GEO_TARGET_CONSTANTS,
  LANGUAGE_CONSTANTS,
  NETWORK_CONSTANTS
} from "@/constants/google-ads-constants";

// Chart component for monthly search trends
interface MonthlyTrendsChartProps {
  monthlyVolumes: MonthlySearchVolume[];
}

function MonthlyTrendsChart({ monthlyVolumes }: MonthlyTrendsChartProps) {
  const chartData = useMemo(() => {
    if (!monthlyVolumes || monthlyVolumes.length === 0) return [];

    return monthlyVolumes.map((volume) => {
      const monthNames = {
        'JANUARY': 'Tháng 1',
        'FEBRUARY': 'Tháng 2',
        'MARCH': 'Tháng 3',
        'APRIL': 'Tháng 4',
        'MAY': 'Tháng 5',
        'JUNE': 'Tháng 6',
        'JULY': 'Tháng 7',
        'AUGUST': 'Tháng 8',
        'SEPTEMBER': 'Tháng 9',
        'OCTOBER': 'Tháng 10',
        'NOVEMBER': 'Tháng 11',
        'DECEMBER': 'Tháng 12'
      } as const;

      const searches = parseInt(volume.monthlySearches) || 0;

      return {
        month: monthNames[volume.month as keyof typeof monthNames] || volume.month,
        searches,
        period: `${monthNames[volume.month as keyof typeof monthNames]} ${volume.year}`,
        fullDate: `${volume.year}-${String(Object.keys(monthNames).indexOf(volume.month) + 1).padStart(2, '0')}`
      };
    }).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [monthlyVolumes]);

  if (chartData.length === 0) {
    return null;
  }

  // Calculate color based on value for better visual appeal
  const maxValue = Math.max(...chartData.map(d => d.searches));

  return (
    <div className="w-full h-80 mt-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Xu hướng tìm kiếm theo tháng
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="month"
            stroke="#6b7280"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => formatNumber(value)}
          />
          <Tooltip
            formatter={(value: any) => [formatNumber(value), "Lượt tìm kiếm"]}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.period;
              }
              return label;
            }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar dataKey="searches" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => {
              // Color intensity based on value
              const intensity = entry.searches / maxValue;
              const color = `hsl(264, 83%, ${85 - intensity * 30}%)`; // Purple gradient
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type KeywordPlanNetwork = "GOOGLE_SEARCH" | "GOOGLE_SEARCH_AND_PARTNERS";

export interface MonthlySearchVolume {
  month: string;
  year: string;
  monthlySearches: string;
}

export interface KeywordIdeaRow {
  keyword: string;
  avgMonthlySearches: number | null;
  competition: string | null;
  competitionIndex: number | null;
  lowTopBid: number | null;
  highTopBid: number | null;
  range?: { min: number | null; max: number | null } | null;
  monthlySearchVolumes?: MonthlySearchVolume[];
}

export interface KeywordIdeaMeta {
  language: string;
  geoTargets: string[];
  network: KeywordPlanNetwork;
  totalResults: number;
  requestedKeywordCount: number;
  requestedAt: string;
  pageSize?: number;
}

export interface SearchIntentResponse {
  keywords: string[];
  meta: KeywordIdeaMeta;
  rows: KeywordIdeaRow[];
}

interface SearchIntentRequestPayload {
  keywords: string[];
  language: string;
  geoTargets: string[];
  network: KeywordPlanNetwork;
}


function SearchIntentContent() {
  const [keywordInput, setKeywordInput] = useState("");
  const [result, setResult] = useState<SearchIntentResponse | null>(null);
  const [language, setLanguage] = useState(DEFAULT_LANG);
  const [geoTarget, setGeoTarget] = useState(DEFAULT_GEO);
  const [network, setNetwork] = useState<KeywordPlanNetwork>("GOOGLE_SEARCH");

  // Content strategy states
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [contentStrategy, setContentStrategy] = useState<string>("");

  const { toast } = useToast();
  const [location] = useLocation();

  const trimmedKeyword = useMemo(() => keywordInput.trim(), [keywordInput]);

  const mutation = useMutation({
    mutationFn: async (payload: SearchIntentRequestPayload) => {
      const response = await apiRequest("POST", "/api/search-intent", payload);
      const data = (await response.json()) as SearchIntentResponse;

      const rowsWithRange = data.rows.map((row) => {
        const range = row.range;
        if (!range || (range.min == null && range.max == null)) {
          return row;
        }

        return {
          ...row,
          range: {
            min: typeof range.min === "number" ? range.min : null,
            max: typeof range.max === "number" ? range.max : null,
          },
        };
      });

      return {
        ...data,
        rows: rowsWithRange,
      };
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Đã phân tích Historical Metrics",
        description: `Tìm thấy dữ liệu cho từ khóa: ${data.keywords[0]}`,
      });
    },
    onError: (error) => {
      const description = error instanceof Error ? error.message : "Không thể phân tích historical metrics.";
      toast({
        title: "Có lỗi xảy ra",
        description,
        variant: "destructive",
      });
    },
  });

  // Parse query params và auto-populate + submit
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const queryKeyword = searchParams.get('q');
    const queryLanguage = searchParams.get('lang');
    const queryGeo = searchParams.get('geo');
    const queryNetwork = searchParams.get('network');

    console.log('🔍 [SearchIntent] Location changed:', location);
    console.log('🔍 [SearchIntent] Full URL:', window.location.href);
    console.log('🔍 [SearchIntent] Search params:', window.location.search);
    console.log('🔍 [SearchIntent] Query params:', { queryKeyword, queryLanguage, queryGeo, queryNetwork });

    // Set language and geo from query params if provided
    if (queryLanguage && LANGUAGE_CONSTANTS.find(lang => lang.value === queryLanguage)) {
      setLanguage(queryLanguage);
    }
    if (queryGeo && GEO_TARGET_CONSTANTS.find(geo => geo.value === queryGeo)) {
      setGeoTarget(queryGeo);
    }
    if (queryNetwork && (queryNetwork === "GOOGLE_SEARCH" || queryNetwork === "GOOGLE_SEARCH_AND_PARTNERS")) {
      setNetwork(queryNetwork as KeywordPlanNetwork);
    }

    if (queryKeyword) {
      const decodedKeyword = decodeURIComponent(queryKeyword);
      console.log('🔍 [SearchIntent] Decoded keyword:', decodedKeyword);

      // Set keyword input
      setKeywordInput(decodedKeyword);

      // Auto-submit if keyword is valid
      if (decodedKeyword.trim().length > 0) {
        // Use query params or current state for language/geo/network
        const finalLanguage = queryLanguage && LANGUAGE_CONSTANTS.find(lang => lang.value === queryLanguage) ? queryLanguage : language;
        const finalGeo = queryGeo && GEO_TARGET_CONSTANTS.find(geo => geo.value === queryGeo) ? queryGeo : geoTarget;
        const finalNetwork = queryNetwork && (queryNetwork === "GOOGLE_SEARCH" || queryNetwork === "GOOGLE_SEARCH_AND_PARTNERS") ? queryNetwork as KeywordPlanNetwork : network;

        const payload: SearchIntentRequestPayload = {
          keywords: [decodedKeyword.trim()],
          language: finalLanguage,
          geoTargets: [finalGeo],
          network: finalNetwork,
        };

        console.log('🔍 [SearchIntent] Auto-submitting with payload:', payload);
        console.log('🔍 [SearchIntent] Mutation isPending:', mutation.isPending);

        // Small delay to ensure input is set and avoid any race conditions
        setTimeout(() => {
          mutation.mutate(payload);
        }, 100);
      }
    }
  }, [location]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (trimmedKeyword.length === 0) {
      toast({
        title: "Chưa có từ khóa",
        description: "Vui lòng nhập một từ khóa để phân tích historical metrics.",
        variant: "destructive",
      });
      return;
    }

    const payload: SearchIntentRequestPayload = {
      keywords: [trimmedKeyword],
      language,
      geoTargets: [geoTarget],
      network,
    };

    mutation.mutate(payload);
  };

  const handleCopyResult = async () => {
    if (!result || !result.rows.length) {
      toast({
        title: "Không có dữ liệu",
        description: "Vui lòng phân tích trước khi sao chép.",
        variant: "destructive",
      });
      return;
    }

    if (!navigator.clipboard) {
      toast({
        title: "Không hỗ trợ sao chép",
        description: "Trình duyệt của bạn không hỗ trợ clipboard API.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      meta: result.meta,
      keywords: result.keywords,
      rows: result.rows,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast({
        title: "Đã sao chép",
        description: "Dữ liệu historical metrics đã được sao chép vào clipboard.",
      });
    } catch (error) {
      toast({
        title: "Sao chép thất bại",
        description: error instanceof Error ? error.message : "Không thể sao chép dữ liệu.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateContentStrategy = async () => {
    if (trimmedKeyword.length === 0) {
      toast({
        title: "Chưa có từ khóa",
        description: "Vui lòng nhập một từ khóa để xây dựng chiến lược nội dung.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingStrategy(true);
    setContentStrategy("");

    try {
      // Send request to n8n webhook
      const response = await fetch(
        "https://n8n.nhathuocvietnhat.vn/webhook/seo-tool-360-search-intent-2025-09-26",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ keyword: trimmedKeyword }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const webhookResponse = await response.json();

      // Parse the response - try different possible fields
      const content =
        webhookResponse.output ||
        webhookResponse.content ||
        webhookResponse.result ||
        JSON.stringify(webhookResponse, null, 2);

      setContentStrategy(content);

      toast({
        title: "Thành công!",
        description: "Chiến lược nội dung đã được tạo thành công.",
      });
    } catch (error) {
      console.error("Webhook error:", error);
      toast({
        title: "Có lỗi xảy ra",
        description: "Không thể tạo chiến lược nội dung. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const isSubmitting = mutation.isPending;
  const hasResults = !!result && result.rows.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Search Intent" }]} backLink="/" />

        {/* Tool Description Section */}
        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-600/10 px-4 py-1 text-sm font-medium text-purple-600 mb-4">
            <BarChart3 className="h-4 w-4" />
            Google Historical Metrics
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Phân tích <span className="text-purple-600">Search Intent</span> của từ khóa
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Khám phá chi tiết lịch sử tìm kiếm, độ cạnh tranh và xu hướng theo thời gian của một từ khóa cụ thể từ Google Ads Historical Metrics API.
          </p>
        </section>

        {/* Search Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card>
            <CardContent className="p-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="keyword">
                    Từ khóa cần phân tích
                  </label>
                  <div className="relative">
                    <input
                      id="keyword"
                      type="text"
                      placeholder="Ví dụ: elevit bà bầu"
                      value={keywordInput}
                      onChange={(event) => setKeywordInput(event.target.value)}
                      className="w-full px-4 py-3 border border-input rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chỉ nhập một từ khóa duy nhất để phân tích historical metrics chi tiết.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Ngôn ngữ</label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn ngôn ngữ" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        {LANGUAGE_CONSTANTS.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value} className="text-left">
                            {lang.name} ({lang.value})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {LANGUAGE_CONSTANTS.find(lang => lang.value === language)?.name || "Chọn ngôn ngữ"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Khu vực</label>
                    <Select value={geoTarget} onValueChange={setGeoTarget}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn khu vực" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        {GEO_TARGET_CONSTANTS.map((geo) => (
                          <SelectItem key={geo.value} value={geo.value} className="text-left">
                            {geo.name} ({geo.value})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {GEO_TARGET_CONSTANTS.find(geo => geo.value === geoTarget)?.name || "Chọn khu vực"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Mạng</label>
                    <Select value={network} onValueChange={(value) => setNetwork(value as KeywordPlanNetwork)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn mạng" />
                      </SelectTrigger>
                      <SelectContent>
                        {NETWORK_CONSTANTS.map((net) => (
                          <SelectItem key={net.value} value={net.value}>
                            {net.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {NETWORK_CONSTANTS.find(net => net.value === network)?.name || "Chọn mạng"}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <Button type="submit" disabled={isSubmitting || trimmedKeyword.length === 0} size="lg" className="px-8">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Phân tích Search Intent
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {isSubmitting && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-3" />
                  <p className="text-sm text-muted-foreground">Đang phân tích search intent...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!isSubmitting && result && (
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Kết quả phân tích</CardTitle>
                  <CardDescription>
                    Từ khóa: <strong>{result.keywords[0]}</strong> |
                    {result.meta && (
                      <span>
                        {' '}Ngôn ngữ: {LANGUAGE_CONSTANTS.find(lang => lang.value === result.meta.language)?.name || result.meta.language} ({result.meta.language}) |
                        Khu vực: {result.meta.geoTargets.map(geo => GEO_TARGET_CONSTANTS.find(g => g.value === geo)?.name || geo).join(", ")} ({result.meta.geoTargets.join(", ")}) |
                        Mạng: {result.meta.network.replace(/_/g, " ")}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button onClick={handleCopyResult} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy JSON
                </Button>
              </CardHeader>
              <CardContent>
                {hasResults ? (
                  <div className="space-y-6">
                    {/* Monthly Trends Chart */}
                    {result.rows.length > 0 && result.rows[0].monthlySearchVolumes && (
                      <MonthlyTrendsChart monthlyVolumes={result.rows[0].monthlySearchVolumes} />
                    )}

                    {/* Data Table */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                        Chi tiết dữ liệu
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Từ khóa</TableHead>
                            <TableHead>Số lượt tìm kiếm TB</TableHead>
                            <TableHead>Độ cạnh tranh</TableHead>
                            <TableHead>Điểm cạnh tranh</TableHead>
                            <TableHead>Bid thấp (₫)</TableHead>
                            <TableHead>Bid cao (₫)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.rows.map((row, index) => (
                            <TableRow key={`${row.keyword}-${index}`}>
                              <TableCell className="font-medium">{row.keyword}</TableCell>
                              <TableCell>{formatNumber(row.avgMonthlySearches)}</TableCell>
                              <TableCell className="capitalize">{row.competition ? row.competition.toLowerCase() : "-"}</TableCell>
                              <TableCell>{row.competitionIndex ?? "-"}</TableCell>
                              <TableCell>{formatCurrency(row.lowTopBid)}</TableCell>
                              <TableCell>{formatCurrency(row.highTopBid)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Không có dữ liệu historical metrics cho từ khóa này.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content Strategy Section */}
        {trimmedKeyword.length > 0 && (
          <div className="max-w-6xl mx-auto mt-8">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-orange-600" />
                  <CardTitle>Chiến lược nội dung cho từ khóa</CardTitle>
                </div>
                <CardDescription>
                  Tạo chiến lược nội dung chi tiết dựa trên từ khóa: <strong>{trimmedKeyword}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Button
                      onClick={handleGenerateContentStrategy}
                      disabled={isGeneratingStrategy || trimmedKeyword.length === 0}
                      size="lg"
                      className="px-8 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {isGeneratingStrategy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {isGeneratingStrategy ? "Đang tạo chiến lược..." : "Xây dựng chiến lược nội dung cho từ khóa"}
                    </Button>
                  </div>

                  {contentStrategy && (
                    <div className="mt-6 space-y-4">
                      <div className="flex justify-end">
                        <CopyMarkdownButton
                          content={contentStrategy}
                          size="sm"
                          variant="outline"
                          className=""
                        />
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
                        <MarkdownRenderer content={contentStrategy} className="text-sm" />
                      </div>
                    </div>
                  )}

                  {isGeneratingStrategy && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-600 mb-3" />
                      <p className="text-sm text-muted-foreground">Đang phân tích và tạo chiến lược nội dung...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
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
          <p className="text-sm text-muted-foreground">Đang tải công cụ Search Intent...</p>
        </div>
      </main>
    </div>
  );
}

export default function SearchIntent() {
  const toolId = useToolId("search-intent");

  if (!toolId) {
    return <LoadingToolShell />;
  }

  return (
    <ToolPermissionGuard toolId={toolId} toolName="Search Intent">
      <SearchIntentContent />
    </ToolPermissionGuard>
  );
}

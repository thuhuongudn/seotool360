import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Copy, BarChart3 } from "lucide-react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatNumber } from "@/lib/search-intent-utils";


export type KeywordPlanNetwork = "GOOGLE_SEARCH" | "GOOGLE_SEARCH_AND_PARTNERS";

export interface KeywordIdeaRow {
  keyword: string;
  avgMonthlySearches: number | null;
  competition: string | null;
  competitionIndex: number | null;
  lowTopBid: number | null;
  highTopBid: number | null;
  range?: { min: number | null; max: number | null } | null;
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
  const [language, setLanguage] = useState("languageConstants/1040");
  const [geoTarget, setGeoTarget] = useState("geoTargetConstants/2704");
  const [network, setNetwork] = useState<KeywordPlanNetwork>("GOOGLE_SEARCH");
  const { toast } = useToast();

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
                      <SelectContent>
                        <SelectItem value="languageConstants/1040">Vietnamese (languageConstants/1040)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Khu vực</label>
                    <Select value={geoTarget} onValueChange={setGeoTarget}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn khu vực" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geoTargetConstants/2704">Vietnam (geoTargetConstants/2704)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Mạng</label>
                    <Select value={network} onValueChange={(value) => setNetwork(value as KeywordPlanNetwork)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn mạng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GOOGLE_SEARCH">Google Search</SelectItem>
                        <SelectItem value="GOOGLE_SEARCH_AND_PARTNERS">Google Search & Partners</SelectItem>
                      </SelectContent>
                    </Select>
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
                        {' '}Ngôn ngữ: {result.meta.language} |
                        Khu vực: {result.meta.geoTargets.join(", ")} |
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
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Không có dữ liệu historical metrics cho từ khóa này.
                  </div>
                )}
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

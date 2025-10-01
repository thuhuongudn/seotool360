import { useMemo, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, PlusCircle, Trash2, Copy, CheckCircle2, Search } from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatNumber, parseKeywords } from "@/lib/search-intent-utils";
import {
  DEFAULT_LANG,
  DEFAULT_GEO,
  GEO_TARGET_CONSTANTS,
  LANGUAGE_CONSTANTS,
  NETWORK_CONSTANTS
} from "@/constants/google-ads-constants";
import { useTokenManagement } from "@/hooks/use-token-management";


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

export interface KeywordPlannerResponse {
  keywords: string[];
  meta: KeywordIdeaMeta;
  rows: KeywordIdeaRow[];
}

interface KeywordPlannerRequestPayload {
  keywords: string[];
  language: string;
  geoTargets: string[];
  network: KeywordPlanNetwork;
}

interface ShortlistEntry extends KeywordIdeaRow {}

function KeywordPlannerContent() {
  const toolId = useToolId("keyword-planner");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [result, setResult] = useState<KeywordPlannerResponse | null>(null);
  const [selectedRows, setSelectedRows] = useState<ShortlistEntry[]>([]);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasCopiedList, setHasCopiedList] = useState(false);
  const [language, setLanguage] = useState(DEFAULT_LANG);
  const [geoTarget, setGeoTarget] = useState(DEFAULT_GEO);
  const [network, setNetwork] = useState<KeywordPlanNetwork>("GOOGLE_SEARCH");
  const { toast } = useToast();
  const shortlistRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { executeWithToken, canUseToken, isProcessing: isTokenProcessing } = useTokenManagement();

  const parsedKeywords = useMemo(() => parseKeywords(keywordsInput), [keywordsInput]);
  const shortlistKeywordSet = useMemo(
    () => new Set(selectedRows.map((row) => row.keyword.toLowerCase())),
    [selectedRows],
  );

  const mutation = useMutation({
    mutationFn: async (payload: KeywordPlannerRequestPayload) => {
      const response = await apiRequest("POST", "/api/keyword-planner", payload);
      const data = (await response.json()) as KeywordPlannerResponse;

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
      setSelectedRows([]);
      setHasCopied(false);
      setHasCopiedList(false);
      toast({
        title: "Đã phân tích Keyword Planner",
        description: `Tìm thấy ${data.rows.length} ý tưởng từ khóa`,
      });
    },
    onError: (error) => {
      const description = error instanceof Error ? error.message : "Không thể phân tích keyword planner.";
      toast({
        title: "Có lỗi xảy ra",
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (parsedKeywords.length === 0) {
      toast({
        title: "Chưa có từ khóa",
        description: "Vui lòng nhập ít nhất một từ khóa (phân tách bằng dấu phẩy).",
        variant: "destructive",
      });
      return;
    }
    if (parsedKeywords.length > 15) {
      toast({
        title: "Quá nhiều từ khóa",
        description: "Vui lòng nhập tối đa 15 từ khóa.",
        variant: "destructive",
      });
      return;
    }
    const payload: KeywordPlannerRequestPayload = {
      keywords: parsedKeywords,
      language,
      geoTargets: [geoTarget],
      network,
    };

    // Wrap API call with token consumption (1 token per analysis)
    await executeWithToken(toolId, 1, async () => {
      mutation.mutate(payload);
      return true;
    });
  };

  const handleAddToShortlist = (row: KeywordIdeaRow) => {
    if (shortlistKeywordSet.has(row.keyword.toLowerCase())) {
      return;
    }
    setSelectedRows((current) => {
      const updated = [...current, row];
      // scroll sau 1 tick để DOM update xong
      setTimeout(() => {
        if (shortlistRef.current) {
          shortlistRef.current.scrollTop = shortlistRef.current.scrollHeight;
        }
      }, 0);
      return updated;
    });
  };

  const handleRemoveFromShortlist = (keyword: string) => {
    setSelectedRows((current) => current.filter((entry) => entry.keyword !== keyword));
  };

  const handleClearShortlist = () => {
    setSelectedRows([]);
  };

  const handleKeywordClick = (keyword: string) => {
    const encodedKeyword = encodeURIComponent(keyword);
    setLocation(`/search-intent?q=${encodedKeyword}`);
  };

  const handleCopyJson = async () => {
    if (!navigator.clipboard) {
      toast({
        title: "Không hỗ trợ sao chép",
        description: "Trình duyệt của bạn không hỗ trợ clipboard API.",
        variant: "destructive",
      });
      return;
    }

    if (selectedRows.length === 0) {
      toast({
        title: "Danh sách trống",
        description: "Vui lòng thêm ít nhất một từ khóa vào danh sách bên trái trước khi sao chép.",
        variant: "destructive",
      });
      return;
    }

    const payload = selectedRows.map((k) => ({
      keyword: k.keyword,
      avgMonthlySearches: k.avgMonthlySearches,
      competition: k.competition,
      competitionIndex: k.competitionIndex,
      lowTopBid: k.lowTopBid,
      highTopBid: k.highTopBid,
    }));

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setHasCopied(true);
      toast({
        title: "Đã sao chép",
        description: "Danh sách từ khóa đã được sao chép vào clipboard.",
      });
      setTimeout(() => setHasCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Sao chép thất bại",
        description: error instanceof Error ? error.message : "Không thể sao chép dữ liệu.",
        variant: "destructive",
      });
    }
  };

  const handleCopyList = async () => {
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
      setHasCopiedList(true);
      toast({
        title: "Đã sao chép",
        description: "Danh sách keyword đã được sao chép vào clipboard.",
      });
      setTimeout(() => setHasCopiedList(false), 2000);
    } catch (error) {
      toast({
        title: "Sao chép thất bại",
        description: error instanceof Error ? error.message : "Không thể sao chép dữ liệu.",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = mutation.isPending || isTokenProcessing;
  const hasResults = !!result && result.rows.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Keyword Planner" }]} backLink="/" />

        {/* Tool Description Section */}
        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-4 py-1 text-sm font-medium text-blue-600 mb-4">
            <Search className="h-4 w-4" />
            Google Keyword Planner Tool
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tìm <span className="text-blue-600">ý tưởng từ khóa</span> từ Google Keyword Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Khám phá hàng nghìn ý tưởng từ khóa mới từ Google Keyword Planner API. Phân tích lượng tìm kiếm, độ cạnh tranh và chi phí quảng cáo để xây dựng chiến lược SEO hiệu quả.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Keyword Planner - Tìm ý tưởng từ khóa</CardTitle>
                <CardDescription>
                  Nhập danh sách từ khóa (phân tách bằng dấu phẩy) để khám phá ý tưởng từ khóa mới, lượng tìm kiếm và mức độ cạnh tranh từ Google Keyword Planner.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="keywords">
                      Từ khóa cần phân tích
                    </label>
                    <Textarea
                      id="keywords"
                      placeholder="Ví dụ: elevit, dha bầu, canxi bioisland"
                      value={keywordsInput}
                      onChange={(event) => setKeywordsInput(event.target.value)}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nhập tối đa 10-15 từ khóa mỗi lần để có kết quả chính xác nhất.
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

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Tổng số từ khóa hợp lệ: <span className="font-semibold text-primary">{parsedKeywords.length}</span>
                    </p>
                    <Button type="submit" disabled={isSubmitting || parsedKeywords.length === 0 || !canUseToken}>
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Tìm ý tưởng từ khóa
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 sm:max-w-[360px]">
                  <CardTitle>Ý tưởng từ khóa từ Google</CardTitle>
                  {result?.meta && (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      <li>Ngôn ngữ: {LANGUAGE_CONSTANTS.find(lang => lang.value === result.meta.language)?.name || result.meta.language} ({result.meta.language})</li>
                      <li>Khu vực: {result.meta.geoTargets.map(geo => GEO_TARGET_CONSTANTS.find(g => g.value === geo)?.name || geo).join(", ")} ({result.meta.geoTargets.join(", ")})</li>
                      <li>Mạng: {result.meta.network.replace(/_/g, " ")}</li>
                    </ul>
                  )}
                </div>
                {result && (
                  <p className="text-sm text-muted-foreground">
                    {result.rows.length} ý tưởng từ khóa
                  </p>
                )}
                {result && result.rows.length > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyList}>
                    {hasCopiedList ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {hasCopiedList ? "Đã sao chép danh sách" : "Copy danh sách"}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isSubmitting && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Đang tìm ý tưởng từ khóa...</p>
                  </div>
                )}

                {!isSubmitting && !result && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Nhập từ khóa và bấm "Tìm ý tưởng từ khóa" để xem kết quả.
                  </div>
                )}

                {!isSubmitting && result && result.rows.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Không có ý tưởng từ khóa nào được trả về. Hãy thử bộ từ khóa khác.
                  </div>
                )}

                {hasResults && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Từ khóa</TableHead>
                        <TableHead>Số lượt tìm kiếm TB</TableHead>
                        <TableHead>Độ cạnh tranh</TableHead>
                        <TableHead>Điểm cạnh tranh</TableHead>
                        <TableHead>Bid thấp (₫)</TableHead>
                        <TableHead>Bid cao (₫)</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((row) => (
                        <TableRow key={row.keyword}>
                          <TableCell
                            className="font-medium cursor-pointer hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors rounded-md"
                            onClick={() => handleKeywordClick(row.keyword)}
                            title={`Click để phân tích Search Intent cho "${row.keyword}"`}
                          >
                            {row.keyword}
                          </TableCell>
                          <TableCell>{formatNumber(row.avgMonthlySearches)}</TableCell>
                          <TableCell className="capitalize">{row.competition ? row.competition.toLowerCase() : "-"}</TableCell>
                          <TableCell>{row.competitionIndex ?? "-"}</TableCell>
                          <TableCell>{formatCurrency(row.lowTopBid)}</TableCell>
                          <TableCell>{formatCurrency(row.highTopBid)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddToShortlist(row)}
                              disabled={shortlistKeywordSet.has(row.keyword.toLowerCase())}
                            >
                              <PlusCircle className="h-4 w-4" />
                              Thêm
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <aside>
            <div className="sticky top-10 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách đã chọn</CardTitle>
                <CardDescription>
                  Chọn những từ khóa phù hợp để xuất JSON phục vụ phân tích sâu hơn.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Đã chọn: <span className="font-semibold text-primary">{selectedRows.length}</span>
                  </p>
                  {selectedRows.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleClearShortlist}>
                      <Trash2 className="h-4 w-4" />
                      Xóa hết
                    </Button>
                  )}
                </div>

                <div ref={shortlistRef} className="space-y-3 max-h-[288px] overflow-y-auto pr-1">
                  {selectedRows.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Chưa có từ khóa nào. Hãy thêm từ kết quả bên phải.
                    </p>
                  )}

                  {selectedRows.map((entry) => (
                    <div key={entry.keyword} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {entry.keyword}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Tìm kiếm TB: {formatNumber(entry.avgMonthlySearches)} · Độ cạnh tranh: {entry.competition ?? "-"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFromShortlist(entry.keyword)}
                          aria-label={`Xóa ${entry.keyword} khỏi danh sách`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="button" className="w-full" onClick={handleCopyJson} disabled={selectedRows.length === 0}>
                  {hasCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {hasCopied ? "Đã sao chép" : "Copy JSON"}
                </Button>
              </CardContent>
            </Card>
            <Card>
  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="space-y-2 sm:max-w-[360px]">
      <CardTitle>Review keyword đã chọn</CardTitle>
    </div>
    <p className="text-sm text-muted-foreground">
      {selectedRows.length} dòng dữ liệu
    </p>
  </CardHeader>
  <CardContent>
    {selectedRows.length === 0 ? (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Chưa có keyword nào được chọn. Hãy thêm từ kết quả phân tích ở bên trái.
      </div>
    ) : (
      <div className="max-h-[360px] overflow-y-auto pr-1">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
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
            {selectedRows.map((row) => (
              <TableRow key={`selected-${row.keyword}`}>
                <TableCell className="font-medium">{row.keyword}</TableCell>
                <TableCell>{formatNumber(row.avgMonthlySearches)}</TableCell>
                <TableCell className="capitalize">
                  {row.competition ? row.competition.toLowerCase() : "-"}
                </TableCell>
                <TableCell>{row.competitionIndex ?? "-"}</TableCell>
                <TableCell>{formatCurrency(row.lowTopBid)}</TableCell>
                <TableCell>{formatCurrency(row.highTopBid)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </CardContent>
  </Card>
  </div>
          </aside>
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
          <p className="text-sm text-muted-foreground">Đang tải công cụ Keyword Planner...</p>
        </div>
      </main>
    </div>
  );
}

export default function KeywordPlanner() {
  const toolId = useToolId("keyword-planner");

  if (!toolId) {
    return <LoadingToolShell />;
  }

  return (
    <ToolPermissionGuard toolId={toolId} toolName="Keyword Planner">
      <KeywordPlannerContent />
    </ToolPermissionGuard>
  );
}
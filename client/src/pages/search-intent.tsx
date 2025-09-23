import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, PlusCircle, Trash2, Copy, CheckCircle2 } from "lucide-react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatNumber, parseKeywords } from "@/lib/search-intent-utils";

export type KeywordPlanNetwork = "GOOGLE_SEARCH" | "GOOGLE_SEARCH_AND_PARTNERS";

export interface KeywordIdeaRow {
  keyword: string;
  avgMonthlySearches: number | null;
  competition: string | null;
  competitionIndex: number | null;
  lowTopBid: number | null;
  highTopBid: number | null;
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
}

interface ShortlistEntry extends KeywordIdeaRow {}

function SearchIntentContent() {
  const [keywordsInput, setKeywordsInput] = useState("");
  const [result, setResult] = useState<SearchIntentResponse | null>(null);
  const [selectedRows, setSelectedRows] = useState<ShortlistEntry[]>([]);
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const parsedKeywords = useMemo(() => parseKeywords(keywordsInput), [keywordsInput]);
  const shortlistKeywordSet = useMemo(
    () => new Set(selectedRows.map((row) => row.keyword.toLowerCase())),
    [selectedRows],
  );

  const mutation = useMutation({
    mutationFn: async (payload: SearchIntentRequestPayload) => {
      const response = await apiRequest("POST", "/api/search-intent", payload);
      return (await response.json()) as SearchIntentResponse;
    },
    onSuccess: (data) => {
      setResult(data);
      setSelectedRows([]);
      setHasCopied(false);
      toast({
        title: "Đã phân tích Search Intent",
        description: `Tìm thấy ${data.rows.length} ý tưởng từ khóa`,
      });
    },
    onError: (error) => {
      const description = error instanceof Error ? error.message : "Không thể phân tích search intent.";
      toast({
        title: "Có lỗi xảy ra",
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (parsedKeywords.length === 0) {
      toast({
        title: "Chưa có từ khóa",
        description: "Vui lòng nhập ít nhất một từ khóa (phân tách bằng dấu phẩy).",
        variant: "destructive",
      });
      return;
    }

    const payload: SearchIntentRequestPayload = {
      keywords: parsedKeywords,
    };

    mutation.mutate(payload);
  };

  const handleAddToShortlist = (row: KeywordIdeaRow) => {
    if (shortlistKeywordSet.has(row.keyword.toLowerCase())) {
      return;
    }
    setSelectedRows((current) => [...current, row]);
  };

  const handleRemoveFromShortlist = (keyword: string) => {
    setSelectedRows((current) => current.filter((entry) => entry.keyword !== keyword));
  };

  const handleClearShortlist = () => {
    setSelectedRows([]);
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

    const payload = {
      keywords: result?.keywords || parsedKeywords,
      meta: result?.meta,
      selected: selectedRows,
    };

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

  const isSubmitting = mutation.isPending;
  const hasResults = !!result && result.rows.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Search Intent" }]} backLink="/" />

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Phân tích Search Intent</CardTitle>
                <CardDescription>
                  Nhập danh sách từ khóa (phân tách bằng dấu phẩy) để khám phá search intent, lượng tìm kiếm và mức độ cạnh tranh.
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

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Tổng số từ khóa hợp lệ: <span className="font-semibold text-primary">{parsedKeywords.length}</span>
                    </p>
                    <Button type="submit" disabled={isSubmitting || parsedKeywords.length === 0}>
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Phân tích ngay
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Kết quả phân tích</CardTitle>
                  {result?.meta && (
                    <CardDescription>
                      Ngôn ngữ: {result.meta.language} · Khu vực: {result.meta.geoTargets.join(", ")} · Mạng: {result.meta.network.replace(/_/g, " ")}
                    </CardDescription>
                  )}
                </div>
                {result && (
                  <p className="text-sm text-muted-foreground">
                    {result.rows.length} ý tưởng từ khóa
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {isSubmitting && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Đang phân tích search intent...</p>
                  </div>
                )}

                {!isSubmitting && !result && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Nhập từ khóa và bấm "Phân tích ngay" để xem kết quả.
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
                          <TableCell className="font-medium">{row.keyword}</TableCell>
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

          <aside className="space-y-4">
            <Card className="sticky top-24">
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

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
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

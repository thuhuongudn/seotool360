import { useState } from "react";
import { Loader2, Target, Search, ExternalLink, Star } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
import { useTokenManagement } from "@/hooks/use-token-management";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_LANG, DEFAULT_GEO } from "@/constants/google-ads-constants";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Types for combined API response
interface KeywordMetrics {
  keyword: string;
  volume: number | null;
  globalVolume: number | null;
  intent: string;
  cpc: number | null;
  competitiveDensity: number | null;
  difficulty: number | null;
  trend: number[];
}

interface KeywordVariation {
  keyword: string;
  volume: number | null;
  kdPercent: number | null;
}

interface SerpResult {
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  price?: string;
  rating?: number;
  ratingCount?: number;
  sitelinks?: any[];
}

interface CombinedData {
  mainMetrics: KeywordMetrics | null;
  keywordVariations: KeywordVariation[];
  serpResults: SerpResult[];
}

function KeywordOverviewContent() {
  const toolId = useToolId("keyword-overview");
  const { toast } = useToast();
  const { executeWithToken } = useTokenManagement();

  // Form state
  const [keyword, setKeyword] = useState("");
  const [data, setData] = useState<CombinedData | null>(null);

  // Combined mutation that calls all 4 APIs
  const analysisMutation = useMutation({
    mutationFn: async (keywordInput: string) => {
      if (!toolId) throw new Error("Tool ID not found");

      return executeWithToken(toolId, 4, async () => {
        console.log("Starting combined analysis for:", keywordInput);

        // Call all 4 APIs in parallel
        const [keywordPlannerRes, searchIntentRes, gscRes, serpRes] = await Promise.all([
          // 1. Google Keyword Planner
          apiRequest("POST", "/api/keyword-planner", {
            keywords: [keywordInput.trim()],
            language: DEFAULT_LANG,
            geoTargets: [DEFAULT_GEO],
            network: "GOOGLE_SEARCH_AND_PARTNERS",
            pageSize: 100,
          }),

          // 2. Search Intent (Historical Metrics)
          apiRequest("POST", "/api/search-intent", {
            keywords: [keywordInput.trim()],
            geoTargetConstants: [DEFAULT_GEO],
            language: DEFAULT_LANG,
          }),

          // 3. GSC Insights
          apiRequest("POST", "/api/gsc-insights", {
            siteUrl: "https://nhathuocvietnhat.vn",
            mode: "pages-for-keyword",
            value: keywordInput.trim(),
            startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
          }),

          // 4. SerpAPI
          apiRequest("POST", "/api/proxy/serper/search", {
            q: keywordInput.trim(),
            gl: "vn",
            num: 10,
          }),
        ]);

        // Parse all responses
        const [keywordData, intentData, gscData, serpData] = await Promise.all([
          keywordPlannerRes.json(),
          searchIntentRes.json(),
          gscRes.json(),
          serpRes.json(),
        ]);

        console.log("All API responses:", { keywordData, intentData, gscData, serpData });

        // Transform data into UI structure
        const combinedData: CombinedData = {
          mainMetrics: {
            keyword: keywordInput,
            volume: intentData.rows?.[0]?.avgMonthlySearches || null,
            globalVolume: keywordData.rows?.reduce((sum: number, item: any) => sum + (item.avgMonthlySearches || 0), 0) || null,
            intent: "Informational", // TODO: Implement AI intent detection
            cpc: intentData.rows?.[0]?.highTopBid || null,
            competitiveDensity: intentData.rows?.[0]?.competitionIndex ? intentData.rows[0].competitionIndex / 100 : null,
            difficulty: 22, // TODO: Calculate based on SERP data
            trend: intentData.rows?.[0]?.monthlySearchVolumes?.map((m: any) => m.monthlySearches) || [],
          },
          keywordVariations: (keywordData.rows || []).slice(0, 82).map((item: any) => ({
            keyword: item.keyword,
            volume: item.avgMonthlySearches,
            kdPercent: item.competitionIndex ? Math.round(item.competitionIndex) : null,
          })),
          serpResults: (serpData.organic || []).slice(0, 10).map((item: any, index: number) => ({
            position: index + 1,
            title: item.title || "No title",
            url: item.link,
            domain: new URL(item.link).hostname,
            snippet: item.snippet || "",
            price: item.price || undefined,
            rating: item.rating || undefined,
            ratingCount: item.ratingCount || undefined,
            sitelinks: item.sitelinks || [],
          })),
        };

        return combinedData;
      });
    },
    onSuccess: (result) => {
      if (!result) return;

      setData(result);
      toast({
        title: "Analysis Complete",
        description: `Analyzed "${result.mainMetrics?.keyword}" with ${result.keywordVariations.length} variations and ${result.serpResults.length} SERP results`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!keyword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a keyword",
        variant: "destructive",
      });
      return;
    }

    analysisMutation.mutate(keyword);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Keyword Overview" }]} backLink="/" />

        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-4 py-1 text-sm font-medium text-blue-600">
              <Target className="h-4 w-4" />
              AI-powered
            </span>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter keyword for analysis..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className="h-12 text-base"
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={analysisMutation.isPending}
              size="lg"
              className="px-8"
            >
              {analysisMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
            <span>🇻🇳 Vietnam</span>
            <span>💻 Desktop</span>
            <span>📅 Oct 11, 2025</span>
            <span>💵 USD</span>
          </div>
        </div>

        {/* Results */}
        {data && (
          <div className="space-y-8">
            {/* Main Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Volume */}
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {data.mainMetrics?.volume ? `${(data.mainMetrics.volume / 1000).toFixed(1)}K` : "N/A"}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium">Keyword Difficulty</p>
                    <p className="text-2xl font-bold">{data.mainMetrics?.difficulty || 0}%</p>
                    <Badge variant="outline" className="mt-2">Easy</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Global Volume */}
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Global Volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {data.mainMetrics?.globalVolume ? `${(data.mainMetrics.globalVolume / 1000).toFixed(1)}K` : "N/A"}
                  </div>
                </CardContent>
              </Card>

              {/* Intent */}
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Intent</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-blue-500">
                    {data.mainMetrics?.intent || "Unknown"}
                  </Badge>
                </CardContent>
              </Card>

              {/* CPC */}
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>CPC</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    ${data.mainMetrics?.cpc?.toFixed(2) || "0.00"}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-medium">Competitive Density</p>
                    <p className="text-2xl font-bold">{data.mainMetrics?.competitiveDensity?.toFixed(2) || "0.00"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Keyword Ideas */}
            <Card>
              <CardHeader>
                <CardTitle>Keyword Ideas</CardTitle>
                <CardDescription>
                  {data.keywordVariations.length} Total Volume: {data.mainMetrics?.globalVolume?.toLocaleString() || 0}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                      <TableHead className="text-right">KD %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.keywordVariations.slice(0, 10).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.keyword}</TableCell>
                        <TableCell className="text-right">{item.volume?.toLocaleString() || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          {item.kdPercent ? (
                            <Badge variant={item.kdPercent < 30 ? "outline" : "default"}>
                              {item.kdPercent}
                            </Badge>
                          ) : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* SERP Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>SERP Analysis</CardTitle>
                <CardDescription>Top 10 ranking URLs with detailed information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.serpResults.map((item) => (
                    <div
                      key={item.position}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Position Badge */}
                        <div className="flex-shrink-0">
                          <Badge variant="outline" className="text-lg font-bold w-10 h-10 flex items-center justify-center">
                            {item.position}
                          </Badge>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <h4 className="font-semibold text-lg mb-1 text-blue-600 hover:underline">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              {item.title}
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </h4>

                          {/* URL/Domain */}
                          <p className="text-sm text-green-700 dark:text-green-500 mb-2">
                            {item.domain}
                          </p>

                          {/* Rating & Price */}
                          {(item.rating || item.price) && (
                            <div className="flex items-center gap-4 mb-2">
                              {item.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-medium">{item.rating.toFixed(1)}</span>
                                  {item.ratingCount && (
                                    <span className="text-sm text-muted-foreground">
                                      ({item.ratingCount.toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              )}
                              {item.price && (
                                <Badge variant="secondary" className="font-semibold">
                                  {item.price}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Snippet */}
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.snippet}
                          </p>

                          {/* Sitelinks */}
                          {item.sitelinks && item.sitelinks.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.sitelinks.slice(0, 4).map((link: any, idx: number) => (
                                <a
                                  key={idx}
                                  href={link.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded"
                                >
                                  {link.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!data && !analysisMutation.isPending && (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Target className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Enter a keyword above and click "Analyze" to get comprehensive insights including
                volume, competition, SERP analysis, and keyword variations.
              </p>
            </CardContent>
          </Card>
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
          <p className="text-sm text-muted-foreground">Đang tải công cụ...</p>
        </div>
      </main>
    </div>
  );
}

export default function KeywordOverview() {
  const toolId = useToolId("keyword-overview");

  if (!toolId) {
    return <LoadingToolShell />;
  }

  return (
    <ToolPermissionGuard toolId={toolId} toolName="Keyword Overview">
      <KeywordOverviewContent />
    </ToolPermissionGuard>
  );
}

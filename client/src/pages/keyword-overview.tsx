import { useState } from "react";
import { Loader2, Target, Search, TrendingUp, BarChart3, Globe } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
import { useTokenManagement } from "@/hooks/use-token-management";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_LANG, DEFAULT_GEO } from "@/constants/google-ads-constants";

// Types for API responses
interface KeywordIdeaRow {
  keyword: string;
  avgMonthlySearches: number | null;
  competition: string | null;
  competitionIndex: number | null;
  lowTopBid: number | null;
  highTopBid: number | null;
}

interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SerpOrganicResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  domain: string;
}

interface SerpApiResponse {
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
  };
  organic: SerpOrganicResult[];
  relatedSearches?: string[];
}

function KeywordOverviewContent() {
  const toolId = useToolId("keyword-overview");
  const { toast } = useToast();
  const { executeWithToken } = useTokenManagement();

  // Form state
  const [keyword, setKeyword] = useState("");

  // Results state
  const [googleAdsResults, setGoogleAdsResults] = useState<KeywordIdeaRow[] | null>(null);
  const [searchIntentResults, setSearchIntentResults] = useState<KeywordIdeaRow[] | null>(null);
  const [gscResults, setGscResults] = useState<GSCRow[] | null>(null);
  const [serpResults, setSerpResults] = useState<SerpApiResponse | null>(null);

  // Google Ads API mutation
  const googleAdsMutation = useMutation({
    mutationFn: async (keywordInput: string) => {
      if (!toolId) throw new Error("Tool ID not found");

      return executeWithToken(toolId, 1, async () => {
        const response = await fetch("/api/keyword-ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywordPlanNetwork: "GOOGLE_SEARCH_AND_PARTNERS",
            keywordSeed: { keywords: [keywordInput] },
            geoTargetConstants: [DEFAULT_GEO],
            language: DEFAULT_LANG,
            pageSize: 1000,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch Google Ads data");
        }

        return response.json();
      });
    },
    onSuccess: (data) => {
      setGoogleAdsResults(data);
      toast({
        title: "Google Ads API Success",
        description: `Fetched ${data.length} keyword ideas`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Google Ads API Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Search Intent API mutation
  const searchIntentMutation = useMutation({
    mutationFn: async (keywordInput: string) => {
      if (!toolId) throw new Error("Tool ID not found");

      return executeWithToken(toolId, 1, async () => {
        const response = await fetch("/api/search-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords: [keywordInput],
            geoTargetConstants: [DEFAULT_GEO],
            language: DEFAULT_LANG,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch Search Intent data");
        }

        return response.json();
      });
    },
    onSuccess: (data) => {
      setSearchIntentResults(data);
      toast({
        title: "Search Intent API Success",
        description: `Fetched metrics for ${data.length} keywords`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Search Intent API Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // GSC API mutation
  const gscMutation = useMutation({
    mutationFn: async (keywordInput: string) => {
      if (!toolId) throw new Error("Tool ID not found");

      return executeWithToken(toolId, 1, async () => {
        const response = await fetch("/api/gsc-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteUrl: "https://nhathuocvietnhat.vn",
            analysisMode: "pages-for-keyword",
            query: keywordInput,
            startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            endDate: new Date().toISOString().split("T")[0],
            dimension: "page",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch GSC data");
        }

        return response.json();
      });
    },
    onSuccess: (data) => {
      setGscResults(data.rows || []);
      toast({
        title: "GSC API Success",
        description: `Fetched ${data.rows?.length || 0} page results`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "GSC API Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // SerpAPI mutation (uses existing Serper proxy)
  const serpMutation = useMutation({
    mutationFn: async (keywordInput: string) => {
      if (!toolId) throw new Error("Tool ID not found");

      return executeWithToken(toolId, 1, async () => {
        const response = await fetch("/api/proxy/serper/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: keywordInput,
            gl: "vn",
            num: 100,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch SERP data");
        }

        return response.json();
      });
    },
    onSuccess: (data) => {
      setSerpResults(data);
      toast({
        title: "SerpAPI Success",
        description: `Fetched ${data.organic?.length || 0} organic results`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "SerpAPI Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestGoogleAds = () => {
    if (!keyword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a keyword",
        variant: "destructive",
      });
      return;
    }
    googleAdsMutation.mutate(keyword);
  };

  const handleTestSearchIntent = () => {
    if (!keyword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a keyword",
        variant: "destructive",
      });
      return;
    }
    searchIntentMutation.mutate(keyword);
  };

  const handleTestGSC = () => {
    if (!keyword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a keyword",
        variant: "destructive",
      });
      return;
    }
    gscMutation.mutate(keyword);
  };

  const handleTestSerp = () => {
    if (!keyword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a keyword",
        variant: "destructive",
      });
      return;
    }
    serpMutation.mutate(keyword);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Keyword Overview" }]} backLink="/" />

        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-4 py-1 text-sm font-medium text-blue-600 mb-4">
            <Target className="h-4 w-4" />
            API Testing Interface
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Keyword Overview <span className="text-blue-600">Data Sources Testing</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Test các API: Google Ads, Search Intent, GSC, và SerpAPI với thị trường Việt Nam
          </p>
        </section>

        {/* Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Keyword Input</CardTitle>
            <CardDescription>
              Nhập keyword để test. Default: Vietnam (geoTargetConstants/2704), Vietnamese (languageConstants/1040)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Nhập keyword..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={handleTestGoogleAds}
                disabled={googleAdsMutation.isPending}
                className="w-full"
              >
                {googleAdsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Test Google Ads
                  </>
                )}
              </Button>

              <Button
                onClick={handleTestSearchIntent}
                disabled={searchIntentMutation.isPending}
                className="w-full"
                variant="secondary"
              >
                {searchIntentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Test Search Intent
                  </>
                )}
              </Button>

              <Button
                onClick={handleTestGSC}
                disabled={gscMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {gscMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Test GSC
                  </>
                )}
              </Button>

              <Button
                onClick={handleTestSerp}
                disabled={serpMutation.isPending}
                className="w-full"
                variant="destructive"
              >
                {serpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Test SerpAPI
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Google Ads Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                Google Ads API Results
              </CardTitle>
              <CardDescription>Keyword ideas with search volume and competition</CardDescription>
            </CardHeader>
            <CardContent>
              {googleAdsResults ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Found {googleAdsResults.length} keywords
                  </p>
                  <div className="max-h-96 overflow-y-auto">
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(googleAdsResults.slice(0, 10), null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet. Click "Test Google Ads" to fetch.</p>
              )}
            </CardContent>
          </Card>

          {/* Search Intent Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Search Intent API Results
              </CardTitle>
              <CardDescription>Historical metrics and monthly trends</CardDescription>
            </CardHeader>
            <CardContent>
              {searchIntentResults ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Found {searchIntentResults.length} keyword metrics
                  </p>
                  <div className="max-h-96 overflow-y-auto">
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(searchIntentResults, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet. Click "Test Search Intent" to fetch.</p>
              )}
            </CardContent>
          </Card>

          {/* GSC Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                GSC API Results
              </CardTitle>
              <CardDescription>Pages ranking for keyword (last 90 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {gscResults ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Found {gscResults.length} pages
                  </p>
                  <div className="max-h-96 overflow-y-auto">
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(gscResults.slice(0, 10), null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet. Click "Test GSC" to fetch.</p>
              )}
            </CardContent>
          </Card>

          {/* SERP Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-orange-600" />
                SerpAPI Results
              </CardTitle>
              <CardDescription>Organic SERP results for Vietnam market</CardDescription>
            </CardHeader>
            <CardContent>
              {serpResults ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Found {serpResults.organic?.length || 0} organic results
                  </p>
                  <div className="max-h-96 overflow-y-auto">
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(serpResults, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data yet. Click "Test SerpAPI" to fetch.</p>
              )}
            </CardContent>
          </Card>
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

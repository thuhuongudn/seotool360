import { useState, useMemo } from "react";
import { Loader2, Target, Search, ExternalLink, Star, ArrowRight, Network, Download, FileJson } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
import { openaiCompletion, generateTopicalAuthority } from "@/lib/secure-api-client";
import { pollN8NJobStatus } from "@/lib/n8n-job-polling";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Monthly search volume interface
interface MonthlySearchVolume {
  month: string;
  year: string;
  monthlySearches: string;
}

// GSC metrics interface
interface GSCMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// Types for combined API response
interface KeywordMetrics {
  keyword: string;
  volume: number | null;
  intent: string;
  intentScore: number | null; // 0-10 scale: 0-5 = informational, 6-10 = commercial
  cpcLow: number | null;
  cpcHigh: number | null;
  competitionLevel: number | null; // 0-100 scale for PLA competition
  monthlySearchVolumes: MonthlySearchVolume[];
  gscMetrics: GSCMetrics | null;
  clickVolumeRatio: number | null;
}

interface QuestionKeyword {
  keyword: string;
  volume: number | null;
  answer: string;
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

interface RelatedURL {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface CombinedData {
  mainMetrics: KeywordMetrics | null;
  keywordVariations: KeywordVariation[];
  serpResults: SerpResult[];
  questionKeywords: QuestionKeyword[];
  relatedURLs: RelatedURL[];
}

// Helper function to format numbers
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat("vi-VN").format(num);
};

// Helper function to format VND currency
const formatVND = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount));
};

// Helper function to get competition level label and color
const getCompetitionLevel = (level: number | null): { label: string; color: string } => {
  if (level === null) return { label: "Unknown", color: "gray" };
  if (level < 33) return { label: "Low", color: "green" };
  if (level < 67) return { label: "Medium", color: "yellow" };
  return { label: "High", color: "red" };
};

// GPT Helper: Analyze SERP intent (commercial vs informational)
async function analyzeSearchIntent(serpResults: SerpResult[], keyword: string): Promise<{ intent: string; score: number }> {
  try {
    const serpSummary = serpResults.slice(0, 10).map((result, idx) => {
      const indicators = [];
      if (result.price) indicators.push("has_price");
      if (result.rating) indicators.push("has_rating");
      if (result.domain.includes("shop") || result.domain.includes("store")) indicators.push("ecommerce_domain");

      return `${idx + 1}. ${result.domain} - ${result.title.substring(0, 60)} [${indicators.join(", ") || "informational"}]`;
    }).join("\n");

    const prompt = `Analyze the search intent for the keyword: "${keyword}"

Based on these top 10 SERP results:
${serpSummary}

Determine if the intent is COMMERCIAL or INFORMATIONAL:
- COMMERCIAL: Users want to buy products/services (e-commerce sites, product pages, prices, ratings)
- INFORMATIONAL: Users want to learn/read information (blogs, articles, guides, wikis)

Respond with JSON only:
{
  "intent": "Commercial" or "Informational",
  "score": <0-10 number where 0-5=informational, 6-10=commercial>,
  "reasoning": "<brief explanation in Vietnamese>"
}`;

    const data = await openaiCompletion({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
    });

    const resultText = data.choices[0].message.content;
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return { intent: result.intent, score: result.score };
    }

    return { intent: "Unknown", score: 5 };
  } catch (error) {
    console.error("Intent analysis failed:", error);
    return { intent: "Unknown", score: 5 };
  }
}

// GPT Helper: Generate Q&A from question keywords
async function generateQuestionAnswers(keywords: KeywordVariation[]): Promise<QuestionKeyword[]> {
  try {
    // Filter question keywords (contains ?, what, how, why, when, where, etc.)
    const questionKeywords = keywords.filter(kw => {
      const lower = kw.keyword.toLowerCase();
      return lower.includes("?") ||
             lower.startsWith("cách") ||
             lower.startsWith("làm sao") ||
             lower.startsWith("tại sao") ||
             lower.startsWith("khi nào") ||
             lower.startsWith("ở đâu") ||
             lower.includes("là gì") ||
             lower.includes("như thế nào");
    }).slice(0, 5); // Limit to top 5 questions

    if (questionKeywords.length === 0) {
      return [];
    }

    const keywordList = questionKeywords.map((kw, idx) => `${idx + 1}. ${kw.keyword}`).join("\n");

    const prompt = `Given these Vietnamese question keywords, provide brief answers (1-2 sentences each):

${keywordList}

Respond with JSON array only:
[
  {
    "keyword": "<question keyword>",
    "answer": "<brief answer in Vietnamese>"
  },
  ...
]`;

    const data = await openaiCompletion({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const resultText = data.choices[0].message.content;
    const jsonMatch = resultText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const answers = JSON.parse(jsonMatch[0]);
      return questionKeywords.map((kw, idx) => ({
        keyword: kw.keyword,
        volume: kw.volume,
        answer: answers[idx]?.answer || "Không có câu trả lời",
      }));
    }

    return [];
  } catch (error) {
    console.error("Question generation failed:", error);
    return [];
  }
}

// MonthlyTrendsChart Component
interface MonthlyTrendsChartProps {
  monthlyVolumes: MonthlySearchVolume[];
}

function MonthlyTrendsChart({ monthlyVolumes }: MonthlyTrendsChartProps) {
  const chartData = useMemo(() => {
    if (!monthlyVolumes || monthlyVolumes.length === 0) return [];

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

    return monthlyVolumes.map((volume) => {
      const searches = parseInt(volume.monthlySearches) || 0;
      return {
        month: monthNames[volume.month as keyof typeof monthNames] || volume.month,
        searches,
        period: `${monthNames[volume.month as keyof typeof monthNames]} ${volume.year}`,
        fullDate: `${volume.year}-${String(Object.keys(monthNames).indexOf(volume.month) + 1).padStart(2, '0')}`
      };
    }).sort((a, b) => a.fullDate.localeCompare(b.fullDate)).slice(-12); // Last 12 months
  }, [monthlyVolumes]);

  if (chartData.length === 0) return null;

  const maxValue = Math.max(...chartData.map(d => d.searches));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={60}
            className="text-muted-foreground"
          />
          <YAxis
            fontSize={11}
            tickFormatter={(value) => formatNumber(value)}
            className="text-muted-foreground"
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
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="searches" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => {
              const intensity = entry.searches / maxValue;
              const color = `hsl(217, 91%, ${70 - intensity * 20}%)`;
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function KeywordOverviewContent() {
  const toolId = useToolId("keyword-overview");
  const { toast } = useToast();
  const { executeWithToken } = useTokenManagement();
  const [, setLocation] = useLocation();

  // Form state
  const [keyword, setKeyword] = useState("");
  const [data, setData] = useState<CombinedData | null>(null);
  const [topicalAuthority, setTopicalAuthority] = useState<any>(null);
  const [isGeneratingTA, setIsGeneratingTA] = useState(false);

  // Combined mutation that calls all 4 APIs
  const analysisMutation = useMutation({
    mutationFn: async (keywordInput: string) => {
      if (!toolId) throw new Error("Tool ID not found");

      return executeWithToken(toolId, 4, async () => {

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

          // 3. GSC Insights - Get keyword metrics (pages-for-keyword also returns timeSeriesData)
          apiRequest("POST", "/api/gsc-insights", {
            siteUrl: "https://nhathuocvietnhat.vn",
            mode: "pages-for-keyword",
            value: keywordInput.trim(),
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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


        // Calculate GSC metrics from timeSeriesData (aggregate all days)
        const timeSeriesData = gscData.timeSeriesData || [];
        const gscMetrics = timeSeriesData.length > 0
          ? timeSeriesData.reduce((acc: GSCMetrics, row: any) => ({
              clicks: acc.clicks + (row.clicks || 0),
              impressions: acc.impressions + (row.impressions || 0),
              ctr: acc.ctr + (row.ctr || 0),
              position: acc.position + (row.position || 0),
            }), { clicks: 0, impressions: 0, ctr: 0, position: 0 })
          : null;

        // Average CTR and position across all days
        if (gscMetrics && timeSeriesData.length > 0) {
          gscMetrics.ctr = gscMetrics.ctr / timeSeriesData.length;
          gscMetrics.position = gscMetrics.position / timeSeriesData.length;
        }

        const volume = intentData.rows?.[0]?.avgMonthlySearches || null;
        const clicks = gscMetrics?.clicks || 0;
        const clickVolumeRatio = volume && clicks > 0 ? (clicks / volume) * 100 : null;

        // Transform SERP results
        const serpResults = (serpData.organic || []).slice(0, 10).map((item: any, index: number) => ({
          position: index + 1,
          title: item.title || "No title",
          url: item.link,
          domain: new URL(item.link).hostname,
          snippet: item.snippet || "",
          price: item.price || undefined,
          rating: item.rating || undefined,
          ratingCount: item.ratingCount || undefined,
          sitelinks: item.sitelinks || [],
        }));

        // Transform keyword variations
        const keywordVariations = (keywordData.rows || []).slice(0, 82).map((item: any) => ({
          keyword: item.keyword,
          volume: item.avgMonthlySearches,
          kdPercent: item.competitionIndex ? Math.round(item.competitionIndex) : null,
        }));

        // GPT Analysis: Intent detection from SERP data
        const intentAnalysis = await analyzeSearchIntent(serpResults, keywordInput);

        // GPT Analysis: Generate Q&A from question keywords
        const questionKeywords = await generateQuestionAnswers(keywordVariations);

        // Extract and group related URLs from GSC data (pages ranking for this keyword)
        // Group URLs by removing hash/fragment to consolidate similar URLs
        const urlGroups = new Map<string, RelatedURL>();

        (gscData.rows || []).forEach((row: any) => {
          const fullUrl = row.page || row.keys?.[0] || "";
          // Remove hash/fragment from URL (everything after #)
          const cleanUrl = fullUrl.split('#')[0];

          if (cleanUrl) {
            const existing = urlGroups.get(cleanUrl);
            if (existing) {
              // Aggregate metrics for same base URL
              existing.clicks += row.clicks || 0;
              existing.impressions += row.impressions || 0;
              existing.ctr = (existing.ctr + (row.ctr || 0)) / 2; // Average CTR
              existing.position = (existing.position + (row.position || 0)) / 2; // Average position
            } else {
              urlGroups.set(cleanUrl, {
                url: cleanUrl,
                clicks: row.clicks || 0,
                impressions: row.impressions || 0,
                ctr: row.ctr || 0,
                position: row.position || 0,
              });
            }
          }
        });

        // Convert to array and sort by clicks descending
        const relatedURLs: RelatedURL[] = Array.from(urlGroups.values())
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 10);

        // Transform data into UI structure
        const combinedData: CombinedData = {
          mainMetrics: {
            keyword: keywordInput,
            volume,
            intent: intentAnalysis.intent,
            intentScore: intentAnalysis.score,
            cpcLow: intentData.rows?.[0]?.lowTopBid || null,
            cpcHigh: intentData.rows?.[0]?.highTopBid || null,
            competitionLevel: intentData.rows?.[0]?.competitionIndex || null, // Already 0-100 scale
            monthlySearchVolumes: intentData.rows?.[0]?.monthlySearchVolumes || [],
            gscMetrics,
            clickVolumeRatio,
          },
          keywordVariations,
          serpResults,
          questionKeywords,
          relatedURLs,
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

  const handleDownloadPDF = () => {
    if (!topicalAuthority || !data?.mainMetrics?.keyword) return;

    const doc = new jsPDF() as jsPDF & { lastAutoTable?: { finalY: number } };
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let startY = 20;

    // Title
    doc.setFontSize(18);
    doc.text("Topical Authority Map", margin, startY);
    startY += 12;

    // Metadata table
    const meta = topicalAuthority.topical_authority_map?.meta;
    if (meta) {
      autoTable(doc, {
        startY: startY,
        head: [['Metadata', 'Value']],
        body: [
          ['Keyword Seed', meta.keyword_seed || "N/A"],
          ['Central Entity', meta.central_entity || "N/A"],
          ['Total Keywords', String(meta.total_keywords_analyzed || 0)],
        ],
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
        margin: { left: margin, right: margin },
      });
      startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : startY + 30;
    }

    // Silos & Content Structure
    const silos = topicalAuthority.topical_authority_map?.silos || [];

    silos.forEach((silo: any, siloIdx: number) => {
      // Silo header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");

      // Check if need new page
      if (startY > pageHeight - 40) {
        doc.addPage();
        startY = 20;
      }

      doc.text(`${siloIdx + 1}. ${silo.silo_name} (${silo.silo_type})`, margin, startY);
      startY += 8;

      // Topic Clusters
      (silo.topic_clusters || []).forEach((cluster: any, clusterIdx: number) => {
        if (startY > pageHeight - 50) {
          doc.addPage();
          startY = 20;
        }

        doc.setFontSize(11);
        doc.text(`  ${siloIdx + 1}.${clusterIdx + 1} ${cluster.cluster_name}`, margin + 3, startY);
        startY += 6;

        // Build table data
        const tableData: any[] = [];

        // Pillar Page
        if (cluster.pillar_page) {
          tableData.push([
            'Pillar Page',
            cluster.pillar_page.page_title || '',
            cluster.pillar_page.primary_keyword || '',
            String(cluster.pillar_page.search_volume || 0)
          ]);
        }

        // Supporting Pages (limit to 10 for PDF)
        const supportingPages = cluster.supporting_pages || [];
        supportingPages.slice(0, 10).forEach((page: any, idx: number) => {
          tableData.push([
            `Supporting ${idx + 1}`,
            page.page_title || '',
            page.primary_keyword || '',
            String(page.search_volume || 0)
          ]);
        });

        if (supportingPages.length > 10) {
          tableData.push([
            '...',
            `+${supportingPages.length - 10} more pages`,
            '',
            ''
          ]);
        }

        // Render table
        if (tableData.length > 0) {
          autoTable(doc, {
            startY: startY,
            head: [['Type', 'Page Title', 'Keyword', 'Volume']],
            body: tableData,
            theme: 'striped',
            styles: {
              font: 'helvetica',
              fontSize: 8,
              cellPadding: 2,
              overflow: 'linebreak',
              cellWidth: 'wrap'
            },
            headStyles: {
              fillColor: [52, 152, 219],
              textColor: 255,
              fontStyle: 'bold',
              fontSize: 8
            },
            columnStyles: {
              0: { cellWidth: 25 },
              1: { cellWidth: 70 },
              2: { cellWidth: 50 },
              3: { cellWidth: 20, halign: 'right' }
            },
            margin: { left: margin + 5, right: margin },
          });
          startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : startY + 30;
        }
      });

      startY += 5;
    });

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated by N8N Toolkit - Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Save PDF with proper filename
    const filename = `topical-authority-${data.mainMetrics.keyword}.pdf`;
    doc.save(filename);
  };

  const handleGenerateTopicalAuthority = async () => {
    if (!data?.mainMetrics?.keyword || !data.keywordVariations.length) {
      toast({
        title: "Error",
        description: "Please analyze a keyword first",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingTA(true);

    try {
      // Limit to top 50 keywords by volume
      const topKeywords = data.keywordVariations
        .sort((a, b) => (b.volume || 0) - (a.volume || 0))
        .slice(0, 50);

      // Start async job on backend
      const startResponse = await generateTopicalAuthority({
        keyword_seed: data.mainMetrics.keyword,
        keyword_ideas: topKeywords.map(kw => ({
          keyword: kw.keyword,
          volume: kw.volume,
        })),
      });

      const jobId = startResponse.job_id;

      // Show progress notification
      toast({
        title: "Generating Topical Authority...",
        description: `Job ${jobId} started. Analyzing ${topKeywords.length} keywords. Polling every 3s...`,
        duration: 60000, // 60 seconds
      });

      // Poll job status until complete
      pollN8NJobStatus(jobId, {
        onProgress: () => {
          // Silent progress tracking
        },
        onComplete: async (result, duration) => {
          setTopicalAuthority(result);
          setIsGeneratingTA(false);

          toast({
            title: "Topical Authority Generated",
            description: `Successfully generated topical authority map in ${Math.round(duration / 1000)}s`,
          });

          // Send webhook to N8N for further processing
          try {
            const webhookUrl = "https://n8n.nhathuocvietnhat.vn/webhook/seotool-360-topical-authority-2025-10-13";
            const n8nApiKey = import.meta.env.VITE_N8N_API_KEY;

            if (!n8nApiKey) {
              console.warn("N8N_API_KEY not configured, skipping webhook");
              return;
            }

            await fetch(webhookUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${n8nApiKey}`,
              },
              body: JSON.stringify({
                keyword_seed: data.mainMetrics?.keyword || "",
                topical_authority_map: result,
                generated_at: new Date().toISOString(),
                duration_seconds: Math.round(duration / 1000),
              }),
            });
          } catch (webhookError) {
            console.warn("Failed to send webhook:", webhookError);
            // Don't show error to user - webhook is optional
          }
        },
        onError: (error) => {
          console.error(`Topical Authority job ${jobId} failed:`, error);
          setIsGeneratingTA(false);

          toast({
            title: "Generation Failed",
            description: error || "Failed to generate topical authority map",
            variant: "destructive",
          });
        }
      });

    } catch (error) {
      console.error("Failed to start Topical Authority generation:", error);
      setIsGeneratingTA(false);

      toast({
        title: "Failed to Start",
        description: error instanceof Error ? error.message : "Failed to start topical authority generation",
        variant: "destructive",
      });
    }
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
            <span>📅 {new Date().toLocaleDateString("vi-VN", { year: "numeric", month: "short", day: "numeric" })}</span>
            <span>💵 VND</span>
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
                  <CardDescription>Volume (VN)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-4">
                    {formatNumber(data.mainMetrics?.volume)}
                  </div>

                  {/* GSC Metrics for 30 days */}
                  {data.mainMetrics?.gscMetrics && (
                    <div className="space-y-2 text-sm border-t pt-3">
                      <p className="font-medium text-muted-foreground">GSC Data (30 days)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Clicks</p>
                          <p className="font-semibold">{formatNumber(data.mainMetrics.gscMetrics.clicks)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Impressions</p>
                          <p className="font-semibold">{formatNumber(data.mainMetrics.gscMetrics.impressions)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CTR</p>
                          <p className="font-semibold">{(data.mainMetrics.gscMetrics.ctr * 100).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Position</p>
                          <p className="font-semibold">{data.mainMetrics.gscMetrics.position.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Click/Volume Ratio */}
                  {data.mainMetrics?.clickVolumeRatio !== null && data.mainMetrics?.clickVolumeRatio !== undefined && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Click/Volume Ratio</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-green-600">
                          {data.mainMetrics.clickVolumeRatio?.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Intent */}
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Intent (AI-Powered)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge
                    className={`text-lg px-4 py-2 ${
                      data.mainMetrics?.intent === "Commercial"
                        ? "bg-green-500"
                        : data.mainMetrics?.intent === "Informational"
                        ? "bg-blue-500"
                        : "bg-gray-500"
                    }`}
                  >
                    {data.mainMetrics?.intent || "Unknown"}
                  </Badge>
                  {data.mainMetrics?.intentScore !== null && data.mainMetrics?.intentScore !== undefined && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">Intent Score</p>
                      <p className="text-2xl font-bold">{data.mainMetrics.intentScore}/10</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.mainMetrics.intentScore <= 5 ? "Người dùng muốn tìm hiểu" : "Người dùng muốn mua"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CPC */}
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>CPC (VND)</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.mainMetrics?.cpcLow !== null && data.mainMetrics?.cpcHigh !== null && data.mainMetrics ? (
                    <>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Low</p>
                          <p className="text-xl font-bold">{formatVND(data.mainMetrics.cpcLow)}₫</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">High</p>
                          <p className="text-xl font-bold">{formatVND(data.mainMetrics.cpcHigh)}₫</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                  )}
                </CardContent>
              </Card>

              {/* Competition Level */}
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Competition (PLA)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {data.mainMetrics?.competitionLevel ?? "N/A"}
                    {data.mainMetrics?.competitionLevel !== null && "/100"}
                  </div>
                  {data.mainMetrics?.competitionLevel !== null && data.mainMetrics?.competitionLevel !== undefined && (
                    <Badge
                      variant="outline"
                      className={
                        getCompetitionLevel(data.mainMetrics.competitionLevel).color === "green"
                          ? "bg-green-100 text-green-800 border-green-300"
                          : getCompetitionLevel(data.mainMetrics.competitionLevel).color === "yellow"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : "bg-red-100 text-red-800 border-red-300"
                      }
                    >
                      {getCompetitionLevel(data.mainMetrics.competitionLevel).label}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Trend Chart */}
            {data.mainMetrics?.monthlySearchVolumes && data.mainMetrics.monthlySearchVolumes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Trend</CardTitle>
                  <CardDescription>Monthly search volume for the last 12 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <MonthlyTrendsChart monthlyVolumes={data.mainMetrics.monthlySearchVolumes} />
                </CardContent>
              </Card>
            )}

            {/* Keyword Ideas & Related URLs - Split 50/50 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Keyword Ideas */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Keyword Ideas</CardTitle>
                      <CardDescription>
                        {data.keywordVariations.length} related keywords found
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const encodedKeyword = encodeURIComponent(data.mainMetrics?.keyword || "");
                        setLocation(`/keyword-planner?q=${encodedKeyword}`);
                      }}
                      className="flex items-center gap-2"
                    >
                      View all
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
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

              {/* Related URLs from GSC */}
              <Card>
                <CardHeader>
                  <CardTitle>Related URLs (GSC)</CardTitle>
                  <CardDescription>
                    Pages ranking for "{data.mainMetrics?.keyword}" on your site
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.relatedURLs && data.relatedURLs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>URL</TableHead>
                          <TableHead className="text-right">Clicks</TableHead>
                          <TableHead className="text-right">Position</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.relatedURLs.slice(0, 10).map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium text-xs max-w-xs truncate">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {item.url}
                              </a>
                            </TableCell>
                            <TableCell className="text-right">{item.clicks}</TableCell>
                            <TableCell className="text-right">{item.position.toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No URLs found for this keyword on your site
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Topical Authority Generator */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Topical Authority Map</CardTitle>
                    <CardDescription>
                      AI-powered content architecture based on {data.keywordVariations.length} keywords
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleGenerateTopicalAuthority}
                    disabled={isGeneratingTA}
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    {isGeneratingTA ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Network className="h-4 w-4" />
                        Generate Topical Authority
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {topicalAuthority ? (
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">
                        Central Entity: {topicalAuthority.topical_authority_map?.meta?.central_entity || "N/A"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {topicalAuthority.topical_authority_map?.meta?.primary_search_intent || ""}
                      </p>

                      {/* Silos */}
                      {topicalAuthority.topical_authority_map?.silos?.map((silo: any, siloIdx: number) => (
                        <div key={siloIdx} className="mt-4 border-l-4 border-blue-500 pl-4">
                          <h4 className="font-semibold text-lg mb-2">
                            {silo.silo_name}
                            <Badge variant={silo.silo_type === "core" ? "default" : "secondary"} className="ml-2">
                              {silo.silo_type}
                            </Badge>
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">{silo.silo_description}</p>

                          {/* Topic Clusters */}
                          {silo.topic_clusters?.map((cluster: any, clusterIdx: number) => (
                            <div key={clusterIdx} className="ml-4 mt-3 border-l-2 border-green-500 pl-3">
                              <h5 className="font-semibold mb-2">{cluster.cluster_name}</h5>
                              <p className="text-xs text-muted-foreground mb-2">{cluster.cluster_description}</p>

                              {/* Pillar Page */}
                              {cluster.pillar_page && (
                                <div className="bg-background p-3 rounded border mb-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">Pillar</Badge>
                                    <span className="font-medium text-sm">{cluster.pillar_page.page_title}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Primary: {cluster.pillar_page.primary_keyword} ({cluster.pillar_page.search_volume?.toLocaleString() || 0} searches)
                                  </p>
                                </div>
                              )}

                              {/* Supporting Pages */}
                              {cluster.supporting_pages && cluster.supporting_pages.length > 0 && (
                                <div className="ml-3 space-y-1">
                                  {cluster.supporting_pages.slice(0, 5).map((page: any, pageIdx: number) => (
                                    <div key={pageIdx} className="text-xs bg-muted/50 p-2 rounded">
                                      <span className="font-medium">{page.page_title}</span>
                                      <span className="text-muted-foreground ml-2">
                                        ({page.search_volume?.toLocaleString() || 0} searches)
                                      </span>
                                    </div>
                                  ))}
                                  {cluster.supporting_pages.length > 5 && (
                                    <p className="text-xs text-muted-foreground ml-2">
                                      +{cluster.supporting_pages.length - 5} more pages
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Download Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(topicalAuthority, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `topical-authority-${data.mainMetrics?.keyword}.json`;
                          a.click();
                        }}
                      >
                        <FileJson className="h-4 w-4 mr-2" />
                        Download JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPDF}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Click "Generate Topical Authority" to create a comprehensive content architecture map
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Questions & Answers (AI-Generated) */}
            {data.questionKeywords && data.questionKeywords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Question Keywords & Answers</CardTitle>
                  <CardDescription>AI-generated answers for question-based keywords</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.questionKeywords.map((item, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-base">{item.keyword}</h4>
                          {item.volume && (
                            <Badge variant="secondary" className="ml-2">
                              {formatNumber(item.volume)} searches
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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

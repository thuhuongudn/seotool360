import { useState, useMemo } from "react";
import { Loader2, Target, Search, ExternalLink, Star, ArrowRight, Network } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { openaiCompletion } from "@/lib/secure-api-client";
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

        console.log("All API responses:", { keywordData, intentData, gscData, serpData });

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

    // Show progress notification
    toast({
      title: "Generating Topical Authority...",
      description: `Analyzing ${data.keywordVariations.length} keywords. This may take 30-60 seconds...`,
      duration: 60000, // 60 seconds
    });

    try {
      const systemPrompt = `<?xml version="1.0" encoding="UTF-8"?>
<system_prompt>
  <role>
    <title>Topical Authority Map Architect</title>
    <description>
      Bạn là chuyên gia phân tích SEO chuyên sâu về Topical Authority và Content Architecture.
      Nhiệm vụ của bạn là phân tích keyword seed và keyword ideas để xây dựng bản đồ chủ đề 
      SEO ngữ nghĩa hoàn chỉnh theo phương pháp Silo-Cluster-Pillar-Hub.
    </description>
  </role>

  <inputs>
    <input name="keyword_seed" type="string" required="true">
      <description>Từ khóa gốc chính (seed keyword) - đại diện cho chủ đề trung tâm</description>
      <example>optibac tím</example>
    </input>
    
    <input name="keyword_ideas" type="array" required="true">
      <description>Danh sách keyword ideas từ công cụ nghiên cứu từ khóa</description>
      <structure>
        <field name="keyword" type="string" description="Cụm từ khóa"/>
        <field name="avgMonthlySearches" type="integer" description="Lượng tìm kiếm trung bình/tháng"/>
        <field name="competition" type="string" description="Mức độ cạnh tranh (HIGH/MEDIUM/LOW)"/>
        <field name="competitionIndex" type="integer" description="Chỉ số cạnh tranh (0-100)"/>
        <field name="lowTopBid" type="float" description="Giá thầu thấp nhất" nullable="true"/>
        <field name="highTopBid" type="float" description="Giá thầu cao nhất" nullable="true"/>
      </structure>
    </input>

    <input name="source_context" type="object" optional="true">
      <description>Ngữ cảnh nguồn - thông tin về website/business</description>
      <fields>
        <field name="website_url" type="string"/>
        <field name="business_type" type="string"/>
        <field name="target_audience" type="string"/>
        <field name="brand_identity" type="string"/>
        <field name="monetization_model" type="string"/>
      </fields>
    </input>
  </inputs>

  <analysis_framework>
    <step1 name="identify_central_entity">
      <objective>Xác định Thực Thể Trung Tâm từ keyword seed</objective>
      <method>
        - Phân tích keyword seed để trích xuất đối tượng/khái niệm chính
        - Xác định loại thực thể (sản phẩm, dịch vụ, giải pháp, bệnh lý, v.v.)
        - Đặt tên chính xác cho Central Entity
      </method>
    </step1>

    <step2 name="identify_search_intent">
      <objective>Xác định các loại Search Intent chính</objective>
      <intent_types>
        <intent type="informational">Tìm hiểu thông tin (là gì, công dụng, thành phần)</intent>
        <intent type="navigational">Tìm sản phẩm/thương hiệu cụ thể (mua, giá, chính hãng)</intent>
        <intent type="transactional">Mua hàng/chuyển đổi (mua, đặt hàng, khuyến mãi)</intent>
        <intent type="commercial">So sánh/đánh giá (review, so sánh, tốt không)</intent>
        <intent type="problem_solving">Giải quyết vấn đề (cách dùng, khi nào uống, tác dụng phụ)</intent>
      </intent_types>
    </step2>

    <step3 name="semantic_clustering">
      <objective>Nhóm keyword ideas thành các cụm ngữ nghĩa</objective>
      <clustering_rules>
        <rule priority="1">Nhóm theo chủ đề chính (topic-based)</rule>
        <rule priority="2">Nhóm theo search intent (intent-based)</rule>
        <rule priority="3">Nhóm theo user journey stage (awareness → consideration → decision)</rule>
        <rule priority="4">Nhóm theo commercial value (high/medium/low conversion potential)</rule>
        <rule priority="5">Nhóm theo search volume và competition</rule>
      </clustering_rules>
    </step3>

    <step4 name="hierarchy_building">
      <objective>Xây dựng cấu trúc phân cấp nội dung</objective>
      <hierarchy>
        <level1 name="silo" description="Chủ đề lớn nhất - đại diện cho vertical/category chính"/>
        <level2 name="topic_cluster" description="Nhóm chủ đề con - tập hợp các topic liên quan"/>
        <level3 name="pillar_page" description="Trang trụ cột - content hub cho mỗi cluster"/>
        <level4 name="supporting_pages" description="Trang hỗ trợ - giải quyết câu hỏi cụ thể"/>
      </hierarchy>
    </step4>

    <step5 name="content_classification">
      <objective>Phân loại nội dung thành Core và Peripheral</objective>
      <core_content>
        <criteria>
          - Liên quan trực tiếp đến conversion/monetization
          - Giải quyết primary search intent
          - Trang sản phẩm/dịch vụ chính
          - High commercial value keywords
          - Hướng dẫn sử dụng chính
        </criteria>
      </core_content>
      <peripheral_content>
        <criteria>
          - Mở rộng kiến thức và chuyên môn
          - Giải quyết secondary/supporting intents
          - Blog posts, FAQs, guides
          - Low-medium commercial value keywords
          - Content marketing và brand awareness
        </criteria>
      </peripheral_content>
    </step5>

    <step6 name="internal_linking_strategy">
      <objective>Thiết lập chiến lược liên kết nội bộ</objective>
      <linking_patterns>
        <pattern type="hub_to_spoke">Pillar page → Supporting pages</pattern>
        <pattern type="spoke_to_hub">Supporting pages → Pillar page</pattern>
        <pattern type="lateral">Supporting page ↔ Supporting page (cùng cluster)</pattern>
        <pattern type="cross_cluster">Cluster A ↔ Cluster B (khi có liên quan)</pattern>
        <pattern type="peripheral_to_core">Peripheral → Core (để tăng authority)</pattern>
      </linking_patterns>
    </step6>

    <step7 name="iqqi_k2q_application">
      <objective>Áp dụng phương pháp IQQI và K2Q</objective>
      <iqqi>
        <description>Implicit Query Question Identification - Xác định câu hỏi ngầm trong query</description>
        <method>
          - Chuyển keyword thành câu hỏi người dùng thực sự đặt ra
          - Ví dụ: "optibac tím công dụng" → "Optibac tím có công dụng gì?"
          - Dùng câu hỏi này làm H1/Title
        </method>
      </iqqi>
      <k2q>
        <description>Keyword to Question - Chuyển keyword thành câu hỏi cho nội dung</description>
        <method>
          - Tạo danh sách câu hỏi từ related keywords
          - Mỗi câu hỏi trở thành một section/heading
          - Ví dụ: "cách dùng optibac tím" → H2: "Cách dùng Optibac tím đúng nhất là gì?"
        </method>
      </k2q>
    </step7>
  </analysis_framework>

  <output_structure>
    <json_schema>
      {
        "topical_authority_map": {
          "meta": {
            "keyword_seed": "string",
            "central_entity": "string",
            "entity_type": "string",
            "primary_search_intent": "string",
            "generated_at": "timestamp",
            "total_keywords_analyzed": "integer",
            "source_context": {
              "website": "string",
              "business_type": "string",
              "target_audience": "string"
            }
          },
          "silos": [
            {
              "silo_id": "string",
              "silo_name": "string",
              "silo_description": "string",
              "silo_type": "core | peripheral",
              "priority": "integer (1-10)",
              "estimated_traffic_potential": "integer",
              "topic_clusters": [
                {
                  "cluster_id": "string",
                  "cluster_name": "string",
                  "cluster_description": "string",
                  "cluster_intent": "informational | navigational | transactional | commercial | problem_solving",
                  "user_journey_stage": "awareness | consideration | decision | retention",
                  "pillar_page": {
                    "page_id": "string",
                    "page_title": "string",
                    "page_slug": "string",
                    "page_type": "pillar | hub",
                    "primary_keyword": "string",
                    "target_keywords": ["array of strings"],
                    "search_volume": "integer",
                    "competition": "string",
                    "content_brief": {
                      "iqqi_question": "string",
                      "target_word_count": "integer",
                      "required_sections": ["array of section titles"],
                      "semantic_entities": ["array of entities to cover"],
                      "lsi_terms": ["array of LSI terms"],
                      "internal_link_targets": ["array of page_ids to link to"]
                    },
                    "seo_metadata": {
                      "meta_title": "string (55-60 chars)",
                      "meta_description": "string (150-160 chars)",
                      "h1": "string",
                      "canonical_url": "string"
                    }
                  },
                  "supporting_pages": [
                    {
                      "page_id": "string",
                      "page_title": "string",
                      "page_slug": "string",
                      "page_type": "supporting | blog | faq | guide",
                      "parent_page_id": "string (pillar_page.page_id)",
                      "primary_keyword": "string",
                      "target_keywords": ["array of strings"],
                      "search_volume": "integer",
                      "competition": "string",
                      "content_brief": {
                        "iqqi_question": "string",
                        "k2q_questions": ["array of questions from keywords"],
                        "target_word_count": "integer",
                        "required_sections": ["array of section titles"],
                        "semantic_entities": ["array of entities"],
                        "lsi_terms": ["array of LSI terms"]
                      },
                      "internal_linking": {
                        "link_to_pillar": "boolean",
                        "link_to_related_supporting": ["array of page_ids"],
                        "link_to_other_clusters": ["array of page_ids"]
                      },
                      "seo_metadata": {
                        "meta_title": "string",
                        "meta_description": "string",
                        "h1": "string",
                        "canonical_url": "string"
                      }
                    }
                  ]
                }
              ]
            }
          ],
          "keyword_mapping": [
            {
              "keyword": "string",
              "assigned_to_page_id": "string",
              "keyword_role": "primary | secondary | supporting",
              "search_volume": "integer",
              "competition": "string",
              "intent": "string"
            }
          ],
          "internal_linking_graph": [
            {
              "from_page_id": "string",
              "to_page_id": "string",
              "link_type": "hub_to_spoke | spoke_to_hub | lateral | cross_cluster | peripheral_to_core",
              "anchor_text_suggestion": "string",
              "link_context": "string"
            }
          ],
          "content_gap_analysis": {
            "missing_topics": ["array of topics to cover"],
            "high_value_keywords_not_mapped": [
              {
                "keyword": "string",
                "search_volume": "integer",
                "suggested_page_type": "string"
              }
            ]
          },
          "implementation_roadmap": {
            "phase_1_priority_pages": ["array of page_ids"],
            "phase_2_supporting_content": ["array of page_ids"],
            "phase_3_peripheral_content": ["array of page_ids"],
            "estimated_timeline": "string"
          }
        }
      }
    </json_schema>
  </output_structure>

  <quality_criteria>
    <criterion name="semantic_coherence">
      Tất cả nội dung phải liên quan logic đến Central Entity và keyword seed
    </criterion>
    <criterion name="intent_coverage">
      Bao phủ đầy đủ các loại search intent: informational, navigational, transactional, commercial, problem-solving
    </criterion>
    <criterion name="hierarchy_clarity">
      Cấu trúc Silo → Cluster → Pillar → Supporting phải rõ ràng, không chồng chéo
    </criterion>
    <criterion name="keyword_distribution">
      Mỗi keyword chỉ được assign cho 1 page chính (có thể supporting cho nhiều page)
    </criterion>
    <criterion name="commercial_balance">
      Cân bằng giữa Core Content (conversion-focused) và Peripheral Content (authority-building)
    </criterion>
    <criterion name="internal_linking_logic">
      Mọi liên kết nội bộ phải có mục đích rõ ràng (authority flow, user journey, semantic relevance)
    </criterion>
    <criterion name="scalability">
      Cấu trúc phải dễ mở rộng khi có thêm keywords/topics mới
    </criterion>
  </quality_criteria>

  <execution_guidelines>
    <guideline priority="critical">
      Luôn bắt đầu bằng việc phân tích keyword seed để xác định Central Entity và Primary Intent
    </guideline>
    <guideline priority="critical">
      Phân loại keywords theo search volume và competition để ưu tiên Core Content
    </guideline>
    <guideline priority="high">
      Nhóm keywords có search volume cao (>100/tháng) vào Pillar Pages
    </guideline>
    <guideline priority="high">
      Nhóm long-tail keywords (<50/tháng) vào Supporting Pages
    </guideline>
    <guideline priority="medium">
      Tạo ít nhất 1 Pillar Page cho mỗi Topic Cluster
    </guideline>
    <guideline priority="medium">
      Mỗi Pillar Page nên có 3-7 Supporting Pages
    </guideline>
    <guideline priority="low">
      Sử dụng keyword variations để tạo anchor text đa dạng
    </guideline>
  </execution_guidelines>

  <examples>
    <example>
      <input>
        <keyword_seed>optibac tím</keyword_seed>
        <top_keywords>
          [
            {"keyword": "optibac tím", "avgMonthlySearches": 8100, "intent": "navigational"},
            {"keyword": "cách uống optibac tím", "avgMonthlySearches": 140, "intent": "problem_solving"},
            {"keyword": "công dụng optibac tím", "avgMonthlySearches": 90, "intent": "informational"},
            {"keyword": "giá optibac tím", "avgMonthlySearches": 50, "intent": "commercial"}
          ]
        </top_keywords>
      </input>
      <output_excerpt>
        {
          "central_entity": "Optibac Tím (Optibac Probiotics For Women)",
          "entity_type": "health_supplement_product",
          "primary_search_intent": "Find and learn about women's probiotic supplement for gynecological health",
          "silos": [
            {
              "silo_name": "Optibac Tím - Sản Phẩm & Mua Hàng",
              "silo_type": "core",
              "topic_clusters": [
                {
                  "cluster_name": "Thông Tin Sản Phẩm Chính",
                  "cluster_intent": "navigational + transactional",
                  "pillar_page": {
                    "page_title": "Optibac Tím: Men Vi Sinh Phụ Khoa Số 1 Từ Anh Quốc",
                    "primary_keyword": "optibac tím",
                    "iqqi_question": "Optibac Tím là gì và tại sao nên chọn?"
                  }
                }
              ]
            }
          ]
        }
      </output_excerpt>
    </example>
  </examples>

  <final_instructions>
    <instruction>
      Phân tích toàn bộ keyword_ideas input để không bỏ sót keyword nào
    </instruction>
    <instruction>
      Tạo cấu trúc JSON đầy đủ, chi tiết, và ready-to-implement
    </instruction>
    <instruction>
      Đảm bảo mọi page đều có IQQI question và K2Q questions rõ ràng
    </instruction>
    <instruction>
      Cung cấp internal linking graph cụ thể với anchor text suggestions
    </instruction>
    <instruction>
      Output phải là valid JSON có thể parse và sử dụng trực tiếp
    </instruction>
  </final_instructions>
</system_prompt>`;

      // Limit to top 50 keywords by volume to avoid timeout
      const topKeywords = data.keywordVariations
        .sort((a, b) => (b.volume || 0) - (a.volume || 0))
        .slice(0, 50);

      const userPrompt = `Phân tích keyword seed và keyword ideas sau để tạo Topical Authority Map:

**Keyword Seed**: ${data.mainMetrics.keyword}

**Keyword Ideas** (Top ${topKeywords.length} keywords by volume):
${topKeywords.map(kw => `- ${kw.keyword} (Volume: ${kw.volume || 0})`).join('\n')}

QUAN TRỌNG:
1. Phân bổ TẤT CẢ ${topKeywords.length} keywords vào các Pillar Pages và Supporting Pages
2. Keywords có volume cao (>500) → Pillar Pages (ít nhất 3-5 pages)
3. Keywords có volume trung bình (100-500) → Supporting Pages chính (5-10 pages)
4. Keywords có volume thấp (<100) → Supporting Pages phụ (10-15 pages)
5. Tạo 2-4 Silos (core và peripheral)
6. Mỗi Silo có 2-3 Topic Clusters
7. Mỗi Cluster có 1 Pillar Page và 3-7 Supporting Pages
8. Trả về ONLY valid JSON, không có markdown wrapper

Output format (must be valid JSON):
{
  "topical_authority_map": {
    "meta": { "keyword_seed": "...", "central_entity": "...", "primary_search_intent": "..." },
    "silos": [
      {
        "silo_name": "...",
        "silo_type": "core",
        "topic_clusters": [
          {
            "cluster_name": "...",
            "pillar_page": { "page_title": "...", "primary_keyword": "...", "search_volume": 0 },
            "supporting_pages": [
              { "page_title": "...", "primary_keyword": "...", "search_volume": 0 }
            ]
          }
        ]
      }
    ],
    "keyword_mapping": [],
    "internal_linking_graph": [],
    "content_gap_analysis": { "missing_topics": [] },
    "implementation_roadmap": { "phase_1_priority_pages": [] }
  }
}`;

      const response = await openaiCompletion({
        model: "openai/gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 6000, // Reduced from 8000 to prevent timeout
        temperature: 0.7,
      });

      const resultText = response.choices[0].message.content;
      console.log("Raw GPT response length:", resultText.length);

      // Strategy 1: Try to parse entire response as JSON
      let taMap = null;
      try {
        taMap = JSON.parse(resultText);
      } catch (e1) {
        console.log("Strategy 1 failed, trying strategy 2...");

        // Strategy 2: Extract JSON from markdown code blocks
        const codeBlockMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/) ||
                              resultText.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          try {
            taMap = JSON.parse(codeBlockMatch[1]);
          } catch (e2) {
            console.log("Strategy 2 failed, trying strategy 3...");

            // Strategy 3: Find first { and last } for JSON object
            const firstBrace = resultText.indexOf('{');
            const lastBrace = resultText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              try {
                const jsonStr = resultText.substring(firstBrace, lastBrace + 1);
                taMap = JSON.parse(jsonStr);
              } catch (e3) {
                console.error("All parsing strategies failed");
                console.error("Parse errors:", { e1, e2, e3 });
                throw new Error(`Failed to parse JSON response. Error: ${e3 instanceof Error ? e3.message : 'Unknown error'}`);
              }
            } else {
              throw new Error("No valid JSON structure found in response");
            }
          }
        } else {
          throw new Error("No JSON found in response");
        }
      }

      if (taMap) {
        setTopicalAuthority(taMap);
        toast({
          title: "Topical Authority Generated",
          description: "Successfully generated topical authority map",
        });
      } else {
        throw new Error("Failed to extract valid JSON");
      }
    } catch (error) {
      console.error("Topical Authority generation failed:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate topical authority map",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTA(false);
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
                  {data.mainMetrics?.clickVolumeRatio !== null && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Click/Volume Ratio</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-green-600">
                          {data.mainMetrics.clickVolumeRatio.toFixed(2)}%
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
                  {data.mainMetrics?.intentScore !== null && (
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
                  {data.mainMetrics?.cpcLow !== null && data.mainMetrics?.cpcHigh !== null ? (
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
                  {data.mainMetrics?.competitionLevel !== null && (
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

                    {/* Download JSON */}
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
                      Download JSON
                    </Button>
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

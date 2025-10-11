import { useState, useEffect, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, BarChart3, Search, Download, AlertCircle, ExternalLink, TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Globe, Copy, CheckCircle2, XCircle, AlertTriangle, Clock, Rocket } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTokenManagement } from "@/hooks/use-token-management";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

interface MergedRow extends GSCRow {
  previousClicks?: number;
  previousImpressions?: number;
  previousCtr?: number;
  previousPosition?: number;
  clicksDiff?: number;
  impressionsDiff?: number;
  ctrDiff?: number;
  positionDiff?: number;
  clicksChangePercent?: number;
  impressionsChangePercent?: number;
  ctrChangePercent?: number;
  positionChangePercent?: number;
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
  previousRows?: GSCRow[];
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

interface URLInspectionIndexStatusResult {
  verdict?: string;
  coverageState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  robotsTxtState?: string;
  googleCanonical?: string;
  userCanonical?: string;
  crawledAs?: string;
}

interface URLInspectionMobileUsabilityIssue {
  issueType?: string;
  message?: string;
}

interface URLInspectionMobileUsabilityResult {
  verdict?: string;
  issues?: URLInspectionMobileUsabilityIssue[];
}

interface URLInspectionRichResultItem {
  richResultType?: string;
  items?: Array<{
    name?: string;
    issues?: Array<{ message?: string }>;
  }>;
}

interface URLInspectionRichResultsResult {
  verdict?: string;
  detectedItems?: URLInspectionRichResultItem[];
}

interface URLInspectionResult {
  indexStatusResult?: URLInspectionIndexStatusResult | null;
  mobileUsabilityResult?: URLInspectionMobileUsabilityResult | null;
  richResultsResult?: URLInspectionRichResultsResult | null;
}

interface UrlInspectionApiResponse {
  success: boolean;
  data?: {
    inspectionResult?: URLInspectionResult;
  };
  error?: string;
  message?: string;
}

interface RequestIndexingResponse {
  success: boolean;
  message?: string;
  error?: string;
}

type UrlInspectionPayload = {
  inspectionUrl: string;
  siteUrl: string;
  languageCode?: string;
};

type RequestIndexingPayload = {
  url: string;
  type: "URL_UPDATED" | "URL_DELETED";
};

// Predefined GSC properties
const GSC_SITES = [
  "https://nhathuocvietnhat.vn",
];

const LANGUAGE_OPTIONS = [
  { value: "vi", label: "Tiếng Việt (vi)" },
  { value: "en", label: "English (en)" },
  { value: "en-US", label: "English - US (en-US)" },
];

const VERDICT_META: Record<
  string,
  {
    label: string;
    className: string;
    tone: "positive" | "negative" | "neutral";
  }
> = {
  PASS: {
    label: "Đã indexed",
    className:
      "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200",
    tone: "positive",
  },
  FAIL: {
    label: "Chưa indexed",
    className:
      "bg-red-500/10 text-red-600 border border-red-500/30 dark:bg-red-500/20 dark:text-red-200",
    tone: "negative",
  },
  NEUTRAL: {
    label: "Trung tính",
    className:
      "bg-amber-500/10 text-amber-600 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-200",
    tone: "neutral",
  },
};

const DEFAULT_VERDICT_META = {
  label: "Không xác định",
  className:
    "bg-muted text-muted-foreground border border-border dark:border-slate-700",
  tone: "neutral" as const,
};

function getVerdictMeta(verdict?: string | null) {
  if (!verdict) {
    return DEFAULT_VERDICT_META;
  }
  return VERDICT_META[verdict] || DEFAULT_VERDICT_META;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Không có dữ liệu";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseApiErrorMessage(error: Error): { message: string; details?: string } {
  const fallback = {
    message: error.message || "Không thể kết nối tới máy chủ.",
  };

  if (!error.message) {
    return fallback;
  }

  const separatorIndex = error.message.indexOf(":");
  if (separatorIndex === -1) {
    return fallback;
  }

  const rawBody = error.message.slice(separatorIndex + 1).trim();
  if (!rawBody) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === "object") {
      const parsedMessage = parsed.error || parsed.message || fallback.message;
      return {
        message: parsedMessage,
        details: parsed.details || parsed.rawError,
      };
    }
  } catch (_err) {
    return {
      message: rawBody,
    };
  }

  return fallback;
}

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

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<"performance" | "url-inspection">("performance");

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

  // URL Inspection state
  const [inspectionUrl, setInspectionUrl] = useState("");
  const [inspectionLanguage, setInspectionLanguage] = useState(LANGUAGE_OPTIONS[0].value);
  const [inspectionResult, setInspectionResult] = useState<URLInspectionResult | null>(null);
  const [lastInspectedUrl, setLastInspectedUrl] = useState("");
  const [lastInspectedSiteUrl, setLastInspectedSiteUrl] = useState("");
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<string | null>(null);
  const [indexingError, setIndexingError] = useState<string | null>(null);

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

  const urlInspectionMutation = useMutation<UrlInspectionApiResponse, Error, UrlInspectionPayload>({
    mutationFn: async (payload) => {
      const response = await apiRequest("POST", "/api/gsc/url-inspection", payload);
      return await response.json() as UrlInspectionApiResponse;
    },
    onMutate: () => {
      setInspectionError(null);
      setIndexingError(null);
      setIndexingStatus(null);
      setInspectionResult(null);
      setLastInspectedUrl("");
      setLastInspectedSiteUrl("");
    },
    onSuccess: (data, variables) => {
      if (data.success && data.data?.inspectionResult) {
        setInspectionResult(data.data.inspectionResult);
        setLastInspectedUrl(variables.inspectionUrl);
        setLastInspectedSiteUrl(variables.siteUrl);
        toast({
          title: "Đã kiểm tra URL",
          description: "Dữ liệu URL Inspection đã sẵn sàng.",
        });
      } else {
        const errorMessage = data.error || data.message || "Không thể kiểm tra URL. Vui lòng thử lại.";
        setInspectionError(errorMessage);
        toast({
          title: "Kiểm tra URL thất bại",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      const parsed = parseApiErrorMessage(error);
      const message = parsed.message || "Không thể kết nối tới dịch vụ kiểm tra URL.";
      setInspectionError(message);
      toast({
        title: "Kiểm tra URL thất bại",
        description: message,
        variant: "destructive",
      });
    },
  });

  const requestIndexingMutation = useMutation<RequestIndexingResponse, Error, RequestIndexingPayload>({
    mutationFn: async (payload) => {
      const response = await apiRequest("POST", "/api/gsc/request-indexing", payload);
      return await response.json() as RequestIndexingResponse;
    },
    onMutate: () => {
      setIndexingError(null);
    },
    onSuccess: (data) => {
      if (data.success) {
        const successMessage = data.message || "Đã gửi yêu cầu lập chỉ mục thành công.";
        setIndexingStatus(successMessage);
        toast({
          title: "Đã gửi yêu cầu",
          description: successMessage,
        });
      } else {
        const errorMessage = data.error || "Không thể gửi yêu cầu lập chỉ mục.";
        setIndexingError(errorMessage);
        toast({
          title: "Yêu cầu lập chỉ mục thất bại",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      const parsed = parseApiErrorMessage(error);
      const message = parsed.message || "Không thể gửi yêu cầu lập chỉ mục.";
      setIndexingError(message);
      toast({
        title: "Yêu cầu lập chỉ mục thất bại",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Auto-fetch domain overview when entering performance view
  useEffect(() => {
    if (activeView === "performance" && !result && toolId && canUseToken) {
      // Trigger initial fetch with default settings (domain-wide, last 28d, web, no comparison)
      const dateRange = calculateDateRange();
      const payload = {
        siteUrl: siteUrl.trim(),
        mode: "queries-for-page", // Use queries-for-page mode with empty value for domain-wide
        value: "", // Empty = domain-wide query
        timePreset,
        searchType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        comparisonMode: false,
      };

      executeWithToken(toolId, 1, async () => {
        mutation.mutate(payload);
        return true;
      });
    }
  }, [activeView, toolId, canUseToken]); // Only run when view changes or toolId/auth changes

  useEffect(() => {
    if (!indexingStatus) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIndexingStatus(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [indexingStatus]);

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

  const handleUrlInspection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!toolId) {
      toast({
        title: "Không xác định được công cụ",
        description: "Vui lòng tải lại trang và thử lại.",
        variant: "destructive",
      });
      return;
    }

    if (urlInspectionMutation.isPending || isTokenProcessing) {
      return;
    }

    setInspectionError(null);
    setIndexingError(null);

    const trimmedInspectionUrl = inspectionUrl.trim();
    const trimmedSiteUrl = siteUrl.trim();

    if (!trimmedInspectionUrl) {
      setInspectionError("Vui lòng nhập URL cần kiểm tra.");
      return;
    }

    if (!trimmedSiteUrl) {
      setInspectionError("Vui lòng chọn Site URL hợp lệ.");
      return;
    }

    let normalizedInspectionUrl: string;
    try {
      const parsedInspectionUrl = new URL(trimmedInspectionUrl);
      normalizedInspectionUrl = parsedInspectionUrl.toString();
    } catch (_error) {
      setInspectionError("URL không hợp lệ. Vui lòng sử dụng định dạng https://domain.com/path");
      return;
    }

    let normalizedSiteUrl: string;
    try {
      const parsedSiteUrl = new URL(trimmedSiteUrl);
      normalizedSiteUrl = parsedSiteUrl.toString();
    } catch (_error) {
      setInspectionError("Site URL không hợp lệ. Vui lòng kiểm tra cấu hình GSC property.");
      return;
    }

    if (!normalizedSiteUrl.endsWith("/")) {
      normalizedSiteUrl = `${normalizedSiteUrl}/`;
    }

    setInspectionUrl(normalizedInspectionUrl);

    await executeWithToken(toolId, 1, async () => {
      urlInspectionMutation.mutate({
        inspectionUrl: normalizedInspectionUrl,
        siteUrl: normalizedSiteUrl,
        languageCode: inspectionLanguage?.trim() || undefined,
      });
      return true;
    });
  };

  const handleRequestIndexing = async () => {
    if (!toolId) {
      toast({
        title: "Không xác định được công cụ",
        description: "Vui lòng tải lại trang và thử lại.",
        variant: "destructive",
      });
      return;
    }

    if (!inspectionResult || !lastInspectedUrl) {
      setIndexingError("Vui lòng kiểm tra URL trước khi gửi yêu cầu lập chỉ mục.");
      return;
    }

    if (requestIndexingMutation.isPending || isTokenProcessing) {
      return;
    }

    await executeWithToken(toolId, 1, async () => {
      requestIndexingMutation.mutate({
        url: lastInspectedUrl,
        type: "URL_UPDATED",
      });
      return true;
    });
  };

  const handleCopyToClipboard = async (value?: string | null) => {
    if (!value) {
      toast({
        title: "Không có dữ liệu",
        description: "Không tìm thấy giá trị để sao chép.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: "Đã sao chép",
        description: "Giá trị đã được lưu vào clipboard.",
      });
    } catch (_error) {
      toast({
        title: "Không thể sao chép",
        description: "Trình duyệt từ chối thao tác sao chép. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Merge current and previous period data by keyword/page
  const mergeRowsWithPrevious = (currentRows: GSCRow[], previousRows?: GSCRow[]): MergedRow[] => {
    if (!comparisonMode || !previousRows || previousRows.length === 0) {
      return currentRows;
    }

    // Create a map of previous data by key (query or page)
    const previousMap = new Map<string, GSCRow>();
    previousRows.forEach(row => {
      const key = row.keys[0]; // query or page URL
      previousMap.set(key, row);
    });

    // Merge current rows with previous data
    return currentRows.map(currentRow => {
      const key = currentRow.keys[0];
      const previousRow = previousMap.get(key);

      if (!previousRow) {
        // No previous data for this keyword/page
        return currentRow;
      }

      // Calculate differences and percentage changes
      const clicksDiff = currentRow.clicks - previousRow.clicks;
      const impressionsDiff = currentRow.impressions - previousRow.impressions;
      const ctrDiff = currentRow.ctr - previousRow.ctr;
      const positionDiff = currentRow.position - previousRow.position;

      const clicksChangePercent = previousRow.clicks > 0
        ? ((clicksDiff / previousRow.clicks) * 100)
        : (currentRow.clicks > 0 ? 100 : 0);

      const impressionsChangePercent = previousRow.impressions > 0
        ? ((impressionsDiff / previousRow.impressions) * 100)
        : (currentRow.impressions > 0 ? 100 : 0);

      const ctrChangePercent = previousRow.ctr > 0
        ? ((ctrDiff / previousRow.ctr) * 100)
        : (currentRow.ctr > 0 ? 100 : 0);

      const positionChangePercent = previousRow.position > 0
        ? ((positionDiff / previousRow.position) * 100)
        : (currentRow.position > 0 ? 100 : 0);

      return {
        ...currentRow,
        previousClicks: previousRow.clicks,
        previousImpressions: previousRow.impressions,
        previousCtr: previousRow.ctr,
        previousPosition: previousRow.position,
        clicksDiff,
        impressionsDiff,
        ctrDiff,
        positionDiff,
        clicksChangePercent,
        impressionsChangePercent,
        ctrChangePercent,
        positionChangePercent,
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!siteUrl.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập Site URL.",
        variant: "destructive",
      });
      return;
    }

    // For url-and-query mode, require both pageUrl and keyword
    // For other modes, empty value is allowed (domain-wide query)
    if (mode === "url-and-query" && (!selectedPageUrl.trim() || !selectedKeyword.trim())) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập cả Page URL và Keyword cho mode URL + Query.",
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

  const getSortedRows = (): MergedRow[] => {
    if (!result) return [];

    // Merge current and previous data
    const mergedRows = mergeRowsWithPrevious(result.rows, result.previousRows);

    if (!sortField) return mergedRows;

    const sorted = [...mergedRows].sort((a, b) => {
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
    // For position: negative change is good (rank improved), positive is bad (rank dropped)
    const isPositionMetric = label === "Vị trí TB";

    let isPositive, isNegative, Icon, colorClass;

    if (isPositionMetric) {
      // Position: lower number is better
      isPositive = changePercent < 0; // Negative change = rank improved = green
      isNegative = changePercent > 0; // Positive change = rank dropped = red
      Icon = changePercent < 0 ? TrendingUp : changePercent > 0 ? TrendingDown : Minus;
      colorClass = changePercent < 0 ? "text-green-600" : changePercent > 0 ? "text-red-600" : "text-gray-600";
    } else {
      // Clicks, Impressions, CTR: higher is better
      isPositive = changePercent > 0;
      isNegative = changePercent < 0;
      Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
      colorClass = isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-600";
    }

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

  const indexStatus = inspectionResult?.indexStatusResult ?? null;
  const verdictMeta = getVerdictMeta(indexStatus?.verdict);
  const mobileVerdictMeta = getVerdictMeta(inspectionResult?.mobileUsabilityResult?.verdict);
  const richVerdictMeta = getVerdictMeta(inspectionResult?.richResultsResult?.verdict);
  const canonicalMismatch = Boolean(
    indexStatus?.googleCanonical &&
    indexStatus?.userCanonical &&
    indexStatus.googleCanonical !== indexStatus.userCanonical
  );
  const mobileIssues = inspectionResult?.mobileUsabilityResult?.issues ?? [];
  const richResultItems = inspectionResult?.richResultsResult?.detectedItems ?? [];
  const hasMobileIssues = mobileIssues.length > 0;
  const hasRichResults = richResultItems.length > 0;
  const searchConsoleInspectLink =
    lastInspectedUrl && lastInspectedSiteUrl
      ? `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(lastInspectedSiteUrl)}&url=${encodeURIComponent(lastInspectedUrl)}`
      : null;
  const requestIndexingDisabled =
    !canUseToken || requestIndexingMutation.isPending || isTokenProcessing;
  const indexStatusMetrics = [
    {
      label: "Coverage",
      value: indexStatus?.coverageState,
    },
    {
      label: "Trạng thái lập chỉ mục",
      value: indexStatus?.indexingState,
    },
    {
      label: "Lần crawl gần nhất",
      value: formatDateTime(indexStatus?.lastCrawlTime),
      icon: "clock" as const,
    },
    {
      label: "Robots.txt",
      value: indexStatus?.robotsTxtState,
    },
    {
      label: "Trạng thái fetch",
      value: indexStatus?.pageFetchState,
    },
    {
      label: "Thu thập dưới dạng",
      value: indexStatus?.crawledAs,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex">
        {/* LEFT SIDEBAR - Toggleable */}
        <aside className={`transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0'} border-r`}>
          {isSidebarOpen && (
            <div className="h-screen bg-muted/10 p-4 space-y-6">
              {/* Header with toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  <h3 className="font-semibold">GSC Property</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(false)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>

              {/* Site URL Selector */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Site URL</Label>
                <Select value={siteUrl} onValueChange={setSiteUrl}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GSC_SITES.map((site) => (
                      <SelectItem key={site} value={site}>{site}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Navigation Menu */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">CÔNG CỤ</p>

                <Button
                  variant={activeView === "performance" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveView("performance")}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Hiệu suất
                </Button>

                <Button
                  variant={activeView === "url-inspection" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveView("url-inspection")}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Kiểm tra URL
                </Button>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1">
          {/* Toggle button when sidebar is closed */}
          {!isSidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              className="m-4"
              onClick={() => setIsSidebarOpen(true)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

            {/* Content based on activeView */}
            {activeView === "performance" && (
              <div className="space-y-6">
                {/* Input Form - Compact horizontal layout */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cấu hình phân tích</CardTitle>
                    <CardDescription>Chọn chế độ phân tích và nhập thông tin</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit}>
                      <div className="space-y-4">
                        {/* Row 1: Mode radio buttons */}
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

                        {/* Row 2: Page URL + Keyword inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="pageUrl">Page URL</Label>
                            <Input
                              id="pageUrl"
                              placeholder="https://example.com/page"
                              value={mode === "url-and-query" ? selectedPageUrl : mode === "queries-for-page" ? value : ""}
                              onChange={(e) => {
                                if (mode === "url-and-query") {
                                  setSelectedPageUrl(e.target.value);
                                } else if (mode === "queries-for-page") {
                                  setValue(e.target.value);
                                }
                              }}
                              disabled={mode === "pages-for-keyword"}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="keyword">Keyword</Label>
                            <Input
                              id="keyword"
                              placeholder="seo tools"
                              value={mode === "url-and-query" ? selectedKeyword : mode === "pages-for-keyword" ? value : ""}
                              onChange={(e) => {
                                if (mode === "url-and-query") {
                                  setSelectedKeyword(e.target.value);
                                } else if (mode === "pages-for-keyword") {
                                  setValue(e.target.value);
                                }
                              }}
                              disabled={mode === "queries-for-page"}
                            />
                          </div>
                        </div>

                        {/* Row 3: Time Period buttons + Search Type + Comparison + Submit */}
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
                            <Button
                              type="button"
                              variant={timePreset === "custom" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTimePreset("custom")}
                              className="w-full"
                            >
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              Custom
                            </Button>
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

                        {/* Row 4: Custom date inputs (conditional) */}
                        {timePreset === "custom" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="customStartDate">Từ ngày</Label>
                              <Input
                                id="customStartDate"
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="customEndDate">Đến ngày</Label>
                              <Input
                                id="customEndDate"
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
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
                                    Clicks{comparisonMode && " (hiện tại)"} {sortField === "clicks" && (sortDirection === "desc" ? "↓" : "↑")}
                                  </TableHead>
                                  {comparisonMode && (
                                    <>
                                      <TableHead className="text-right">Clicks (kỳ trước)</TableHead>
                                      <TableHead className="text-right">Chênh lệch</TableHead>
                                    </>
                                  )}
                                  <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort("impressions")}>
                                    Impressions{comparisonMode && " (hiện tại)"} {sortField === "impressions" && (sortDirection === "desc" ? "↓" : "↑")}
                                  </TableHead>
                                  {comparisonMode && (
                                    <>
                                      <TableHead className="text-right">Impressions (kỳ trước)</TableHead>
                                      <TableHead className="text-right">Chênh lệch</TableHead>
                                    </>
                                  )}
                                  <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort("ctr")}>
                                    CTR{comparisonMode && " (hiện tại)"} {sortField === "ctr" && (sortDirection === "desc" ? "↓" : "↑")}
                                  </TableHead>
                                  {comparisonMode && (
                                    <>
                                      <TableHead className="text-right">CTR (kỳ trước)</TableHead>
                                      <TableHead className="text-right">Chênh lệch</TableHead>
                                    </>
                                  )}
                                  <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort("position")}>
                                    Position{comparisonMode && " (hiện tại)"} {sortField === "position" && (sortDirection === "desc" ? "↓" : "↑")}
                                  </TableHead>
                                  {comparisonMode && (
                                    <>
                                      <TableHead className="text-right">Position (kỳ trước)</TableHead>
                                      <TableHead className="text-right">Chênh lệch</TableHead>
                                    </>
                                  )}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getSortedRows().map((row, idx) => {
                                  const renderDiffCell = (diff?: number, changePercent?: number, isGoodWhenPositive: boolean = true) => {
                                    if (diff === undefined || changePercent === undefined) {
                                      return <TableCell className="text-right text-muted-foreground">-</TableCell>;
                                    }

                                    // For most metrics: positive = good (green), negative = bad (red)
                                    // For position: positive = bad (red), negative = good (green)
                                    const isGoodChange = isGoodWhenPositive ? (diff > 0) : (diff < 0);
                                    const colorClass = isGoodChange
                                      ? "text-green-600"
                                      : diff === 0
                                        ? "text-gray-600"
                                        : "text-red-600";
                                    const Icon = isGoodChange ? TrendingUp : diff === 0 ? Minus : TrendingDown;

                                    return (
                                      <TableCell className={`text-right ${colorClass}`}>
                                        <div className="flex items-center justify-end gap-1">
                                          <Icon className="h-3 w-3" />
                                          <span>{diff > 0 ? "+" : ""}{diff.toLocaleString()}</span>
                                          <span className="text-xs">({changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}%)</span>
                                        </div>
                                      </TableCell>
                                    );
                                  };

                                  return (
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

                                      {/* Clicks */}
                                      <TableCell className="text-right">{row.clicks.toLocaleString()}</TableCell>
                                      {comparisonMode && (
                                        <>
                                          <TableCell className="text-right text-muted-foreground">
                                            {row.previousClicks !== undefined ? row.previousClicks.toLocaleString() : "-"}
                                          </TableCell>
                                          {renderDiffCell(row.clicksDiff, row.clicksChangePercent, true /* positive = good */)}
                                        </>
                                      )}

                                      {/* Impressions */}
                                      <TableCell className="text-right">{row.impressions.toLocaleString()}</TableCell>
                                      {comparisonMode && (
                                        <>
                                          <TableCell className="text-right text-muted-foreground">
                                            {row.previousImpressions !== undefined ? row.previousImpressions.toLocaleString() : "-"}
                                          </TableCell>
                                          {renderDiffCell(row.impressionsDiff, row.impressionsChangePercent, true /* positive = good */)}
                                        </>
                                      )}

                                      {/* CTR */}
                                      <TableCell className="text-right">{(row.ctr * 100).toFixed(2)}%</TableCell>
                                      {comparisonMode && (
                                        <>
                                          <TableCell className="text-right text-muted-foreground">
                                            {row.previousCtr !== undefined ? `${(row.previousCtr * 100).toFixed(2)}%` : "-"}
                                          </TableCell>
                                          {renderDiffCell(
                                            row.ctrDiff !== undefined ? parseFloat((row.ctrDiff * 100).toFixed(2)) : undefined,
                                            row.ctrChangePercent,
                                            true /* positive = good */
                                          )}
                                        </>
                                      )}

                                      {/* Position */}
                                      <TableCell className="text-right">{row.position.toFixed(1)}</TableCell>
                                      {comparisonMode && (
                                        <>
                                          <TableCell className="text-right text-muted-foreground">
                                            {row.previousPosition !== undefined ? row.previousPosition.toFixed(1) : "-"}
                                          </TableCell>
                                          {renderDiffCell(
                                            row.positionDiff !== undefined ? parseFloat(row.positionDiff.toFixed(1)) : undefined,
                                            row.positionChangePercent,
                                            false /* negative = good for position (rank improved) */
                                          )}
                                        </>
                                      )}
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* URL Inspection View */}
            {activeView === "url-inspection" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Kiểm tra URL</CardTitle>
                    <CardDescription>
                      Kiểm tra trạng thái index hiện tại và gửi yêu cầu lập chỉ mục trực tiếp từ giao diện này.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUrlInspection} className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="inspection-site">Site URL (Property)</Label>
                          <Select
                            value={siteUrl}
                            onValueChange={setSiteUrl}
                            disabled={urlInspectionMutation.isPending || isTokenProcessing}
                          >
                            <SelectTrigger id="inspection-site" className="h-10">
                              <SelectValue placeholder="Chọn property" />
                            </SelectTrigger>
                            <SelectContent>
                              {GSC_SITES.map((site) => (
                                <SelectItem key={site} value={site}>
                                  {site}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Property này dùng chung cho cả tab Hiệu suất và Kiểm tra URL.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inspection-language">Ngôn ngữ phản hồi</Label>
                          <Select
                            value={inspectionLanguage}
                            onValueChange={setInspectionLanguage}
                            disabled={urlInspectionMutation.isPending || isTokenProcessing}
                          >
                            <SelectTrigger id="inspection-language" className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Mã ngôn ngữ ISO, mặc định là <code>vi</code>.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="inspection-url">URL cần kiểm tra</Label>
                        <Input
                          id="inspection-url"
                          type="url"
                          placeholder="https://nhathuocvietnhat.vn/bai-viet/..."
                          value={inspectionUrl}
                          onChange={(event) => setInspectionUrl(event.target.value)}
                          disabled={urlInspectionMutation.isPending || isTokenProcessing}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          URL phải thuộc property đã chọn và bao gồm giao thức (https://).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="submit"
                          disabled={!canUseToken || urlInspectionMutation.isPending || isTokenProcessing}
                        >
                          {urlInspectionMutation.isPending || isTokenProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Đang kiểm tra...
                            </>
                          ) : (
                            <>
                              <Search className="mr-2 h-4 w-4" />
                              Kiểm tra URL
                            </>
                          )}
                        </Button>
                        {!canUseToken && (
                          <p className="text-xs text-red-500">
                            Tài khoản của bạn chưa được kích hoạt cho công cụ này.
                          </p>
                        )}
                      </div>
                    </form>

                    {inspectionError && (
                      <Alert variant="destructive" className="mt-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Lỗi kiểm tra URL</AlertTitle>
                        <AlertDescription>{inspectionError}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {inspectionResult && (
                  <Card>
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2">
                          <Search className="h-5 w-5" />
                          Kết quả kiểm tra
                        </CardTitle>
                        <Badge className={cn("flex items-center gap-1 text-xs font-medium px-2.5 py-1", verdictMeta.className)}>
                          {verdictMeta.tone === "positive" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : verdictMeta.tone === "negative" ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5" />
                          )}
                          <span>{indexStatus?.verdict ?? "Không xác định"}</span>
                        </Badge>
                      </div>
                      <CardDescription>
                        Phân tích cho URL {" "}
                        <span className="font-medium text-foreground break-all">{lastInspectedUrl}</span>
                      </CardDescription>
                      {indexingStatus && (
                        <Alert className="border-emerald-500/40 bg-emerald-500/10">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <AlertTitle>Đã gửi yêu cầu</AlertTitle>
                          <AlertDescription>{indexingStatus}</AlertDescription>
                        </Alert>
                      )}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              disabled={requestIndexingDisabled}
                            >
                              {requestIndexingMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Đang gửi yêu cầu...
                                </>
                              ) : (
                                <>
                                  <Rocket className="mr-2 h-4 w-4" />
                                  Yêu cầu lập chỉ mục
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận gửi yêu cầu lập chỉ mục</AlertDialogTitle>
                              <AlertDialogDescription>
                                Google sẽ ưu tiên crawl lại URL:
                                <br />
                                <span className="font-medium text-foreground">{lastInspectedUrl}</span>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Huỷ</AlertDialogCancel>
                              <AlertDialogAction onClick={handleRequestIndexing}>Gửi yêu cầu</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {searchConsoleInspectLink && (
                          <Button variant="outline" type="button" size="sm" asChild>
                            <a
                              href={searchConsoleInspectLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Mở trong Search Console
                            </a>
                          </Button>
                        )}

                        {!canUseToken && (
                          <p className="text-xs text-red-500">
                            Bạn cần quyền sử dụng công cụ để gửi yêu cầu lập chỉ mục.
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {(verdictMeta.tone !== "positive" || canonicalMismatch) && (
                        <Alert className="border-amber-500/40 bg-amber-500/10">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>URL cần chú ý</AlertTitle>
                          <AlertDescription>
                            {verdictMeta.tone !== "positive"
                              ? "URL chưa được index hoàn toàn. Bạn có thể gửi yêu cầu lập chỉ mục."
                              : "Google canonical không trùng khớp với canonical do bạn khai báo. Hãy kiểm tra lại thẻ canonical hoặc sitemap."}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        {indexStatusMetrics.map((item) => (
                          <div key={item.label} className="rounded-lg border bg-muted/10 p-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {item.label}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              {item.icon === "clock" && <Clock className="h-4 w-4 text-muted-foreground" />}
                              <span className="text-sm font-medium text-foreground">
                                {item.value || "Không có dữ liệu"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Google canonical
                          </p>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm text-foreground break-all">
                              {indexStatus?.googleCanonical || "Không có dữ liệu"}
                            </span>
                            {indexStatus?.googleCanonical && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => handleCopyToClipboard(indexStatus.googleCanonical)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            User canonical
                          </p>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm text-foreground break-all">
                              {indexStatus?.userCanonical || "Không có dữ liệu"}
                            </span>
                            {indexStatus?.userCanonical && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => handleCopyToClipboard(indexStatus.userCanonical)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                          <div className="flex items-center gap-2">
                            {mobileVerdictMeta.tone === "positive" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : mobileVerdictMeta.tone === "negative" ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                            <p className="text-sm font-semibold">Mobile usability</p>
                            <Badge className={cn("text-xs", mobileVerdictMeta.className)}>
                              {inspectionResult?.mobileUsabilityResult?.verdict ?? "Không xác định"}
                            </Badge>
                          </div>
                          {hasMobileIssues ? (
                            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                              {mobileIssues.map((issue, idx) => (
                                <li key={idx}>{issue.message || issue.issueType || "Vấn đề không xác định"}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Không phát hiện vấn đề trên thiết bị di động.
                            </p>
                          )}
                        </div>

                        <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                          <div className="flex items-center gap-2">
                            {richVerdictMeta.tone === "positive" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : richVerdictMeta.tone === "negative" ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                            <p className="text-sm font-semibold">Rich results</p>
                            <Badge className={cn("text-xs", richVerdictMeta.className)}>
                              {inspectionResult?.richResultsResult?.verdict ?? "Không xác định"}
                            </Badge>
                          </div>
                          {hasRichResults ? (
                            <div className="space-y-2 text-sm text-muted-foreground">
                              {richResultItems.map((item, idx) => (
                                <div key={idx} className="rounded bg-background/60 p-3">
                                  <p className="font-medium text-foreground">
                                    {item.richResultType || `Rich result #${idx + 1}`}
                                  </p>
                                  {item.items?.map((richItem, innerIdx) => (
                                    <div key={innerIdx} className="mt-2 space-y-1">
                                      {richItem.name && (
                                        <p className="text-xs text-muted-foreground">{richItem.name}</p>
                                      )}
                                      {richItem.issues && richItem.issues.length > 0 ? (
                                        <ul className="list-disc pl-4 space-y-1 text-xs">
                                          {richItem.issues.map((issue, issueIdx) => (
                                            <li key={issueIdx}>{issue.message || "Vấn đề không xác định"}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">Không có lỗi.</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Không phát hiện structured data đủ điều kiện Rich result.
                            </p>
                          )}
                        </div>
                      </div>

                      {indexingError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Không thể gửi yêu cầu lập chỉ mục</AlertTitle>
                          <AlertDescription>{indexingError}</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
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

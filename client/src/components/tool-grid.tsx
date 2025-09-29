import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Select components removed - using button pills instead
import { AlertCircle, Search, Grid, Hash, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import ToolCard from "./tool-card";
import type { SeoTool } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

interface ToolGridProps {
  showAllTools?: boolean; // If true, shows all tools (including pending), if false shows only active tools
  showFilters?: boolean; // If true, shows search and filter controls
}

export default function ToolGrid({ showAllTools = false, showFilters = false }: ToolGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();
  
  // Define free tools (same logic as tool-card.tsx)
  const freeTools = new Set(['markdown-html', 'qr-code']);

  // Choose the appropriate API endpoint based on authentication status and user role
  // If user is admin, show all tools including pending ones (admin endpoint)
  // If user is member or not logged in, show only active tools (public endpoint)
  const apiEndpoint = user && isAdmin()
    ? "/api/admin/seo-tools"
    : "/api/seo-tools";

  // Admin sees all tools, member and guests see active tools only
  const shouldEnableQuery = true;
  
  const { data: tools, isLoading, error } = useQuery<SeoTool[]>({
    queryKey: [apiEndpoint],
    // Use default queryFn which includes auth headers for admin routes
    enabled: shouldEnableQuery,
  });

  // Define all available tags (static list, always shown regardless of current tools)
  const availableTags = ['#contentseo', '#index'];

  // Filter tools based on search, status, and tags (only if filters are enabled)
  const filteredTools = useMemo(() => {
    if (!tools || !Array.isArray(tools)) return [];

    if (!showFilters) {
      return tools; // No filtering if filters are disabled
    }

    let filtered = tools;

    // Filter by status
    if (filterStatus === "active") {
      filtered = filtered.filter(tool => tool.status === "active");
    } else if (filterStatus === "pending") {
      filtered = filtered.filter(tool => tool.status === "pending");
    } else if (filterStatus === "free") {
      filtered = filtered.filter(tool => freeTools.has(tool.name));
    }
    // "all" shows all tools (no status filtering)

    // Filter by tag
    if (selectedTag) {
      filtered = filtered.filter(tool =>
        tool.tags && tool.tags.split(',').map(t => t.trim()).includes(selectedTag)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.title.toLowerCase().includes(query) ||
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query) ||
        (tool.tags && tool.tags.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [tools, searchQuery, filterStatus, selectedTag, showFilters]);

  const displayTools = showFilters ? filteredTools : tools;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-tools-loading">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="bg-card border border-border rounded-lg p-6">
            <Skeleton className="w-12 h-12 rounded-lg mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Không thể tải danh sách công cụ SEO. Vui lòng thử lại sau.
        </AlertDescription>
      </Alert>
    );
  }

  if (!displayTools || displayTools.length === 0) {
    return (
      <>
        {/* Enhanced Filter Interface (repeated for empty state) */}
        {showFilters && (
          <div className="space-y-6 mb-8">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Tìm kiếm công cụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-11 border-border/50 focus:border-primary/50 transition-colors"
                data-testid="input-search-homepage-tools"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground flex items-center">
                  <Grid className="w-4 h-4 mr-1" />
                  Trạng thái:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "Tất cả", icon: Grid },
                    { value: "active", label: "Active", icon: CheckCircle },
                    { value: "pending", label: "Pending", icon: Clock },
                    { value: "free", label: "Free", icon: AlertTriangle },
                  ].map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={filterStatus === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterStatus(value)}
                      className={cn(
                        "h-8 px-3 text-xs font-medium transition-all",
                        filterStatus === value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-background border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                      )}
                      data-testid={`filter-status-${value}`}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tag Filter Pills */}
              <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center">
                    <Hash className="w-4 h-4 mr-1" />
                    Tags:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedTag === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTag(null)}
                      className={cn(
                        "h-8 px-3 text-xs font-medium transition-all",
                        selectedTag === null
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-background border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                      )}
                      data-testid="filter-tag-all"
                    >
                      Tất cả
                    </Button>
                    {availableTags.map((tag) => {
                      const tagDisplayName = tag === '#contentseo' ? 'Content SEO' :
                                           tag === '#index' ? 'Index' : tag;
                      return (
                        <Button
                          key={tag}
                          variant={selectedTag === tag ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTag(tag)}
                          className={cn(
                            "h-8 px-3 text-xs font-medium transition-all",
                            selectedTag === tag
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-background border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                          )}
                          data-testid={`filter-tag-${tag}`}
                        >
                          {tagDisplayName}
                        </Button>
                      );
                    })}
                  </div>
                </div>
            </div>
          </div>
        )}

        <Alert data-testid="alert-empty">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {showFilters && (searchQuery.trim() || selectedTag || filterStatus !== "all")
              ? "Không tìm thấy công cụ phù hợp với tiêu chí lọc."
              : "Hiện tại không có công cụ SEO nào khả dụng."
            }
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      {/* Enhanced Filter Interface */}
      {showFilters && (
        <div className="space-y-6 mb-8">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Tìm kiếm công cụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-11 border-border/50 focus:border-primary/50 transition-colors"
              data-testid="input-search-homepage-tools"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter Pills (Adobe Cloud style) */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground flex items-center">
                <Grid className="w-4 h-4 mr-1" />
                Trạng thái:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "Tất cả", icon: Grid },
                  { value: "active", label: "Active", icon: CheckCircle },
                  { value: "pending", label: "Pending", icon: Clock },
                  { value: "free", label: "Free", icon: AlertTriangle },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={filterStatus === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(value)}
                    className={cn(
                      "h-8 px-3 text-xs font-medium transition-all",
                      filterStatus === value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                    )}
                    data-testid={`filter-status-${value}`}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tag Filter Pills */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground flex items-center">
                  <Hash className="w-4 h-4 mr-1" />
                  Tags:
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedTag === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag(null)}
                    className={cn(
                      "h-8 px-3 text-xs font-medium transition-all",
                      selectedTag === null
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                    )}
                    data-testid="filter-tag-all"
                  >
                    Tất cả
                  </Button>
                  {availableTags.map((tag) => {
                    const tagDisplayName = tag === '#contentseo' ? 'Content SEO' :
                                         tag === '#index' ? 'Index' : tag;
                    return (
                      <Button
                        key={tag}
                        variant={selectedTag === tag ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTag(tag)}
                        className={cn(
                          "h-8 px-3 text-xs font-medium transition-all",
                          selectedTag === tag
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-background border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                        )}
                        data-testid={`filter-tag-${tag}`}
                      >
                        {tagDisplayName}
                      </Button>
                    );
                  })}
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Enhanced Results Summary */}
      {showFilters && displayTools && displayTools.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground" data-testid="text-homepage-results-summary">
            {searchQuery.trim()
              ? `Tìm thấy ${displayTools.length} kết quả cho "${searchQuery}"`
              : selectedTag
                ? `${displayTools.length} công cụ với tag ${selectedTag === '#contentseo' ? 'Content SEO' : selectedTag === '#index' ? 'Index' : selectedTag}`
                : filterStatus === "active"
                  ? `${displayTools.length} công cụ đang hoạt động`
                  : filterStatus === "pending"
                  ? `${displayTools.length} công cụ chờ xử lý`
                  : filterStatus === "free"
                  ? `${displayTools.length} công cụ miễn phí`
                  : `Tổng cộng ${displayTools.length} công cụ`
            }
          </p>

          {/* Active Filters Summary */}
          <div className="flex items-center gap-2">
            {(filterStatus !== "all" || selectedTag || searchQuery.trim()) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Đang lọc:</span>
                {filterStatus !== "all" && (
                  <Badge variant="secondary" className="h-5 px-2 text-xs">
                    {filterStatus === "active" ? "Active" :
                     filterStatus === "pending" ? "Pending" :
                     filterStatus === "free" ? "Free" : filterStatus}
                  </Badge>
                )}
                {selectedTag && (
                  <Badge variant="secondary" className="h-5 px-2 text-xs">
                    {selectedTag === '#contentseo' ? 'Content SEO' :
                     selectedTag === '#index' ? 'Index' : selectedTag}
                  </Badge>
                )}
                {searchQuery.trim() && (
                  <Badge variant="secondary" className="h-5 px-2 text-xs">
                    "{searchQuery}"
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-tools">
        {displayTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} showStatusIndicator={showAllTools} />
        ))}
      </div>
    </>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Search } from "lucide-react";
import ToolCard from "./tool-card";
import type { SeoTool } from "@shared/schema";

interface ToolGridProps {
  showAllTools?: boolean; // If true, shows all tools (including pending), if false shows only active tools
  showFilters?: boolean; // If true, shows search and filter controls
}

export default function ToolGrid({ showAllTools = false, showFilters = false }: ToolGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Choose the appropriate API endpoint based on showAllTools prop
  const apiEndpoint = showAllTools ? "/api/admin/seo-tools" : "/api/seo-tools";
  
  const { data: tools, isLoading, error } = useQuery<SeoTool[]>({
    queryKey: [apiEndpoint],
    queryFn: async () => {
      const res = await fetch(apiEndpoint);
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Filter tools based on search and status (only if filters are enabled)
  const filteredTools = useMemo(() => {
    if (!tools || !Array.isArray(tools)) return [];
    
    if (!showFilters) {
      return tools; // No filtering if filters are disabled
    }

    let filtered = tools;

    // Filter by status
    if (filterStatus === "active") {
      filtered = filtered.filter(tool => tool.status === "active");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tool => 
        tool.title.toLowerCase().includes(query) ||
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tools, searchQuery, filterStatus, showFilters]);

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
        {/* Search and Filter Controls */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Tìm kiếm công cụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4"
                data-testid="input-search-homepage-tools"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-48">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="select-filter-homepage-status">
                  <SelectValue placeholder="Lọc theo trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="filter-homepage-all-tools">All tools</SelectItem>
                  <SelectItem value="active" data-testid="filter-homepage-active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <Alert data-testid="alert-empty">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {showFilters && searchQuery.trim() 
              ? "Không tìm thấy công cụ phù hợp với từ khóa tìm kiếm."
              : "Hiện tại không có công cụ SEO nào khả dụng."
            }
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      {/* Search and Filter Controls */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Tìm kiếm công cụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
              data-testid="input-search-homepage-tools"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-48">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="select-filter-homepage-status">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="filter-homepage-all-tools">All tools</SelectItem>
                <SelectItem value="active" data-testid="filter-homepage-active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {showFilters && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="text-homepage-results-summary">
            {searchQuery.trim() 
              ? `Tìm thấy ${displayTools.length} kết quả cho "${searchQuery}"`
              : filterStatus === "active" 
                ? `${displayTools.length} công cụ đang hoạt động`
                : `Tổng cộng ${displayTools.length} công cụ`
            }
          </p>
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

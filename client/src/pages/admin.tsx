import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search, Settings, Eye, EyeOff } from "lucide-react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SeoTool } from "@shared/schema";

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  // Fetch all tools for admin (including pending)
  const { data: allTools, isLoading, error } = useQuery({
    queryKey: ['/api/admin/seo-tools'],
    queryFn: async () => {
      const res = await fetch('/api/admin/seo-tools');
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Mutation for updating tool status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ toolId, status }: { toolId: string; status: 'active' | 'pending' }) => {
      return await apiRequest("PATCH", `/api/admin/seo-tools/${toolId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seo-tools'] });
      toast({
        title: "Cập nhật thành công!",
        description: "Trạng thái công cụ đã được cập nhật.",
      });
    },
    onError: (error) => {
      console.error("Error updating tool status:", error);
      toast({
        title: "Lỗi cập nhật",
        description: "Không thể cập nhật trạng thái công cụ. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });


  // Filter tools based on search and status
  const filteredTools = useMemo(() => {
    if (!allTools || !Array.isArray(allTools)) return [];

    let filtered = allTools;

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
  }, [allTools, searchQuery, filterStatus]);

  const handleStatusToggle = (toolId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "pending" : "active";
    updateStatusMutation.mutate({ toolId, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        Active
      </Badge>
    ) : (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
        <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
        Pending
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation 
          breadcrumbItems={[
            { label: "Quản lý công cụ" }
          ]}
          backLink="/"
        />

        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
              data-testid="heading-admin-title"
            >
              Chào mừng đến trang <span className="text-blue-600">quản lý công cụ</span>
            </h1>
            <p
              className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              data-testid="text-admin-description"
            >
              Quản lý trạng thái và cài đặt của tất cả các công cụ SEO AI
            </p>
          </div>

          {/* Search and Filter Controls */}
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
                data-testid="input-search-tools"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-48">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="Lọc theo trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="filter-all-tools">All tools</SelectItem>
                  <SelectItem value="active" data-testid="filter-active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tools List */}
          {error ? (
            <div 
              className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
              data-testid="error-admin-tools"
            >
              <Settings className="mx-auto h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Không thể tải danh sách công cụ
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
              </p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12" data-testid="loading-admin-tools">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Đang tải danh sách công cụ...</p>
            </div>
          ) : filteredTools.length === 0 ? (
            <div 
              className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
              data-testid="empty-admin-tools"
            >
              <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchQuery.trim() ? "Không tìm thấy công cụ" : "Chưa có công cụ nào"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery.trim() 
                  ? "Hãy thử từ khóa khác để tìm kiếm." 
                  : "Danh sách công cụ trống."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Results Summary */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="text-results-summary">
                  {searchQuery.trim() 
                    ? `Tìm thấy ${filteredTools.length} kết quả cho "${searchQuery}"`
                    : filterStatus === "active" 
                      ? `${filteredTools.length} công cụ đang hoạt động`
                      : `Tổng cộng ${filteredTools.length} công cụ`
                  }
                </p>
              </div>

              {/* Tools Grid */}
              <div className="space-y-4">
                {filteredTools.map((tool: SeoTool) => (
                  <Card key={tool.id} className="bg-white dark:bg-gray-800 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            {/* Tool Icon */}
                            <div 
                              className={`w-12 h-12 ${tool.iconBgColor} rounded-lg flex items-center justify-center`}
                              data-testid={`icon-${tool.name}`}
                            >
                              <span className={`${tool.iconColor} font-semibold`}>
                                {tool.icon.charAt(0)}
                              </span>
                            </div>
                            
                            <div className="flex-1">
                              <h3 
                                className="font-semibold text-xl text-gray-900 dark:text-white mb-1"
                                data-testid={`title-${tool.name}`}
                              >
                                {tool.title}
                              </h3>
                              <p 
                                className="text-gray-600 dark:text-gray-300 text-sm"
                                data-testid={`description-${tool.name}`}
                              >
                                {tool.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span data-testid={`category-${tool.name}`}>
                              📂 {tool.category}
                            </span>
                            <span data-testid={`name-${tool.name}`}>
                              🔧 {tool.name}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Status Badge */}
                          <div data-testid={`status-${tool.name}`}>
                            {getStatusBadge(tool.status)}
                          </div>
                          
                          {/* Toggle Switch */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {tool.status === "active" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </span>
                            <Switch
                              checked={tool.status === "active"}
                              onCheckedChange={() => handleStatusToggle(tool.id, tool.status)}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`toggle-${tool.name}`}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
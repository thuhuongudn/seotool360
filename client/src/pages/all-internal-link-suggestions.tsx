import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ChevronDown, 
  ChevronRight, 
  Search, 
  Link as LinkIcon, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import MarkdownRenderer from "@/components/markdown-renderer";
import CopyMarkdownButton from "@/components/copy-markdown-button";
import type { InternalLinkSuggestion } from "@shared/schema";

export default function AllInternalLinkSuggestions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set());
  const suggestionsPerPage = 10;

  // Fetch all suggestions
  const { data: allSuggestions, isLoading, error } = useQuery({
    queryKey: ['/api/internal-link-suggestions'],
    queryFn: async () => {
      const res = await fetch('/api/internal-link-suggestions');
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    }
  });

  // Filter suggestions based on search query
  const filteredSuggestions = useMemo(() => {
    if (!allSuggestions || !Array.isArray(allSuggestions)) return [];
    
    if (!searchQuery.trim()) {
      return allSuggestions;
    }

    const query = searchQuery.toLowerCase();
    return allSuggestions.filter(suggestion => 
      suggestion.title.toLowerCase().includes(query) ||
      (suggestion.result || '').toLowerCase().includes(query) ||
      (suggestion.primaryKeywords || '').toLowerCase().includes(query) ||
      (suggestion.secondaryKeywords || '').toLowerCase().includes(query)
    );
  }, [allSuggestions, searchQuery]);

  // Paginate filtered suggestions
  const paginatedSuggestions = useMemo(() => {
    if (!Array.isArray(filteredSuggestions)) return [];
    const startIndex = (currentPage - 1) * suggestionsPerPage;
    return filteredSuggestions.slice(startIndex, startIndex + suggestionsPerPage);
  }, [filteredSuggestions, currentPage]);

  const totalPages = Math.ceil(filteredSuggestions.length / suggestionsPerPage);

  const toggleSuggestionExpansion = (suggestionId: number) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const showPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    let endPage = Math.min(totalPages, startPage + showPages - 1);

    if (endPage - startPage < showPages - 1) {
      startPage = Math.max(1, endPage - showPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          data-testid="button-prev-page"
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </Button>

        {startPage > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(1)}
              data-testid="button-page-1"
            >
              1
            </Button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}

        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => goToPage(page)}
            data-testid={`button-page-${page}`}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2">...</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(totalPages)}
              data-testid={`button-page-${totalPages}`}
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          data-testid="button-next-page"
        >
          Sau
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation 
          breadcrumbItems={[
            { label: "Gợi ý internal link", href: "/internal-link-helper" },
            { label: "Tất cả gợi ý" }
          ]}
          backLink="/internal-link-helper"
        />

        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="text-center">
              <h1 
                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
                data-testid="heading-all-suggestions-title"
              >
                Tất cả <span className="text-blue-600">Gợi ý Internal Link</span>
              </h1>
              <p 
                className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
                data-testid="text-all-suggestions-description"
              >
                Quản lý và xem lại tất cả các gợi ý internal link bạn đã tạo
              </p>
            </div>
          </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, từ khóa hoặc nội dung..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              className="pl-10 pr-4"
              data-testid="input-search-suggestions"
            />
          </div>
        </div>

        {/* Suggestions List */}
        {error ? (
          <div 
            className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            data-testid="error-all-suggestions"
          >
            <LinkIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Không thể tải gợi ý
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
            </p>
            <Link href="/internal-link-helper">
              <Button variant="outline" data-testid="button-back-to-main">
                Quay lại trang chính
              </Button>
            </Link>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12" data-testid="loading-all-suggestions">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Đang tải gợi ý...</p>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div 
            className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            data-testid="empty-all-suggestions"
          >
            <LinkIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery.trim() ? "Không tìm thấy gợi ý" : "Chưa có gợi ý nào"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery.trim() 
                ? "Hãy thử từ khóa khác để tìm kiếm." 
                : "Tạo gợi ý đầu tiên để xem danh sách ở đây."
              }
            </p>
            {!searchQuery.trim() && (
              <Link href="/internal-link-helper">
                <Button className="mt-4" data-testid="button-create-first-suggestion">
                  Tạo gợi ý đầu tiên
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Results Summary */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="text-results-summary">
                {searchQuery.trim() 
                  ? `Tìm thấy ${filteredSuggestions.length} kết quả cho "${searchQuery}"`
                  : `Tổng cộng ${filteredSuggestions.length} gợi ý`
                } 
                {totalPages > 1 && (
                  <span> • Trang {currentPage} / {totalPages}</span>
                )}
              </p>
            </div>

            {/* Suggestions Grid */}
            <div className="space-y-4">
              {paginatedSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="bg-white dark:bg-gray-800 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 
                          className="font-semibold text-xl text-gray-900 dark:text-white mb-3"
                          data-testid={`title-suggestion-${suggestion.id}`}
                        >
                          {suggestion.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <span data-testid={`suggestion-type-${suggestion.id}`}>
                            📝 {suggestion.postType === 'product' ? 'Product' : 'Article'}
                          </span>
                          <span data-testid={`created-at-${suggestion.id}`}>
                            📅 {new Date(suggestion.createdAt).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {suggestion.primaryKeywords && (
                            <span data-testid={`primary-keywords-${suggestion.id}`}>
                              🎯 {suggestion.primaryKeywords}
                            </span>
                          )}
                        </div>
                        {suggestion.secondaryKeywords && (
                          <div className="mb-3">
                            <span 
                              className="text-purple-600 dark:text-purple-400 text-sm"
                              data-testid={`secondary-keywords-${suggestion.id}`}
                            >
                              🔍 {suggestion.secondaryKeywords}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSuggestionExpansion(suggestion.id)}
                        data-testid={`button-toggle-${suggestion.id}`}
                      >
                        {expandedSuggestions.has(suggestion.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {expandedSuggestions.has(suggestion.id) && (
                      <div 
                        className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border"
                        data-testid={`content-${suggestion.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 dark:text-white">Gợi ý Internal Link:</h4>
                          <CopyMarkdownButton 
                            content={suggestion.result || ''} 
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" 
                            size="sm"
                            variant="outline"
                          />
                        </div>
                        <MarkdownRenderer 
                          content={suggestion.result || 'Không có nội dung'} 
                          className="text-sm"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {renderPagination()}
          </>
        )}
      </div>
      </main>
    </div>
  );
}
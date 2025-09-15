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
  FileText, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import { Link } from "wouter";
import type { SocialMediaPost } from "@shared/schema";

export default function AllSocialMediaPosts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  const postsPerPage = 10;

  // Fetch all posts
  const { data: allPosts, isLoading } = useQuery({
    queryKey: ['/api/social-media-posts'],
    queryFn: () => fetch('/api/social-media-posts').then(res => res.json()) as Promise<SocialMediaPost[]>
  });

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!allPosts) return [];
    
    if (!searchQuery.trim()) {
      return allPosts;
    }

    const query = searchQuery.toLowerCase();
    return allPosts.filter(post => 
      post.title.toLowerCase().includes(query) ||
      (post.result || '').toLowerCase().includes(query) ||
      (post.hashtags || '').toLowerCase().includes(query)
    );
  }, [allPosts, searchQuery]);

  // Paginate filtered posts
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(startIndex, startIndex + postsPerPage);
  }, [filteredPosts, currentPage]);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  const togglePostExpansion = (postId: number) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedPosts(newExpanded);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/social-media-writer">
              <Button variant="outline" size="sm" data-testid="button-back-to-writer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Trở về
              </Button>
            </Link>
          </div>
          
          <div className="text-center">
            <h1 
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
              data-testid="heading-all-posts-title"
            >
              Tất cả <span className="text-blue-600">Bài đăng MXH</span>
            </h1>
            <p 
              className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              data-testid="text-all-posts-description"
            >
              Quản lý và xem lại tất cả các bài đăng mạng xã hội bạn đã tạo
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, nội dung hoặc hashtag..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              className="pl-10 pr-4"
              data-testid="input-search-posts"
            />
          </div>
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div className="text-center py-12" data-testid="loading-all-posts">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Đang tải bài đăng...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div 
            className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
            data-testid="empty-all-posts"
          >
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery.trim() ? "Không tìm thấy bài đăng" : "Chưa có bài đăng nào"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery.trim() 
                ? "Hãy thử từ khóa khác để tìm kiếm." 
                : "Tạo bài đăng đầu tiên để xem danh sách ở đây."
              }
            </p>
            {!searchQuery.trim() && (
              <Link href="/social-media-writer">
                <Button className="mt-4" data-testid="button-create-first-post">
                  Tạo bài đăng đầu tiên
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
                  ? `Tìm thấy ${filteredPosts.length} kết quả cho "${searchQuery}"`
                  : `Tổng cộng ${filteredPosts.length} bài đăng`
                } 
                {totalPages > 1 && (
                  <span> • Trang {currentPage} / {totalPages}</span>
                )}
              </p>
            </div>

            {/* Posts Grid */}
            <div className="space-y-4">
              {paginatedPosts.map((post) => (
                <Card key={post.id} className="bg-white dark:bg-gray-800 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 
                          className="font-semibold text-xl text-gray-900 dark:text-white mb-3"
                          data-testid={`title-post-${post.id}`}
                        >
                          {post.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                          <span data-testid={`post-type-${post.id}`}>
                            📝 {post.postType === 'product' ? 'Giới thiệu sản phẩm' : 'Giới thiệu blog'}
                          </span>
                          <span data-testid={`created-at-${post.id}`}>
                            📅 {new Date(post.createdAt).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {post.framework && (
                            <span data-testid={`framework-${post.id}`}>
                              🎯 {post.framework}
                            </span>
                          )}
                          {post.maxWords && (
                            <span data-testid={`max-words-${post.id}`}>
                              📊 {post.maxWords} từ
                            </span>
                          )}
                        </div>
                        {post.hashtags && (
                          <div className="mb-3">
                            <span 
                              className="text-blue-600 dark:text-blue-400 text-sm"
                              data-testid={`hashtags-${post.id}`}
                            >
                              {post.hashtags}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePostExpansion(post.id)}
                        data-testid={`button-toggle-${post.id}`}
                      >
                        {expandedPosts.has(post.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {expandedPosts.has(post.id) && (
                      <div 
                        className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border"
                        data-testid={`content-${post.id}`}
                      >
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Nội dung bài đăng:</h4>
                        <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                          {post.result || 'Không có nội dung'}
                        </pre>
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
    </div>
  );
}
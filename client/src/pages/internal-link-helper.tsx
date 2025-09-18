import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, Loader2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link as RouterLink } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import MarkdownRenderer from "@/components/markdown-renderer";
import CopyMarkdownButton from "@/components/copy-markdown-button";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
import type { InternalLinkSuggestion } from "@shared/schema";

// Form schema matching the requirements
const internalLinkFormSchema = z.object({
  postType: z.string().min(1, "Vui lòng chọn loại bài viết"),
  title: z.string().min(1, "Vui lòng nhập tiêu đề"),
  primaryKeywords: z.string().min(1, "Vui lòng nhập từ khóa chính"),
  secondaryKeywords: z.string().optional(),
  draftContent: z.string().min(1, "Vui lòng nhập nội dung mẫu"),
});

type InternalLinkFormData = z.infer<typeof internalLinkFormSchema>;

interface WebhookResponse {
  output?: string;
  content?: string;
  result?: string;
  [key: string]: any;
}

// Authorized content component - only renders when user has access
function AuthorizedInternalLinkContent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<string>("");
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Fetch recent suggestions - now safely inside authorized area
  const { data: recentSuggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/internal-link-suggestions', { limit: 3 }],
    queryFn: () => fetch('/api/internal-link-suggestions?limit=3').then(res => res.json()) as Promise<InternalLinkSuggestion[]>
  });

  const toggleSuggestionExpansion = (suggestionId: number) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const form = useForm<InternalLinkFormData>({
    resolver: zodResolver(internalLinkFormSchema),
    defaultValues: {
      postType: "",
      title: "",
      primaryKeywords: "",
      secondaryKeywords: "",
      draftContent: "",
    },
  });

  const handleSubmit = async (data: InternalLinkFormData) => {
    setIsSubmitting(true);
    setResult("");

    try {
      // Prepare webhook payload
      const payload = {
        loai_bai_viet: data.postType,
        tieu_de: data.title,
        primary_keywords: data.primaryKeywords,
        secondary_keywords: data.secondaryKeywords || "",
        "Nội dung chính bài viết": data.draftContent,
      };

      // Send request to n8n webhook
      const response = await fetch(
        "https://n8n.nhathuocvietnhat.vn/webhook/seo-tool-360-internal-link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const webhookResponse: WebhookResponse = await response.json();

      // Parse the response - try different possible fields
      const content =
        webhookResponse.output ||
        webhookResponse.content ||
        webhookResponse.result ||
        JSON.stringify(webhookResponse, null, 2);

      setResult(content);

      // Save form data and result to database
      try {
        await apiRequest("POST", "/api/internal-link-suggestions", {
          postType: data.postType,
          title: data.title,
          primaryKeywords: data.primaryKeywords,
          secondaryKeywords: data.secondaryKeywords || "",
          draftContent: data.draftContent,
          result: content,
        });
        
        // Invalidate React Query caches to update UI
        await queryClient.invalidateQueries({ queryKey: ['/api/internal-link-suggestions'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/internal-link-suggestions', { limit: 3 }] });
      } catch (dbError) {
        console.warn("Failed to save suggestion to database:", dbError);
        // Don't show error to user as the main functionality worked
      }

      toast({
        title: "Thành công!",
        description: "Gợi ý internal link đã được tạo thành công.",
      });
    } catch (error) {
      console.error("Webhook error:", error);
      toast({
        title: "Có lỗi xảy ra",
        description: "Không thể tạo gợi ý internal link. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
    
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageNavigation 
        breadcrumbItems={[
          { label: "Gợi ý internal link cho bài viết" }
        ]}
        backLink="/"
      />

      <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
              data-testid="heading-internal-link-title"
            >
              Gợi ý internal link <span className="text-blue-600">cho bài viết</span>
            </h1>
            <p
              className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              data-testid="text-internal-link-description"
            >
              Tạo ra những gợi ý internal link thông minh và hiệu quả để tăng SEO cho bài viết của bạn!
            </p>
          </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle
                className="text-xl font-bold text-gray-900 dark:text-white"
                data-testid="heading-form-section"
              >
                Thông tin bài viết
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
                >
                  {/* Field 1: Loại bài viết */}
                  <FormField
                    control={form.control}
                    name="postType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-post-type"
                        >
                          <span className="text-blue-600">📝</span>
                          Loại bài viết
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-post-type">
                              <SelectValue placeholder="Chọn loại bài viết" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="product">
                              Product
                            </SelectItem>
                            <SelectItem value="article">
                              Article
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 2: Tiêu đề */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-title"
                        >
                          <span className="text-orange-500">🏷️</span>
                          Tiêu đề
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="V Platinum 5-MTHF: Giải Pháp Toàn Diện Cho Sức Khỏe Mẹ Và Bé Trước, Trong và Sau Thai Kỳ"
                            {...field}
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 3: Từ khóa chính */}
                  <FormField
                    control={form.control}
                    name="primaryKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-primary-keywords"
                        >
                          <span className="text-red-500">🎯</span>
                          Từ khóa chính
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="các từ khóa chính phân cách nhau bằng dấu ','"
                            {...field}
                            data-testid="input-primary-keywords"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 4: Từ khóa phụ */}
                  <FormField
                    control={form.control}
                    name="secondaryKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-secondary-keywords"
                        >
                          <span className="text-purple-500">🔍</span>
                          Từ khóa phụ
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="các từ khóa phụ phân cách nhau bằng dấu ','"
                            {...field}
                            data-testid="input-secondary-keywords"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 5: Nội dung mẫu */}
                  <FormField
                    control={form.control}
                    name="draftContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-draft-content"
                        >
                          <span className="text-green-500">📄</span>
                          Nội dung mẫu (draft)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="V-Platinum 5-MTHF...."
                            className="min-h-[120px]"
                            {...field}
                            data-testid="textarea-draft-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg"
                    data-testid="button-generate-suggestions"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tạo gợi ý...
                      </>
                    ) : (
                      <>
                        <Link className="mr-2 h-4 w-4" />
                        Tạo gợi ý internal link
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle
                    className="text-xl font-bold text-gray-900 dark:text-white"
                    data-testid="heading-results-section"
                  >
                    Kết quả
                  </CardTitle>
                  <CardDescription>
                    Gợi ý internal link của bạn sẽ xuất hiện ở đây...
                  </CardDescription>
                </div>
                {result && (
                  <CopyMarkdownButton 
                    content={result} 
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" 
                    size="sm"
                    variant="outline"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {result ? (
                <div
                  className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border"
                  data-testid="results-content"
                >
                  <MarkdownRenderer content={result} className="text-sm" />
                </div>
              ) : (
                <div
                  className="text-center py-12 text-gray-500 dark:text-gray-400"
                  data-testid="results-empty"
                >
                  <Link className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    Gợi ý internal link sẽ xuất hiện ở đây
                  </p>
                  <p className="text-sm">
                    Hãy điền thông tin vào form bên trái và để AI phân tích nhé.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Suggestions Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="heading-recent-suggestions">
              Gợi ý gần đây
            </h2>
            <RouterLink href="/all-internal-link-suggestions">
              <Button variant="outline" className="flex items-center gap-2" data-testid="link-view-all-suggestions">
                <ExternalLink className="h-4 w-4" />
                Xem tất cả gợi ý
              </Button>
            </RouterLink>
          </div>

          {suggestionsLoading ? (
            <div className="text-center py-8" data-testid="loading-recent-suggestions">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-2 text-gray-500 dark:text-gray-400">Đang tải gợi ý...</p>
            </div>
          ) : recentSuggestions && recentSuggestions.length > 0 ? (
            <div className="space-y-4">
              {recentSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="bg-white dark:bg-gray-800 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 
                          className="font-semibold text-lg text-gray-900 dark:text-white mb-2"
                          data-testid={`title-suggestion-${suggestion.id}`}
                        >
                          {suggestion.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <span data-testid={`suggestion-type-${suggestion.id}`}>
                            {suggestion.postType === 'product' ? 'Product' : 'Article'}
                          </span>
                          <span data-testid={`suggestion-date-${suggestion.id}`}>
                            {new Date(suggestion.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSuggestionExpansion(suggestion.id)}
                        className="ml-4"
                        data-testid={`button-toggle-suggestion-${suggestion.id}`}
                      >
                        {expandedSuggestions.has(suggestion.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {expandedSuggestions.has(suggestion.id) && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
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
                            data-testid={`content-suggestion-${suggestion.id}`}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400" data-testid="no-suggestions">
              <Link className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Chưa có gợi ý nào</p>
              <p className="text-sm">
                Hãy tạo gợi ý đầu tiên của bạn bằng cách sử dụng form bên trên.
              </p>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}

// Main wrapper component with ToolPermissionGuard
export default function InternalLinkHelper() {
  // Get tool ID for permission checking
  const toolId = useToolId('internal-link-helper');

  return (
    <ToolPermissionGuard 
      toolId={toolId || ""} 
      toolName="Gợi ý internal link cho bài viết"
    >
      <AuthorizedInternalLinkContent />
    </ToolPermissionGuard>
  );
}
import { Loader2, BarChart3 } from "lucide-react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function GSCInsightsContent() {
  const toolId = useToolId("gsc-insights");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Search Console Insights" }]} backLink="/" />

        {/* Tool Description Section */}
        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-600/10 px-4 py-1 text-sm font-medium text-green-600 mb-4">
            <BarChart3 className="h-4 w-4" />
            Google Search Console Insights
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Phân tích <span className="text-green-600">hiệu suất nội dung</span> trên Google Search
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Cung cấp cho người tạo nội dung cái nhìn tổng quan về hiệu suất nội dung trên Google Search và mức độ tương tác của người dùng trên website của họ.
          </p>
        </section>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Search Console Insights</CardTitle>
              <CardDescription>
                Công cụ đang được phát triển. Vui lòng quay lại sau.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center text-sm text-muted-foreground">
                Giao diện và tính năng đang được xây dựng...
              </div>
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
          <p className="text-sm text-muted-foreground">Đang tải công cụ Search Console Insights...</p>
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

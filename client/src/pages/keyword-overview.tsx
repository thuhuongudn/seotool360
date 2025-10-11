import { useState } from "react";
import { Loader2, Target } from "lucide-react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function KeywordOverviewContent() {
  const toolId = useToolId("keyword-overview");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Keyword Overview" }]} backLink="/" />

        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-4 py-1 text-sm font-medium text-blue-600 mb-4">
            <Target className="h-4 w-4" />
            Keyword Overview & Strategy
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Phân tích <span className="text-blue-600">toàn diện keyword</span> với AI
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Kết hợp dữ liệu thực từ Google Ads, SERP, GSC để phân tích keyword, clustering, tìm content gaps và xây dựng chiến lược nội dung 90 ngày.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Công cụ đang được phát triển</CardTitle>
            <CardDescription>
              Keyword Overview & Strategy sẽ sớm có mặt với các tính năng:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Phân tích keyword với dữ liệu từ Google Ads Keyword Planner</li>
              <li>• Phân tích SERP và ranking factors</li>
              <li>• Tích hợp dữ liệu từ Google Search Console</li>
              <li>• AI-powered keyword clustering theo search intent</li>
              <li>• Tìm content gaps và cơ hội keyword</li>
              <li>• Tạo keyword strategy và roadmap 90 ngày chi tiết</li>
            </ul>
          </CardContent>
        </Card>
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

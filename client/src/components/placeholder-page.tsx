import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import { Link } from "wouter";

interface PlaceholderPageProps {
  toolName: string;
  description?: string;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export default function PlaceholderPage({ 
  toolName, 
  description = "Công cụ này đang được phát triển với những tính năng mạnh mẽ và hiện đại.",
  breadcrumbItems = []
}: PlaceholderPageProps) {
  const defaultBreadcrumb = [{ label: toolName }];
  const finalBreadcrumb = breadcrumbItems.length > 0 ? breadcrumbItems : defaultBreadcrumb;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation 
          breadcrumbItems={finalBreadcrumb}
          backLink="/"
        />

        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-2xl text-center">
              <CardHeader className="pb-6">
                <div className="mx-auto w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-6">
                  <Construction className="w-10 h-10 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {toolName}
                </CardTitle>
                <p className="text-lg text-orange-600 dark:text-orange-400 font-medium">
                  Đang được phát triển
                </p>
              </CardHeader>
              <CardContent className="pb-8">
                <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                  {description}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                  Chúng tôi đang làm việc chăm chỉ để mang đến cho bạn trải nghiệm tốt nhất. 
                  Vui lòng quay lại sau để sử dụng công cụ này.
                </p>
                <Link href="/">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Về trang chủ
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
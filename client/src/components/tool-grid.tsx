import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import ToolCard from "./tool-card";
import type { SeoTool } from "@shared/schema";

export default function ToolGrid() {
  const { data: tools, isLoading, error } = useQuery<SeoTool[]>({
    queryKey: ["/api/seo-tools"],
  });

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

  if (!tools || tools.length === 0) {
    return (
      <Alert data-testid="alert-empty">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Hiện tại không có công cụ SEO nào khả dụng.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-tools">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  );
}

import PlaceholderPage from "@/components/placeholder-page";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";

export default function ArticleRewriter() {
  const toolId = useToolId('article-rewriter');

  return (
    <ToolPermissionGuard 
      toolId={toolId || ""} 
      toolName="Viết Lại Bài"
    >
      <PlaceholderPage 
        toolName="Viết Lại Bài"
        description="Công cụ viết lại bài viết thông minh, giúp tạo ra nội dung độc đáo và tránh duplicate content."
      />
    </ToolPermissionGuard>
  );
}
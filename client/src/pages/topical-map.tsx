import PlaceholderPage from "@/components/placeholder-page";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";

export default function TopicalMap() {
  const toolId = useToolId('topical-map');

  return (
    <ToolPermissionGuard 
      toolId={toolId || ""} 
      toolName="Topical Map"
    >
      <PlaceholderPage 
        toolName="Topical Map"
        description="Công cụ tạo bản đồ chủ đề thông minh giúp bạn lập kế hoạch nội dung SEO hiệu quả và có hệ thống."
      />
    </ToolPermissionGuard>
  );
}
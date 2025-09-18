import PlaceholderPage from "@/components/placeholder-page";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";

export default function BingIndexing() {
  const toolId = useToolId('bing-indexing');

  return (
    <ToolPermissionGuard 
      toolId={toolId || ""} 
      toolName="Gửi Index Bing"
    >
      <PlaceholderPage 
        toolName="Gửi Index Bing"
        description="Công cụ gửi URL để index nhanh chóng trên Bing, giúp website của bạn được tìm thấy sớm hơn."
      />
    </ToolPermissionGuard>
  );
}
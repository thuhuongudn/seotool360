import PlaceholderPage from "@/components/placeholder-page";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";

export default function SchemaMarkup() {
  const toolId = useToolId('schema-markup');

  return (
    <ToolPermissionGuard 
      toolId={toolId || ""} 
      toolName="Schema Markup"
    >
      <PlaceholderPage 
        toolName="Schema Markup"
        description="Tạo mã Schema Markup tự động để cải thiện hiển thị trong kết quả tìm kiếm và tăng CTR."
      />
    </ToolPermissionGuard>
  );
}
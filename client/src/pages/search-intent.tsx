import PlaceholderPage from "@/components/placeholder-page";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";

export default function SearchIntent() {
  const toolId = useToolId('search-intent');

  return (
    <ToolPermissionGuard 
      toolId={toolId || ""} 
      toolName="Search Intent"
    >
      <PlaceholderPage 
        toolName="Search Intent"
        description="Phân tích ý định tìm kiếm của người dùng để tối ưu hóa nội dung theo đúng mục đích của từ khóa."
      />
    </ToolPermissionGuard>
  );
}
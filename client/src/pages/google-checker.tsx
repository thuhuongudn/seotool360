import PlaceholderPage from "@/components/placeholder-page";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";

export default function GoogleChecker() {
  const toolId = useToolId('google-checker');

  return (
    <ToolPermissionGuard 
      toolId={toolId || ""} 
      toolName="Kiểm tra Google Index"
    >
      <PlaceholderPage 
        toolName="Kiểm tra Google Index"
        description="Kiểm tra trạng thái index của các trang web trên Google một cách nhanh chóng và chính xác."
      />
    </ToolPermissionGuard>
  );
}
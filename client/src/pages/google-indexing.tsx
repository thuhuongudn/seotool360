import PlaceholderPage from "@/components/placeholder-page";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";

export default function GoogleIndexing() {
  const toolId = useToolId('google-indexing');

  return (
    <ToolPermissionGuard 
      toolId={toolId || ""} 
      toolName="Gửi Index Google"
    >
      <PlaceholderPage 
        toolName="Gửi Index Google"
        description="Gửi URL để Google index nhanh chóng thông qua Google Search Console API."
      />
    </ToolPermissionGuard>
  );
}
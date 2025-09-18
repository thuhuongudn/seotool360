import PlaceholderPage from "@/components/placeholder-page";
import ToolPermissionGuard from "@/components/tool-permission-guard";
import { useToolId } from "@/hooks/use-tool-id";

export default function ImageSeo() {
  const toolId = useToolId('image-seo');

  return (
    <ToolPermissionGuard 
      toolId={toolId || ""} 
      toolName="SEO Ảnh"
    >
      <PlaceholderPage 
        toolName="SEO Ảnh"
        description="Tối ưu hóa hình ảnh cho SEO với việc nén, đổi tên file, và tạo alt text tự động."
      />
    </ToolPermissionGuard>
  );
}
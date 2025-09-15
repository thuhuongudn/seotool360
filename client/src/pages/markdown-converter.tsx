import { useState, useMemo } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const defaultMarkdown = `# Chào mừng bạn đến với Trình chuyển đổi Markdown sang HTML!

Đây là một ứng dụng web được xây dựng bằng PHP, Tailwind CSS và JavaScript.

## Cách hoạt động

1. **Nhập liệu:** Gõ hoặc dán văn bản Markdown của bạn vào ô bên trái.
2. **Xem kết quả:** Xem bản xem trước được render và mã HTML thô ở bên phải.
3. **Sao chép:** Sử dụng các nút sao chép để lấy kết quả bạn cần.

> Mọi thứ được xử lý trực tiếp trong trình duyệt của bạn để có tốc độ tối ưu!

\`\`\`javascript
// Ví dụ về mã JavaScript
console.log('Chuyển đổi tức thì!');
\`\`\``;

export default function MarkdownConverter() {
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [copyStates, setCopyStates] = useState({ preview: false, source: false });
  const { toast } = useToast();

  // Process markdown to HTML using unified pipeline
  const htmlOutput = useMemo(() => {
    try {
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkBreaks)
        .use(remarkRehype)
        .use(rehypeSanitize)
        .use(rehypeStringify);

      const result = processor.processSync(markdown);
      return String(result);
    } catch (error) {
      console.error('Markdown processing error:', error);
      return '<p>Lỗi trong quá trình xử lý Markdown</p>';
    }
  }, [markdown]);

  const handleCopy = async (content: string, type: 'preview' | 'source') => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStates(prev => ({ ...prev, [type]: true }));
      toast({
        title: "Đã sao chép!",
        description: `${type === 'preview' ? 'Nội dung HTML' : 'Mã nguồn'} đã được sao chép vào clipboard.`,
      });
      
      // Reset copy state after 2 seconds
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: "Lỗi sao chép",
        description: "Không thể sao chép nội dung. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            data-testid="heading-converter-title"
          >
            Chuyển đổi Markdown sang HTML miễn phí
          </h1>
          <p 
            className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
            data-testid="text-converter-description"
          >
            Công cụ chuyển đổi Markdown sang HTML tức thì, mạnh mẽ, bảo mật và hoàn toàn miễn phí.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle 
                className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"
                data-testid="heading-input-section"
              >
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  1
                </span>
                Nhập nội dung Markdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="Nhập hoặc dán nội dung Markdown của bạn tại đây..."
                className="min-h-[400px] font-mono text-sm resize-none border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                data-testid="textarea-markdown-input"
              />
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle 
                className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"
                data-testid="heading-output-section"
              >
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                  2
                </span>
                Kết quả HTML
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="preview" data-testid="tab-preview">
                    Bản xem trước
                  </TabsTrigger>
                  <TabsTrigger value="source" data-testid="tab-source">
                    Mã nguồn
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleCopy(htmlOutput, 'preview')}
                      variant="outline"
                      size="sm"
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                      data-testid="button-copy-preview"
                    >
                      {copyStates.preview ? (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Sao chép
                    </Button>
                  </div>
                  <div 
                    className="min-h-[350px] p-4 border rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 overflow-auto prose prose-gray dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: htmlOutput }}
                    data-testid="preview-content"
                  />
                </TabsContent>

                <TabsContent value="source" className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleCopy(htmlOutput, 'source')}
                      variant="outline"
                      size="sm"
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                      data-testid="button-copy-source"
                    >
                      {copyStates.source ? (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Sao chép
                    </Button>
                  </div>
                  <div 
                    className="min-h-[350px] p-4 border rounded-lg bg-gray-900 dark:bg-gray-800 border-gray-200 dark:border-gray-600 overflow-auto"
                    data-testid="source-content"
                  >
                    <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono">
                      <code>{htmlOutput}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
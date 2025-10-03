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
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";

const defaultMarkdown = `# Sample Markdown

Đây là một số nội dung markdown cơ bản mẫu.

## Tiêu đề cấp 2

 * Danh sách không có thứ tự, và:
  1. Một
  1. Hai
  1. Ba
 * Thêm nữa

> Trích dẫn

Và **in đậm**, *in nghiêng*, và thậm chí *nghiêng và sau đó **đậm***. Thậm chí ~~gạch ngang~~. [Một liên kết](https://markdowntohtml.com) đến một nơi nào đó.

Và làm nổi bật mã:

\`\`\`js
var foo = 'bar';

function baz(s) {
   return foo + ':' + s;
}
\`\`\`

Hoặc mã nội tuyến như \`var foo = 'bar';\`.

Hoặc một hình ảnh về gấu

![bears](http://placebear.com/200/200)

Kết thúc ...`;

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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation
          breadcrumbItems={[
            { label: "Markdown to HTML" }
          ]}
          backLink="/"
        />

        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
              data-testid="heading-converter-title"
            >
              Chuyển đổi <span className="text-blue-600">Markdown sang HTML</span> miễn phí
            </h1>
            <p
              className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              data-testid="text-converter-description"
            >
              Công cụ chuyển đổi Markdown sang HTML tức thì, mạnh mẽ, bảo mật và hoàn toàn miễn phí.
            </p>
          </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6 mb-12">
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

        {/* Markdown Syntax Cheatsheet Section - SEO Content */}
        <div className="max-w-7xl mx-auto mt-16">
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Tài liệu tham khảo cú pháp Markdown
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Đây là tài liệu tham khảo nhanh về cú pháp Markdown. Bạn có thể tìm thấy hướng dẫn đầy đủ hơn trên{' '}
                <a
                  href="https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  GitHub
                </a>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-gray dark:prose-invert max-w-none">
              {/* Basic Formatting */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Định dạng cơ bản
                </h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li><strong>In đậm</strong>: <code>**In đậm**</code></li>
                  <li><em>Nhấn mạnh</em>: <code>*Nhấn mạnh*</code></li>
                  <li><del>Gạch ngang</del>: <code>~~Gạch ngang~~</code></li>
                  <li>Đường kẻ ngang: <code>---</code> (ba dấu gạch ngang), <code>***</code> (ba dấu sao), hoặc <code>___</code> (ba dấu gạch dưới)</li>
                </ul>
              </section>

              {/* Headings */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Tiêu đề
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Tất cả các cấp độ tiêu đề (ví dụ: H1, H2, v.v.), được đánh dấu bằng <code>#</code> ở đầu dòng.
                  Ví dụ, H1 là <code># Tiêu đề 1</code> và H2 là <code>## Tiêu đề 2</code>.
                  Điều này tiếp tục đến <code>###### Tiêu đề 6</code>.
                </p>
              </section>

              {/* Links */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Liên kết
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Liên kết có thể được tạo bằng nhiều phương pháp:
                </p>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-6">
                  <li>Liên kết có thể <code>[inline](https://seotool360.vn/markdown-converter)</code></li>
                  <li>Liên kết inline có thể <code>[có tiêu đề](https://seotool360.vn/markdown-converter "Công cụ chuyển đổi Markdown tuyệt vời")</code></li>
                  <li>
                    Ngoài ra, có thể có các liên kết tham chiếu cho phép đặt URL ở phần sau của tài liệu:
                    <ul className="mt-2 space-y-1 list-circle pl-6">
                      <li>Đây là một <code>[liên kết tham chiếu][markdowntohtml]</code> liên kết đến trang web này.</li>
                      <li>Tham chiếu không phân biệt chữ hoa chữ thường (ví dụ <code>[liên kết này][MarkDownToHTML]</code> hoạt động).</li>
                      <li>Tham chiếu cũng có thể <code>[sử dụng số][1]</code>.</li>
                      <li>Hoặc để trống và sử dụng <code>[văn bản liên kết]</code>.</li>
                    </ul>
                  </li>
                  <li>Ngoài ra, bạn có thể sử dụng liên kết tương đối <code>[như thế này](../blob/master/LICENSE.txt)</code>.</li>
                  <li>URL và URL trong ngoặc nhọn sẽ tự động được chuyển thành liên kết: https://seotool360.vn/markdown-converter hoặc <code>&lt;https://seotool360.vn/markdown-converter&gt;</code>.</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3">
                  URL cho các liên kết tham chiếu nằm ở đâu đó sau trong tài liệu như thế này:
                </p>
                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md overflow-x-auto">
                  <code className="text-gray-900 dark:text-gray-100">{`[markdowntohtml]: https://seotool360.vn/markdown-converter
[1]: https://seotool360.vn/markdown-converter
[văn bản liên kết]: https://seotool360.vn/markdown-converter`}</code>
                </pre>
              </section>

              {/* Images */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Hình ảnh
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Hình ảnh cũng có thể là inline hoặc sử dụng kiểu tham chiếu, tương tự như liên kết.
                  Chỉ cần thêm dấu chấm than vào trước để biến liên kết thành hình ảnh. Ví dụ:
                </p>
                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md overflow-x-auto">
                  <code className="text-gray-900 dark:text-gray-100">{`Hình ảnh với URL đầy đủ: ![văn bản thay thế](https://placebear.com/300/300)

Hoặc, hình ảnh kiểu tham chiếu: ![văn bản thay thế][bears].

[bears]: https://placebear.com/300/300`}</code>
                </pre>
              </section>

              {/* Lists */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Danh sách (Danh sách có thứ tự và Danh sách không có thứ tự)
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Danh sách được tạo bằng cách sử dụng thụt lề và dấu hiệu đầu dòng để chỉ ra một mục danh sách.
                  Ví dụ, danh sách không có thứ tự được tạo như thế này:
                </p>
                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md overflow-x-auto mb-3">
                  <code className="text-gray-900 dark:text-gray-100">{`* Một mục
* Một mục khác
  * Một mục con
    * Một mục sâu hơn
  * Quay lại mục con
* Và quay lại cấp độ chính`}</code>
                </pre>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Danh sách không có thứ tự có thể sử dụng dấu sao (<code>*</code>), dấu cộng (<code>+</code>),
                  hoặc dấu trừ (<code>-</code>) để chỉ ra từng mục danh sách.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Danh sách có thứ tự sử dụng số ở đầu dòng. Các số không cần phải tăng dần - điều này sẽ tự động xảy ra trong HTML.
                  Điều đó giúp việc sắp xếp lại danh sách có thứ tự của bạn (trong markdown) dễ dàng hơn khi cần.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Ngoài ra, danh sách có thứ tự và không có thứ tự có thể được lồng trong nhau. Ví dụ:
                </p>
                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md overflow-x-auto">
                  <code className="text-gray-900 dark:text-gray-100">{`* Một mục
* Một mục khác
  1. Một danh sách có thứ tự lồng nhau
  1. Đây là mục thứ hai
    * Và bây giờ là một danh sách không có thứ tự làm con của nó
    * Một mục khác trong danh sách này
  1. Thêm một mục nữa trong danh sách có thứ tự
* Và quay lại cấp độ chính`}</code>
                </pre>
              </section>

              {/* Code and Syntax Highlighting */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Code và làm nổi bật cú pháp
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Code inline sử dụng <code>`backticks`</code> xung quanh nó.
                  Các khối code được đặt giữa ba dấu backtick (<code>```</code>) hoặc thụt lề bốn khoảng trắng. Ví dụ:
                </p>
                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md overflow-x-auto">
                  <code className="text-gray-900 dark:text-gray-100">{`\`\`\`js
var foo = 'bar';

function baz(s) {
   return foo + ':' + s;
}
\`\`\``}</code>
                </pre>
              </section>

              {/* Blockquotes */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Trích dẫn
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Sử dụng <code>&gt; </code> để bù đắp văn bản như một trích dẫn. Ví dụ:
                </p>
                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md overflow-x-auto mb-3">
                  <code className="text-gray-900 dark:text-gray-100">{`> Đây là một phần của trích dẫn.
> Thêm nội dung.`}</code>
                </pre>
                <p className="text-gray-700 dark:text-gray-300 mb-3">Sẽ tạo ra:</p>
                <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-700 dark:text-gray-300">
                  Đây là một phần của trích dẫn. Thêm nội dung.
                </blockquote>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
    </div>
  );
}

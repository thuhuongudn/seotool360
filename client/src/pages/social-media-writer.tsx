import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Share2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schema matching the requirements
const socialMediaFormSchema = z.object({
  postType: z.string().min(1, "Vui lòng chọn loại bài viết"),
  title: z.string().min(1, "Vui lòng nhập tiêu đề"),
  framework: z.string().optional(),
  writingStyle: z.string().optional(),
  structure: z.string().optional(),
  maxWords: z.string().optional(),
  hashtags: z.string().optional(),
});

type SocialMediaFormData = z.infer<typeof socialMediaFormSchema>;

interface WebhookResponse {
  output?: string;
  content?: string;
  result?: string;
  [key: string]: any;
}

export default function SocialMediaWriter() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<string>("");
  const { toast } = useToast();

  const form = useForm<SocialMediaFormData>({
    resolver: zodResolver(socialMediaFormSchema),
    defaultValues: {
      postType: "",
      title: "",
      framework: "",
      writingStyle: "",
      structure: "",
      maxWords: "",
      hashtags: "",
    },
  });

  const handleSubmit = async (data: SocialMediaFormData) => {
    setIsSubmitting(true);
    setResult("");

    try {
      // Prepare webhook payload
      const payload = {
        loai_bai_viet: data.postType,
        tieu_de: data.title,
        framework: data.framework || "",
        phong_cach_viet: data.writingStyle || "",
        cau_truc_bai_viet: data.structure || "",
        so_tu_toi_da: data.maxWords || "",
        hashtag_bai_viet: data.hashtags || "",
      };

      // Send request to n8n webhook
      const response = await fetch(
        "https://n8n.nhathuocvietnhat.vn/webhook/seo-tool-360-product-social",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const webhookResponse: WebhookResponse = await response.json();

      // Parse the response - try different possible fields
      const content =
        webhookResponse.output ||
        webhookResponse.content ||
        webhookResponse.result ||
        JSON.stringify(webhookResponse, null, 2);

      setResult(content);

      // Save form data and result to database
      try {
        await apiRequest("POST", "/api/social-media-posts", {
          postType: data.postType,
          title: data.title,
          framework: data.framework || "",
          writingStyle: data.writingStyle || "",
          structure: data.structure || "",
          maxWords: data.maxWords || "",
          hashtags: data.hashtags || "",
          result: content,
        });
      } catch (dbError) {
        console.warn("Failed to save post to database:", dbError);
        // Don't show error to user as the main functionality worked
      }

      toast({
        title: "Thành công!",
        description: "Bài đăng MXH đã được tạo thành công.",
      });
    } catch (error) {
      console.error("Webhook error:", error);
      toast({
        title: "Có lỗi xảy ra",
        description: "Không thể tạo bài đăng. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            data-testid="heading-social-writer-title"
          >
            Viết bài Mạng Xã Hội <span className="text-blue-600">bằng AI</span>
          </h1>
          <p
            className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
            data-testid="text-social-writer-description"
          >
            Tạo ra các bài đăng mạng xã hội hấp dẫn, sáng tạo và thu hút chỉ
            trong vài giây!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle
                className="text-xl font-bold text-gray-900 dark:text-white"
                data-testid="heading-form-section"
              >
                Thông tin bài đăng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
                >
                  {/* Field 1: Loại bài viết */}
                  <FormField
                    control={form.control}
                    name="postType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-post-type"
                        >
                          <span className="text-blue-600">📝</span>
                          Dạng bài viết
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-post-type">
                              <SelectValue placeholder="Chia sẻ thông tin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="product">
                              Giới thiệu sản phẩm
                            </SelectItem>
                            <SelectItem value="blog">
                              Giới thiệu blog (article)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 2: Tiêu đề */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-title"
                        >
                          <span className="text-orange-500">🏷️</span>
                          Chủ đề chính của bài viết
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="VD: V Platinum 5-MTHF: Giải Pháp Toàn Diện Cho Sức Khỏe Mẹ Và Bé Trước, Trong và Sau Thai Kỳ"
                            {...field}
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 3: Framework */}
                  <FormField
                    control={form.control}
                    name="framework"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200"
                          data-testid="label-framework"
                        >
                          Framework
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-framework">
                              <SelectValue placeholder="Chọn framework" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="4C (Clear, Concise, Compelling, Credible)">
                              4C (Clear, Concise, Compelling, Credible)
                            </SelectItem>
                            <SelectItem value="AIDA (Attention – Interest – Desire – Action)">
                              AIDA (Attention – Interest – Desire – Action)
                            </SelectItem>
                            <SelectItem value="PAS (Problem – Agitate – Solution)">
                              PAS (Problem – Agitate – Solution)
                            </SelectItem>
                            <SelectItem value="FAB (Features – Advantages – Benefits)">
                              FAB (Features – Advantages – Benefits)
                            </SelectItem>
                            <SelectItem value="BAB (Before – After – Bridge)">
                              BAB (Before – After – Bridge)
                            </SelectItem>
                            <SelectItem value="Storytelling">
                              Storytelling
                            </SelectItem>
                            <SelectItem value="Listicle">Listicle</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 4: Phong cách viết */}
                  <FormField
                    control={form.control}
                    name="writingStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-writing-style"
                        >
                          <span className="text-red-500">🖋️</span>
                          Phong Cách Viết
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-writing-style">
                              <SelectValue placeholder="Thân thiện" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Thân thiện">
                              Thân thiện
                            </SelectItem>
                            <SelectItem value="Chuyên nghiệp">
                              Chuyên nghiệp
                            </SelectItem>
                            <SelectItem value="Thuyết phục">
                              Thuyết phục
                            </SelectItem>
                            <SelectItem value="Truyền cảm hứng">
                              Truyền cảm hứng
                            </SelectItem>
                            <SelectItem value="Thông tin">Thông tin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 5: Cấu trúc bài viết */}
                  <FormField
                    control={form.control}
                    name="structure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-structure"
                        >
                          <span className="text-purple-500">🏗️</span>
                          Cấu Trúc Bài Viết
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-structure">
                              <SelectValue placeholder="Bài viết chuẩn" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bài viết chuẩn">
                              Bài viết chuẩn
                            </SelectItem>
                            <SelectItem value="Dạng danh sách (Listicle)">
                              Dạng danh sách (Listicle)
                            </SelectItem>
                            <SelectItem value="Dạng hướng dẫn (How-to)">
                              Dạng hướng dẫn (How-to)
                            </SelectItem>
                            <SelectItem value="Dạng kể chuyện (Storytelling)">
                              Dạng kể chuyện (Storytelling)
                            </SelectItem>
                            <SelectItem value="Dạng Hỏi – Đáp (Q&A)">
                              Dạng Hỏi – Đáp (Q&A)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 6: Số từ tối đa */}
                  <FormField
                    control={form.control}
                    name="maxWords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-max-words"
                        >
                          <span className="text-purple-500">📊</span>
                          Số từ tối đa
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-max-words">
                              <SelectValue placeholder="300 từ (Mặc định)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                            <SelectItem value="300">300</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Field 7: Hashtag bài viết */}
                  <FormField
                    control={form.control}
                    name="hashtags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2"
                          data-testid="label-hashtags"
                        >
                          <span className="text-blue-500">#</span>
                          Hashtag bài viết
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="#chaybo, #suckhoe, #nangluong"
                            className="min-h-[100px]"
                            {...field}
                            data-testid="textarea-hashtags"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg"
                    data-testid="button-generate-post"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tạo bài đăng...
                      </>
                    ) : (
                      <>
                        <Share2 className="mr-2 h-4 w-4" />
                        Tạo bài đăng MXH
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-sm">
            <CardHeader>
              <CardTitle
                className="text-xl font-bold text-gray-900 dark:text-white"
                data-testid="heading-results-section"
              >
                Kết quả
              </CardTitle>
              <CardDescription>
                Bài đăng MXH của bạn sẽ xuất hiện ở đây...
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div
                  className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border"
                  data-testid="results-content"
                >
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                    {result}
                  </pre>
                </div>
              ) : (
                <div
                  className="text-center py-12 text-gray-500 dark:text-gray-400"
                  data-testid="results-empty"
                >
                  <Share2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    Bài đăng MXH của bạn sẽ xuất hiện ở đây
                  </p>
                  <p className="text-sm">
                    Hãy điền thông tin vào form bên trái và để AI sáng tạo nhé.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

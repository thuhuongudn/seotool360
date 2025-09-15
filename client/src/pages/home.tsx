import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/header";
import ToolGrid from "@/components/tool-grid";

export default function Home() {
  const handleContactSupport = () => {
    // TODO: Implement contact form or chat widget
    console.log("Contact support clicked");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12" data-testid="section-hero">
          <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-hero-title">
            Bộ Công Cụ SEO AI Toàn Diện
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto" data-testid="text-hero-description">
            Tối ưu hóa mọi khía cạnh SEO của bạn với sức mạnh của Trí tuệ nhân tạo. 
            Nhanh chóng, chính xác và hiệu quả.
          </p>
        </div>

        {/* Tool Grid */}
        <ToolGrid />

        {/* CTA Section */}
        <div className="mt-16 text-center" data-testid="section-cta">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4" data-testid="text-cta-title">
                Cần hỗ trợ thêm?
              </h2>
              <p className="text-muted-foreground mb-6" data-testid="text-cta-description">
                Liên hệ với đội ngũ chuyên gia SEO của chúng tôi để được tư vấn miễn phí
              </p>
              <Button 
                onClick={handleContactSupport}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3"
                data-testid="button-contact-support"
              >
                Liên hệ ngay
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted border-t border-border mt-16" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-xs">AI</span>
              </div>
              <span className="text-lg font-semibold text-foreground">SEO AI</span>
            </div>
            <p className="text-muted-foreground text-sm" data-testid="text-copyright">
              © 2024 SEO AI. Tất cả quyền được bảo lưu.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

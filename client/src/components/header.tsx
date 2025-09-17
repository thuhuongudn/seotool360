import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, X, MessageCircle, ChevronRight } from "lucide-react";
import logoUrl from "@assets/logo-seotool-360-transparent_1758077866087.png";
import { Link } from "wouter";

const contentSeoItems = [
  { label: "Topical Map", href: "/topical-map" },
  { label: "Search Intent", href: "/search-intent" },
  { label: "Gợi ý internal link", href: "/internal-link-helper" },
  { label: "Viết Lại Bài", href: "/article-rewriter" },
  { label: "Viết bài MXH", href: "/social-media-writer" },
  { label: "Schema Markup", href: "/schema-markup" },
];

const indexItems = [
  { label: "Gửi Index Bing", href: "/bing-indexing" },
  { label: "Gửi Index Google", href: "/google-indexing" },
  { label: "Kiểm tra Google Index", href: "/google-checker" },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSupport = () => {
    // TODO: Implement support functionality
    console.log("Support clicked");
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3" data-testid="logo-link">
            <img 
              src={logoUrl} 
              alt="SEOTOOL360 Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-foreground">SEOTOOL360</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {/* Content SEO Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger 
                className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="dropdown-content-seo"
              >
                <span>Content SEO</span>
                <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                {contentSeoItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link 
                      href={item.href}
                      className="block px-4 py-2 text-sm"
                      data-testid={`menu-item-${item.href.slice(1)}`}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Index Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger 
                className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="dropdown-index"
              >
                <span>Index</span>
                <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                {indexItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link 
                      href={item.href}
                      className="block px-4 py-2 text-sm"
                      data-testid={`menu-item-${item.href.slice(1)}`}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link 
              href="/image-seo" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="nav-seo-image"
            >
              SEO Ảnh
            </Link>
            <Link 
              href="/markdown-converter" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="nav-markdown-html"
            >
              Markdown to HTML
            </Link>
            <Link 
              href="/qr-code" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="nav-qr-code"
            >
              QR Code
            </Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-blog">
              Blog
            </Link>
          </nav>

          {/* Admin Button */}
          <Link href="/admin">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white hidden md:inline-flex"
              data-testid="button-admin-page"
            >
              Đến trang Admin
            </Button>
          </Link>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-b border-border">
          <div className="px-4 py-3 space-y-3">
            {/* Content SEO Section */}
            <div className="space-y-2">
              <div className="font-semibold text-foreground text-sm uppercase tracking-wide">
                Content SEO
              </div>
              <div className="space-y-1 ml-4">
                {contentSeoItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div 
                      className="flex items-center justify-between py-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                      data-testid={`mobile-menu-item-${item.href.slice(1)}`}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Index Section */}
            <div className="space-y-2">
              <div className="font-semibold text-foreground text-sm uppercase tracking-wide">
                Index
              </div>
              <div className="space-y-1 ml-4">
                {indexItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div 
                      className="flex items-center justify-between py-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                      data-testid={`mobile-menu-item-${item.href.slice(1)}`}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Other Tools */}
            <div className="space-y-2">
              <div className="font-semibold text-foreground text-sm uppercase tracking-wide">
                Tools khác
              </div>
              <div className="space-y-1 ml-4">
                <Link href="/image-seo">
                  <div 
                    className="flex items-center justify-between py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid="mobile-menu-item-image-seo"
                  >
                    <span>SEO Ảnh</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
                <Link href="/markdown-converter">
                  <div 
                    className="flex items-center justify-between py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid="mobile-menu-item-markdown-converter"
                  >
                    <span>Markdown to HTML</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
                <Link href="/qr-code">
                  <div 
                    className="flex items-center justify-between py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid="mobile-menu-item-qr-code"
                  >
                    <span>QR Code</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
                <Link href="/blog">
                  <div 
                    className="flex items-center justify-between py-2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid="mobile-menu-item-blog"
                  >
                    <span>Blog</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
              </div>
            </div>

            {/* Admin Link */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <Link href="/admin">
                <div 
                  className="flex items-center justify-between py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid="mobile-admin-link"
                >
                  <span className="font-medium">Đến trang Admin</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

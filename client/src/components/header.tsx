import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Bot, Menu } from "lucide-react";
import { Link } from "wouter";

const contentSeoItems = [
  { label: "Topical Map", href: "#topical-map" },
  { label: "Search Intent", href: "#search-intent" },
  { label: "Viết Bài AI", href: "#ai-writing" },
  { label: "Viết Lại Bài", href: "#article-rewriter" },
  { label: "Viết bài MXH", href: "#social-media" },
  { label: "Schema Markup", href: "#schema-markup" },
];

const indexItems = [
  { label: "Gửi Index Bing", href: "#bing-indexing" },
  { label: "Gửi Index Google", href: "#google-indexing" },
  { label: "Kiểm tra Google Index", href: "#google-checker" },
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
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="text-primary-foreground w-4 h-4" />
            </div>
            <span className="text-xl font-bold text-foreground">SEO AI</span>
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
                    <a 
                      href={item.href}
                      className="block px-4 py-2 text-sm"
                      data-testid={`menu-item-${item.href.slice(1)}`}
                    >
                      {item.label}
                    </a>
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
                    <a 
                      href={item.href}
                      className="block px-4 py-2 text-sm"
                      data-testid={`menu-item-${item.href.slice(1)}`}
                    >
                      {item.label}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <a 
              href="#image-seo" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="nav-seo-image"
            >
              SEO Ảnh
            </a>
            <a 
              href="#markdown-html" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="nav-markdown-html"
            >
              Markdown to HTML
            </a>
            <a 
              href="#qr-code" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="nav-qr-code"
            >
              QR Code
            </a>
            <Link href="/blog">
              <a className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-blog">
                Blog
              </a>
            </Link>
          </nav>

          {/* CTA Button */}
          <Button 
            onClick={handleSupport}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-support"
          >
            Hỗ Trợ
          </Button>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

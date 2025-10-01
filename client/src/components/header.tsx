import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, X, MessageCircle, ChevronRight, User, Settings, LogOut, LogIn } from "lucide-react";
import logoUrl from "@assets/logo-seotool-360-transparent_1758077866087.png";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TokenWidget } from "@/components/token-widget";

const contentSeoItems = [
  { label: "Keyword Planner", href: "/keyword-planner" },
  { label: "Search Intent", href: "/search-intent" },
  { label: "Topical Map", href: "/topical-map" },
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
  const { user, logout, isLoading } = useAuth();

  const handleSupport = () => {
    // TODO: Implement support functionality
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

          {/* User Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {!user ? (
              <Link href="/admin">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
                  data-testid="button-login"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </Button>
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 p-2" data-testid="dropdown-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-semibold">
                        {user.profile?.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-foreground">
                        {user.profile?.username || user.email}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {user.profile?.role || 'member'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <div className="flex items-center space-x-2 p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-semibold">
                          {user.profile?.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {user.profile?.username || user.email}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {user.profile?.role || 'member'}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {user && (
                    <div className="px-2 py-2">
                      <TokenWidget />
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center space-x-2 cursor-pointer" data-testid="menu-item-dashboard">
                      <User className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center space-x-2 cursor-pointer" data-testid="menu-item-settings">
                      <Settings className="w-4 h-4" />
                      <span>Cài đặt</span>
                    </Link>
                  </DropdownMenuItem>
                  {user.profile?.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center space-x-2 cursor-pointer" data-testid="menu-item-admin">
                        <Settings className="w-4 h-4" />
                        <span>Quản trị</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={logout}
                    className="flex items-center space-x-2 cursor-pointer text-red-600 focus:text-red-600"
                    data-testid="menu-item-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

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

            {/* Auth Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              {!user ? (
                <Link href="/admin">
                  <div 
                    className="flex items-center justify-between py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid="mobile-login-link"
                  >
                    <div className="flex items-center space-x-2">
                      <LogIn className="w-4 h-4" />
                      <span className="font-medium">Đăng nhập</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
              ) : (
                <div className="space-y-2">
                  {/* User Info */}
                  <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                        {user.profile?.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {user.profile?.username || user.email}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {user.profile?.role || 'member'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Menu Items */}
                  <div className="space-y-1">
                    <Link href="/dashboard">
                      <div 
                        className="flex items-center space-x-3 py-2 px-4 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="mobile-menu-dashboard"
                      >
                        <User className="w-4 h-4" />
                        <span>Dashboard</span>
                      </div>
                    </Link>
                    
                    <Link href="/settings">
                      <div 
                        className="flex items-center space-x-3 py-2 px-4 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="mobile-menu-settings"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Cài đặt</span>
                      </div>
                    </Link>
                    
                    {user.profile?.role === 'admin' && (
                      <Link href="/admin">
                        <div 
                          className="flex items-center space-x-3 py-2 px-4 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid="mobile-menu-admin"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Quản trị</span>
                        </div>
                      </Link>
                    )}
                    
                    <div 
                      className="flex items-center space-x-3 py-2 px-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      data-testid="mobile-menu-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

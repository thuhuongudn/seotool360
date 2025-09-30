import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import FloatingSupportButton from "@/components/floating-support-button";
import { AuthProvider } from "@/contexts/auth-context";
import AdminLogin from "@/components/admin-login";
import ProtectedAdminRoute from "@/components/protected-admin-route";
import ProtectedRoute from "@/components/protected-route";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";
import MarkdownConverter from "@/pages/markdown-converter";
import SocialMediaWriter from "@/pages/social-media-writer";
import AllSocialMediaPosts from "@/pages/all-social-media-posts";
import AllInternalLinkSuggestions from "@/pages/all-internal-link-suggestions";
import AdminPage from "@/pages/admin";
// Content SEO Tools
import KeywordPlanner from "@/pages/keyword-planner";
import TopicalMap from "@/pages/topical-map";
import SearchIntent from "@/pages/search-intent";
import InternalLinkHelper from "@/pages/internal-link-helper";
import ArticleRewriter from "@/pages/article-rewriter";
import SchemaMarkup from "@/pages/schema-markup";
// Index Tools
import BingIndexing from "@/pages/bing-indexing";
import GoogleIndexing from "@/pages/google-indexing";
import GoogleChecker from "@/pages/google-checker";
// Other Tools
import ImageSeo from "@/pages/image-seo";
import QrCode from "@/pages/qr-code";
import Blog from "@/pages/blog";
import AuthCallback from "@/pages/auth-callback";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/markdown-converter" component={MarkdownConverter} />
      <Route path="/social-media-writer">
        <ProtectedRoute>
          <SocialMediaWriter />
        </ProtectedRoute>
      </Route>
      <Route path="/all-social-media-posts" component={AllSocialMediaPosts} />
      <Route path="/all-internal-link-suggestions" component={AllInternalLinkSuggestions} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedAdminRoute>
          <AdminPage />
        </ProtectedAdminRoute>
      </Route>
      {/* Content SEO Routes */}
      <Route path="/keyword-planner">
        <ProtectedRoute>
          <KeywordPlanner />
        </ProtectedRoute>
      </Route>
      <Route path="/topical-map">
        <ProtectedRoute>
          <TopicalMap />
        </ProtectedRoute>
      </Route>
      <Route path="/search-intent">
        <ProtectedRoute>
          <SearchIntent />
        </ProtectedRoute>
      </Route>
      <Route path="/internal-link-helper" component={InternalLinkHelper} />
      <Route path="/article-rewriter">
        <ProtectedRoute>
          <ArticleRewriter />
        </ProtectedRoute>
      </Route>
      <Route path="/schema-markup">
        <ProtectedRoute>
          <SchemaMarkup />
        </ProtectedRoute>
      </Route>
      {/* Index Routes */}
      <Route path="/bing-indexing">
        <ProtectedRoute>
          <BingIndexing />
        </ProtectedRoute>
      </Route>
      <Route path="/google-indexing">
        <ProtectedRoute>
          <GoogleIndexing />
        </ProtectedRoute>
      </Route>
      <Route path="/google-checker">
        <ProtectedRoute>
          <GoogleChecker />
        </ProtectedRoute>
      </Route>
      {/* Other Tool Routes */}
      <Route path="/image-seo" component={ImageSeo} />
      <Route path="/qr-code" component={QrCode} />
      <Route path="/blog" component={Blog} />
      {/* Auth Routes */}
      <Route path="/auth/callback" component={AuthCallback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <FloatingSupportButton
            zaloUrl="https://zalo.me/0355418417"
            messengerUrl="https://m.me/quang.nguyentan"
            contactEmail="tanquangyds@gmail.com"
          />
          {/* Global login modal */}
          <AdminLogin isModal={true} loginType="member" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

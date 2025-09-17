import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import FloatingSupportButton from "@/components/floating-support-button";
import { AuthProvider } from "@/contexts/auth-context";
import ProtectedAdminRoute from "@/components/protected-admin-route";
import Home from "@/pages/home";
import MarkdownConverter from "@/pages/markdown-converter";
import SocialMediaWriter from "@/pages/social-media-writer";
import AllSocialMediaPosts from "@/pages/all-social-media-posts";
import AllInternalLinkSuggestions from "@/pages/all-internal-link-suggestions";
import AdminPage from "@/pages/admin";
// Content SEO Tools
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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/markdown-converter" component={MarkdownConverter} />
      <Route path="/social-media-writer" component={SocialMediaWriter} />
      <Route path="/all-social-media-posts" component={AllSocialMediaPosts} />
      <Route path="/all-internal-link-suggestions" component={AllInternalLinkSuggestions} />
      <Route path="/admin">
        <ProtectedAdminRoute>
          <AdminPage />
        </ProtectedAdminRoute>
      </Route>
      {/* Content SEO Routes */}
      <Route path="/topical-map" component={TopicalMap} />
      <Route path="/search-intent" component={SearchIntent} />
      <Route path="/internal-link-helper" component={InternalLinkHelper} />
      <Route path="/article-rewriter" component={ArticleRewriter} />
      <Route path="/schema-markup" component={SchemaMarkup} />
      {/* Index Routes */}
      <Route path="/bing-indexing" component={BingIndexing} />
      <Route path="/google-indexing" component={GoogleIndexing} />
      <Route path="/google-checker" component={GoogleChecker} />
      {/* Other Tool Routes */}
      <Route path="/image-seo" component={ImageSeo} />
      <Route path="/qr-code" component={QrCode} />
      <Route path="/blog" component={Blog} />
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
          <FloatingSupportButton />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

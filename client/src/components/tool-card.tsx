import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { SeoTool } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import * as Icons from "lucide-react";

interface ToolCardProps {
  tool: SeoTool;
  showStatusIndicator?: boolean; // If true, shows status indicator dot
}

export default function ToolCard({ tool, showStatusIndicator = false }: ToolCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Define which tools are free to use without authentication
  const freeTools = new Set([
    'markdown-html',
    'qr-code'
  ]);
  
  const isFreeTool = freeTools.has(tool.name);
  const requiresAuth = !isFreeTool;

  // Dynamically get the icon component
  const IconComponent = (Icons as any)[tool.icon] || Icons.Wrench;

  const activateToolMutation = useMutation({
    mutationFn: async (toolId: string) => {
      const response = await apiRequest("POST", "/api/seo-tools/activate", {
        toolId,
        input: {}
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Công cụ đã được kích hoạt",
        description: data.message || "Công cụ đang được xử lý",
      });
      // Invalidate and refetch tools data
      queryClient.invalidateQueries({ queryKey: ["/api/seo-tools"] });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi kích hoạt công cụ",
        description: error.message || "Đã xảy ra lỗi khi kích hoạt công cụ",
        variant: "destructive",
      });
    },
  });

  const handleActivate = () => {
    // Check if tool requires authentication and user is not logged in
    if (requiresAuth && !user) {
      toast({
        title: "Yêu cầu đăng nhập",
        description: "Vui lòng đăng nhập để sử dụng công cụ này.",
        variant: "default",
      });
      setLocation('/admin'); // Redirect to login page
      return;
    }
    
    // Navigate to dedicated pages for tools that have their own pages
    const toolRoutes: { [key: string]: string } = {
      'markdown-html': '/markdown-converter',
      'social-media': '/social-media-writer',
      'topical-map': '/topical-map',
      'search-intent': '/search-intent',
      'internal-link-helper': '/internal-link-helper',
      'ai-writing': '/internal-link-helper', // redirect old ai-writing to internal-link-helper
      'article-rewriter': '/article-rewriter',
      'bing-indexing': '/bing-indexing',
      'google-indexing': '/google-indexing',
      'google-checker': '/google-checker',
      'schema-markup': '/schema-markup',
      'image-seo': '/image-seo',
      'qr-code': '/qr-code'
    };
    
    const route = toolRoutes[tool.name];
    if (route) {
      setLocation(route);
      return;
    }
    
    // Default behavior: activate the tool via API (for authenticated users)
    activateToolMutation.mutate(tool.id);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      id={tool.name}
      data-testid={`card-tool-${tool.name}`}
    >
      <CardContent className="p-6">
        <div className="relative">
          <div className={`flex items-center justify-center w-12 h-12 ${tool.iconBgColor} rounded-lg mb-4`}>
            <IconComponent className={`${tool.iconColor} w-6 h-6`} />
          </div>
          
          {/* Status Indicator */}
          {showStatusIndicator && (
            <div 
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                tool.status === 'active' ? 'bg-green-500' : 'bg-orange-500'
              }`}
              data-testid={`status-indicator-${tool.name}`}
              title={tool.status === 'active' ? 'Active' : 'Pending'}
            />
          )}
        </div>
        
        <h3 
          className="text-lg font-semibold text-card-foreground mb-2"
          data-testid={`text-title-${tool.name}`}
        >
          {tool.title}
        </h3>
        
        <p 
          className="text-muted-foreground text-sm mb-4"
          data-testid={`text-description-${tool.name}`}
        >
          {tool.description}
        </p>
        
        <div className="space-y-2">
          {/* Free/Premium indicator */}
          {!user && (
            <div className="flex items-center justify-center">
              {isFreeTool ? (
                <Badge variant="secondary" className="text-xs">
                  Miễn phí
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>Yêu cầu đăng nhập</span>
                </Badge>
              )}
            </div>
          )}
          
          <Button
            onClick={handleActivate}
            disabled={activateToolMutation.isPending}
            className={`w-full ${
              requiresAuth && !user 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
            }`}
            data-testid={`button-activate-${tool.name}`}
          >
            {activateToolMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : requiresAuth && !user ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                <span>Đăng nhập để sử dụng</span>
              </>
            ) : (
              <>
                <span>Sử dụng công cụ</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

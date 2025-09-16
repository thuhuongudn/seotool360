import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { SeoTool } from "@shared/schema";
import * as Icons from "lucide-react";

interface ToolCardProps {
  tool: SeoTool;
}

export default function ToolCard({ tool }: ToolCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

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
    
    // Default behavior: activate the tool via API
    activateToolMutation.mutate(tool.id);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      id={tool.name}
      data-testid={`card-tool-${tool.name}`}
    >
      <CardContent className="p-6">
        <div className={`flex items-center justify-center w-12 h-12 ${tool.iconBgColor} rounded-lg mb-4`}>
          <IconComponent className={`${tool.iconColor} w-6 h-6`} />
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
        
        <Button
          onClick={handleActivate}
          disabled={activateToolMutation.isPending}
          className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground"
          data-testid={`button-activate-${tool.name}`}
        >
          {activateToolMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <span>Sử dụng công cụ</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CopyMarkdownButtonProps {
  content: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "secondary" | "outline" | "ghost";
}

export default function CopyMarkdownButton({ 
  content, 
  className = "", 
  size = "sm",
  variant = "outline" 
}: CopyMarkdownButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      
      toast({
        title: "Đã sao chép!",
        description: "Nội dung markdown đã được sao chép vào clipboard.",
        duration: 2000,
      });

      // Reset copy state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Lỗi sao chép",
        description: "Không thể sao chép nội dung. Vui lòng thử lại.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <Button
      onClick={handleCopy}
      disabled={!content || copied}
      size={size}
      variant={variant}
      className={`${className} ${copied ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-50' : ''}`}
      data-testid="button-copy-markdown"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Đã copy
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </>
      )}
    </Button>
  );
}
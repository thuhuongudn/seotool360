import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface FloatingSupportButtonProps {
  onClick?: () => void;
  className?: string;
}

export default function FloatingSupportButton({ 
  onClick, 
  className = "" 
}: FloatingSupportButtonProps) {
  const handleSupport = () => {
    // TODO: Implement support functionality
    console.log("Support clicked");
    if (onClick) onClick();
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <Button
        onClick={handleSupport}
        className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
        data-testid="button-floating-support"
        aria-label="Mở hỗ trợ"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}
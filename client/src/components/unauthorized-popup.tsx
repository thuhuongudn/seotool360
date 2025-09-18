import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";

interface UnauthorizedPopupProps {
  isOpen: boolean;
  onClose: () => void;
  toolName?: string;
}

export default function UnauthorizedPopup({ 
  isOpen, 
  onClose, 
  toolName = "tool này" 
}: UnauthorizedPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Shield className="w-5 h-5" />
              Không có quyền truy cập
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
              data-testid="button-close-unauthorized"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bạn chưa có quyền dùng {toolName}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Hãy liên hệ admin để được cấp quyền sử dụng tool này.
              </p>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                💡 <strong>Gợi ý:</strong> Liên hệ với quản trị viên để được cấp quyền truy cập các tool premium.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center pt-2">
          <Button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-understand-unauthorized"
          >
            Đã hiểu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
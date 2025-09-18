import { useState } from "react";
import { useToolPermission } from "@/hooks/use-tool-permission";
import UnauthorizedPopup from "@/components/unauthorized-popup";
import { Button } from "@/components/ui/button";
import { Shield, Lock } from "lucide-react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";

interface ToolPermissionGuardProps {
  toolId: string;
  toolName: string;
  children: React.ReactNode;
  className?: string;
}

export default function ToolPermissionGuard({ 
  toolId, 
  toolName, 
  children,
  className = ""
}: ToolPermissionGuardProps) {
  const [showUnauthorizedPopup, setShowUnauthorizedPopup] = useState(false);
  const { hasAccess, isLoading, isLoggedIn } = useToolPermission(toolId);

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show login prompt WITH header
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageNavigation 
            breadcrumbItems={[{ label: toolName }]}
            backLink="/"
          />
          <div className={`flex items-center justify-center py-12 ${className}`}>
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Yêu cầu đăng nhập
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Bạn cần đăng nhập để sử dụng {toolName}.
              </p>
              <Button
                onClick={() => {
                  // Trigger login modal through URL or context
                  window.location.href = "/?login=true";
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-login-required"
              >
                Đăng nhập
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If logged in but no access, show unauthorized button/content WITH header
  if (isLoggedIn && !hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageNavigation 
            breadcrumbItems={[{ label: toolName }]}
            backLink="/"
          />
          <div className={`flex items-center justify-center py-12 ${className}`}>
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Không có quyền truy cập
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Bạn chưa có quyền sử dụng {toolName}.
              </p>
              <Button
                onClick={() => setShowUnauthorizedPopup(true)}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                data-testid={`button-show-unauthorized-${toolId}`}
              >
                <Shield className="w-4 h-4 mr-2" />
                Xem chi tiết
              </Button>
            </div>
          </div>
        </main>
        
        <UnauthorizedPopup
          isOpen={showUnauthorizedPopup}
          onClose={() => setShowUnauthorizedPopup(false)}
          toolName={toolName}
        />
      </div>
    );
  }

  // If has access, render the protected content
  return <>{children}</>;
}
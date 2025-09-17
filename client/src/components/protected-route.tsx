import { useAuth } from "@/contexts/auth-context";
import AdminLogin from "@/components/admin-login";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return <AdminLogin />;
  }

  // Render protected content for authenticated user
  return <>{children}</>;
}
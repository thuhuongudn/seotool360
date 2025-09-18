import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

interface ToolPermission {
  hasAccess: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
}

export function useToolPermission(toolId: string): ToolPermission {
  const { user } = useAuth();
  
  // Query to check if user has access to this specific tool
  const { data: userToolAccess, isLoading } = useQuery({
    queryKey: [`/api/user/tool-access/${toolId}`],
    enabled: !!user?.id && !!toolId,
  });

  // If not logged in, they don't have access to premium tools
  if (!user?.id) {
    return {
      hasAccess: false,
      isLoading: false,
      isLoggedIn: false,
    };
  }

  // If loading, return loading state
  if (isLoading) {
    return {
      hasAccess: false,
      isLoading: true,
      isLoggedIn: true,
    };
  }

  // Check if user has access to this tool
  const hasAccess = Array.isArray(userToolAccess) && userToolAccess.some((access: any) => access.toolId === toolId);

  return {
    hasAccess,
    isLoading: false,
    isLoggedIn: true,
  };
}
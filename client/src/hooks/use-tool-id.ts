import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

export function useToolId(toolName: string): string | undefined {
  const { user, isAdmin } = useAuth();
  const isLoggedIn = !!user?.id;
  const userIsAdmin = isAdmin();

  const endpoint = userIsAdmin ? '/api/admin/seo-tools' : '/api/seo-tools';

  const { data: tools } = useQuery({
    queryKey: [endpoint],
    enabled: userIsAdmin ? isLoggedIn : true,
  });

  if (!tools || !Array.isArray(tools)) {
    return undefined;
  }

  const tool = tools.find((t: any) => t.name === toolName);
  return tool?.id;
}

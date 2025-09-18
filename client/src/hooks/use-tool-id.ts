import { useQuery } from "@tanstack/react-query";

export function useToolId(toolName: string): string | undefined {
  const { data: tools } = useQuery({
    queryKey: ['/api/seo-tools'],
  });

  if (!tools || !Array.isArray(tools)) {
    return undefined;
  }

  const tool = tools.find((t: any) => t.name === toolName);
  return tool?.id;
}
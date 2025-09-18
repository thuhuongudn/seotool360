import { QueryClient, QueryFunction } from "@tanstack/react-query";
import supabase from "@/lib/supabase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper function to get auth token from Supabase session with retry mechanism
async function getAccessToken(retryCount = 0): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    const token = session?.access_token || null;
    
    console.log('getAccessToken - session:', { 
      hasSession: !!session, 
      hasToken: !!token, 
      tokenLength: token?.length || 0,
      retryCount,
      error 
    });
    
    // If no token and we haven't retried, wait and try again
    if (!token && retryCount === 0) {
      console.log('getAccessToken - no token found, retrying with fresh session...');
      await new Promise(resolve => setTimeout(resolve, 100));
      return getAccessToken(1);
    }
    
    // Add stability delay for successful token retrieval
    if (token) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  // Add auth header for ALL internal API routes
  if (url.includes('/api/')) {
    const token = await getAccessToken();
    console.log('apiRequest - protected route:', { url, hasToken: !!token });
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Retry once with fresh token on 401
  if (res.status === 401 && url.includes('/api/')) {
    console.log('apiRequest - got 401, retrying with fresh token...');
    const freshToken = await getAccessToken(1);
    if (freshToken) {
      headers.Authorization = `Bearer ${freshToken}`;
      res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const headers: Record<string, string> = {};

    // Add auth header for ALL internal API routes
    if (url.includes('/api/')) {
      const token = await getAccessToken();
      console.log('getQueryFn - protected route:', { 
        url, 
        hasToken: !!token,
        willAddHeader: !!token
      });
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        console.log('getQueryFn - auth header added successfully');
      } else {
        console.warn('getQueryFn - no token available, request will fail with 401');
      }
    }

    let res = await fetch(url, {
      headers,
      credentials: "include",
    });

    // Retry once with fresh token on 401
    if (res.status === 401 && url.includes('/api/')) {
      console.log('getQueryFn - got 401, retrying with fresh token...');
      const freshToken = await getAccessToken(1);
      if (freshToken) {
        headers.Authorization = `Bearer ${freshToken}`;
        res = await fetch(url, {
          headers,
          credentials: "include",
        });
      }
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes instead of Infinity
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import supabase from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";

interface User {
  id: string;
  email?: string;
  profile?: {
    userId: string;
    username: string;
    role: string;
    isActive: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hadSessionRef = useRef(false);
  const authInProgressRef = useRef(false);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          hadSessionRef.current = true;
          // Try to authenticate with session, but don't block on failure
          try {
            await handleAuthSuccess(session.user, session.access_token);
          } catch (authError) {
            // If auth fails (expired token), silently clear and continue
            console.log('Session auth failed during init, clearing auth state');
            setUser(null);
            setToken(null);
            hadSessionRef.current = false;
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        // Always set loading to false, even if auth failed
        setIsLoading(false);
      }
    };

    initAuth();

    // Unsubscribe previous listener if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      console.log('Auth state change:', event, 'session:', !!session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        hadSessionRef.current = true;
        await handleAuthSuccess(session.user, session.access_token);
      } else if (event === 'SIGNED_OUT' && hadSessionRef.current) {
        // Only handle SIGNED_OUT if we actually had a session before
        hadSessionRef.current = false;
        handleLogout();
      }
      // Ignore INITIAL_SESSION and other events to prevent clearing auth state during HMR
    });

    unsubscribeRef.current = subscription.unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const handleAuthSuccess = async (supabaseUser: any, accessToken: string) => {
    try {
      console.log('=== handleAuthSuccess START ===', { 
        userId: supabaseUser.id, 
        hasToken: !!accessToken,
        tokenLength: accessToken?.length,
        currentUser: user?.id,
        authInProgress: authInProgressRef.current
      });
      
      // Prevent duplicate auth success calls
      if (user?.id === supabaseUser.id && token === accessToken) {
        console.log('Already authenticated, skipping duplicate auth success');
        return;
      }

      // Prevent concurrent auth requests
      if (authInProgressRef.current) {
        console.log('Auth already in progress, skipping duplicate call');
        return;
      }
      authInProgressRef.current = true;

      // Add a small delay to ensure token is properly set in Supabase session
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Calling /api/users/me with authenticated token');
      
      // Get user profile from our API
      const response = await fetch(`/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response from /api/users/me:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers)
      });

      if (response.ok) {
        const profile = await response.json();
        
        // Allow both admin and member roles for authentication
        if (!profile.role || (profile.role !== 'admin' && profile.role !== 'member')) {
          toast({
            title: "Truy cập bị từ chối",
            description: "Tài khoản không được phép truy cập hệ thống.",
            variant: "destructive"
          });
          await supabase.auth.signOut();
          return;
        }

        // Set user and token
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          profile
        });
        setToken(accessToken);

        toast({
          title: "Đăng nhập thành công!",
          description: `Chào mừng ${profile.username || supabaseUser.email}`,
        });

        // Handle redirect after successful login
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect');
        
        if (redirectTo) {
          // Clear the redirect parameter and navigate to intended destination
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // SECURITY: Only allow relative paths starting with '/' to prevent open redirect attacks
          if (redirectTo.startsWith('/') && !redirectTo.includes('://') && !redirectTo.startsWith('//')) {
            setTimeout(() => {
              window.location.href = redirectTo;
            }, 1000); // Small delay to let user see success message
          }
          // If redirect is invalid/malicious, ignore it and stay on current page
        } else {
          // ROLE-BASED REDIRECT: If member is at /admin, redirect to home
          const currentPath = window.location.pathname;
          const isAtAdminPage = currentPath === '/admin';
          const isMember = profile.role === 'member';
          
          if (isAtAdminPage && isMember) {
            console.log('Member logged in at /admin, redirecting to home');
            setTimeout(() => {
              window.location.href = '/';
            }, 1000); // Small delay to let user see success message
          }
        }
      } else {
        // Handle 401 (expired token) silently - don't show error toast for homepage users
        if (response.status === 401) {
          console.log('Token expired, silently clearing auth state');
          await supabase.auth.signOut();
          return; // Silent exit - no error toast for expired tokens
        }
        throw new Error('Không thể tải thông tin profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // Only show error toast for actual login attempts, not expired token cleanup
      // Check if this is during active login (when user clicked login button)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (authInProgressRef.current && !errorMessage?.includes('401')) {
        toast({
          title: "Lỗi đăng nhập",
          description: "Không thể xác thực thông tin người dùng.",
          variant: "destructive"
        });
      }
      await supabase.auth.signOut();
    } finally {
      authInProgressRef.current = false;
    }
  };

  const handleLogout = () => {
    console.log('Handling logout');
    
    // Clear all cached queries to prevent permission leakage
    try {
      console.log('Starting comprehensive cache invalidation during logout');
      queryClient.removeQueries();
      queryClient.clear();
      // Specifically invalidate admin and user permission queries
      queryClient.removeQueries({ queryKey: ['/api/admin'] });
      queryClient.removeQueries({ queryKey: ['/api/user'] });
      queryClient.removeQueries({ queryKey: ['/api/tools'] });
      console.log('Comprehensive cache invalidation completed');
    } catch (cacheError) {
      console.warn('Cache clearing error during logout:', cacheError);
    }
    
    setUser(null);
    setToken(null);
    hadSessionRef.current = false;
    
    // Navigate to homepage
    setLocation('/');
    
    // Show dismissible login modal
    setTimeout(() => {
      setShowLoginModal(true);
    }, 500); // Small delay to ensure navigation completes
    
    toast({
      title: "Đăng xuất thành công", 
      description: "Bạn đã đăng xuất khỏi hệ thống.",
    });
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Trim inputs and normalize email
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword
      });

      if (error) {
        // Enhanced error mapping for better user guidance
        let errorMessage = "Email hoặc mật khẩu không chính xác";

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại thông tin đăng nhập.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Email chưa được xác nhận. Vui lòng kiểm tra email để xác nhận tài khoản.";
        } else if (error.message.includes('too many requests')) {
          errorMessage = "Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau ít phút.";
        } else if (error.message.includes('signup is disabled')) {
          errorMessage = "Đăng ký tài khoản đã bị tắt. Vui lòng liên hệ quản trị viên.";
        }

        toast({
          title: "Lỗi đăng nhập",
          description: errorMessage,
          variant: "destructive"
        });
        return false;
      }

      if (data.user && data.session) {
        await handleAuthSuccess(data.user, data.session.access_token);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Lỗi kết nối",
        description: "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Determine correct redirect URL based on environment
      const getRedirectUrl = () => {
        const origin = window.location.origin;
        // For production, ensure we use the correct domain
        if (origin.includes('seotool360.vn')) {
          return `${origin}/auth/callback`;
        }
        // For localhost development
        if (origin.includes('localhost')) {
          return `${origin}/auth/callback`;
        }
        // Fallback to current origin
        return `${origin}/auth/callback`;
      };

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl()
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        toast({
          title: "Lỗi đăng nhập Google",
          description: "Không thể đăng nhập bằng Google. Vui lòng thử lại.",
          variant: "destructive"
        });
      }

      // Note: The redirect will handle the rest of the authentication flow
      // The actual user auth success will be handled by the auth state change listener
    } catch (error) {
      console.error('Google login error:', error);
      toast({
        title: "Lỗi kết nối",
        description: "Không thể kết nối đến Google. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Initiating logout');
      // Clear all TanStack Query cache before logout to prevent sticky permissions
      queryClient.clear();
      console.log('Pre-logout query cache cleared');
      await supabase.auth.signOut();
      handleLogout();
      // Force additional cache clear after logout
      queryClient.clear();
      console.log('Post-logout cache clear completed');
    } catch (error) {
      console.error('Logout error:', error);
      handleLogout(); // Force logout even if API call fails
    }
  };

  const isAdmin = (): boolean => {
    return user?.profile?.role === 'admin' && user?.profile?.isActive === true;
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    showLoginModal,
    setShowLoginModal,
    login,
    loginWithGoogle,
    logout,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
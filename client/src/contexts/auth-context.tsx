import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import supabase from "@/lib/supabase";

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
          await handleAuthSuccess(session.user, session.access_token);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
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
        }
      } else {
        throw new Error('Không thể tải thông tin profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Lỗi đăng nhập",
        description: "Không thể xác thực thông tin người dùng.",
        variant: "destructive"
      });
      await supabase.auth.signOut();
    } finally {
      authInProgressRef.current = false;
    }
  };

  const handleLogout = () => {
    console.log('Handling logout');
    setUser(null);
    setToken(null);
    
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
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          title: "Lỗi đăng nhập",
          description: error.message === 'Invalid login credentials' 
            ? "Email hoặc mật khẩu không chính xác"
            : error.message,
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

  const logout = async () => {
    try {
      console.log('Initiating logout');
      await supabase.auth.signOut();
      handleLogout();
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
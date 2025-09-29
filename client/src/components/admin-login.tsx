import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { Eye, EyeOff, LogIn, Loader2, KeyRound } from "lucide-react";
import logoUrl from "@assets/logo-seotool-360-transparent_1758077866087.png";
import supabase from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import GoogleSigninButton from "@/components/auth/google-signin-button";

interface AdminLoginProps {
  isModal?: boolean;
  loginType?: 'admin' | 'member';
}

export default function AdminLogin({ isModal = false, loginType = 'admin' }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { login, showLoginModal, setShowLoginModal } = useAuth();
  const { toast } = useToast();

  // Debug logging for testing
  const isButtonDisabled = isLoggingIn || !email || !password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }

    setIsLoggingIn(true);
    const success = await login(email, password);
    if (success && isModal) {
      setShowLoginModal(false); // Close modal on successful login
    }
    setIsLoggingIn(false);
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      toast({
        title: "Vui lòng nhập email",
        description: "Nhập địa chỉ email để gửi link đặt lại mật khẩu.",
        variant: "destructive"
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        toast({
          title: "Lỗi gửi email",
          description: "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Đã gửi email",
          description: "Kiểm tra email của bạn để đặt lại mật khẩu.",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi kết nối",
        description: "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const loginForm = (
    <Card className={`w-full max-w-md ${!isModal ? 'shadow-xl' : 'border-0'}`}>
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <img 
            src={logoUrl} 
            alt="SEOTOOL360 Logo" 
            className="w-16 h-16 object-contain"
          />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
          {loginType === 'admin' ? 'Đăng nhập Admin' : 'Đăng nhập'}
        </CardTitle>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          {loginType === 'admin' 
            ? 'Truy cập trang quản trị SEOTOOL360'
            : 'Đăng nhập để sử dụng công cụ SEO premium'
          }
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={loginType === 'admin' ? 'admin@seotool360.com' : 'your@email.com'}
              required
              disabled={isLoggingIn}
              className="w-full"
              data-testid={loginType === 'admin' ? 'input-admin-email' : 'input-member-email'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Mật khẩu
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                disabled={isLoggingIn}
                className="pr-10"
                data-testid={loginType === 'admin' ? 'input-admin-password' : 'input-member-password'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoggingIn}
                data-testid={loginType === 'admin' ? 'button-toggle-admin-password' : 'button-toggle-member-password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isButtonDisabled}
            data-testid={loginType === 'admin' ? 'button-admin-login' : 'button-member-login'}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Đăng nhập
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Hoặc
              </span>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <GoogleSigninButton
            disabled={isLoggingIn}
            data-testid={loginType === 'admin' ? 'button-admin-google-login' : 'button-member-google-login'}
          />
          
          {/* Password reset option */}
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePasswordReset}
              disabled={isResettingPassword || !email.trim()}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300"
              data-testid={loginType === 'admin' ? 'button-admin-reset-password' : 'button-member-reset-password'}
            >
              {isResettingPassword ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Đang gửi email...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-3 w-3" />
                  Quên mật khẩu?
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  if (isModal) {
    return (
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="max-w-md p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Đăng nhập</DialogTitle>
          </DialogHeader>
          {loginForm}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      {loginForm}
    </div>
  );
}
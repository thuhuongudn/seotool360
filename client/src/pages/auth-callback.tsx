import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import supabase from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý đăng nhập...');
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Đăng nhập thất bại');

          toast({
            title: "Lỗi đăng nhập",
            description: errorDescription || "Đăng nhập Google thất bại. Vui lòng thử lại.",
            variant: "destructive"
          });

          // Redirect to home after showing error
          setTimeout(() => {
            setLocation('/');
          }, 3000);
          return;
        }

        if (accessToken) {
          // Set the session manually (fallback for edge cases)
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (sessionError) {
            throw sessionError;
          }

          setStatus('success');
          setMessage('Đăng nhập thành công! Đang chuyển hướng...');

          toast({
            title: "Đăng nhập thành công!",
            description: "Chào mừng bạn đến với SEOTOOL360.",
          });

          // Redirect to dashboard or intended page
          setTimeout(() => {
            const redirectTo = sessionStorage.getItem('oauth_redirect_to') || '/dashboard';
            sessionStorage.removeItem('oauth_redirect_to');
            setLocation(redirectTo);
          }, 2000);
        } else {
          // Let Supabase handle the session automatically
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            setStatus('success');
            setMessage('Đăng nhập thành công! Đang chuyển hướng...');

            toast({
              title: "Đăng nhập thành công!",
              description: "Chào mừng bạn đến với SEOTOOL360.",
            });

            setTimeout(() => {
              const redirectTo = sessionStorage.getItem('oauth_redirect_to') || '/dashboard';
              sessionStorage.removeItem('oauth_redirect_to');
              setLocation(redirectTo);
            }, 2000);
          } else {
            throw new Error('Không thể xác thực phiên đăng nhập');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Lỗi xử lý đăng nhập. Vui lòng thử lại.');

        toast({
          title: "Lỗi đăng nhập",
          description: "Không thể hoàn tất đăng nhập. Vui lòng thử lại.",
          variant: "destructive"
        });

        setTimeout(() => {
          setLocation('/');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [setLocation, toast]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle2 className="h-8 w-8 text-green-600" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-600" />;
      default:
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          {getIcon()}
          <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
            {status === 'loading' && 'Đang xử lý đăng nhập'}
            {status === 'success' && 'Đăng nhập thành công'}
            {status === 'error' && 'Đăng nhập thất bại'}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300">
            {message}
          </p>
          {status === 'loading' && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Vui lòng chờ trong giây lát...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
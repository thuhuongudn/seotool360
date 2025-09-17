import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Key,
  Save,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.profile?.username || '',
    email: user?.email || '',
    notifications: true,
    emailAlerts: true,
    weeklyReport: false
  });

  const handleSaveChanges = () => {
    // TODO: Implement API call to update user settings
    toast({
      title: "Cài đặt đã được lưu!",
      description: "Thông tin tài khoản của bạn đã được cập nhật.",
    });
    setIsEditing(false);
  };

  const handleLogoutEverywhere = () => {
    // TODO: Implement logout from all devices
    toast({
      title: "Đăng xuất khỏi tất cả thiết bị",
      description: "Bạn sẽ cần đăng nhập lại trên các thiết bị khác.",
      variant: "destructive"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8" data-testid="section-header">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <SettingsIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-settings-title">
                Cài đặt tài khoản
              </h1>
              <p className="text-lg text-muted-foreground" data-testid="text-settings-description">
                Quản lý thông tin cá nhân và tùy chọn tài khoản của bạn
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Profile Information */}
          <Card data-testid="card-profile">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Thông tin cá nhân</span>
              </CardTitle>
              <CardDescription>
                Cập nhật thông tin cá nhân và cài đặt hiển thị
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-bold">
                    {user?.profile?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="capitalize">
                      {user?.profile?.role || 'member'}
                    </Badge>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Được kích hoạt
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tham gia từ: {new Date().toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Tên người dùng</Label>
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!isEditing}
                    data-testid="input-username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} data-testid="button-edit-profile">
                    Chỉnh sửa
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                      data-testid="button-cancel-edit"
                    >
                      Hủy
                    </Button>
                    <Button onClick={handleSaveChanges} data-testid="button-save-changes">
                      <Save className="w-4 h-4 mr-2" />
                      Lưu thay đổi
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card data-testid="card-notifications">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Cài đặt thông báo</span>
              </CardTitle>
              <CardDescription>
                Quản lý cách bạn nhận thông báo và cảnh báo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Thông báo trong ứng dụng</Label>
                  <p className="text-sm text-muted-foreground">
                    Nhận thông báo về hoạt động và cập nhật
                  </p>
                </div>
                <Switch 
                  checked={formData.notifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, notifications: checked })}
                  data-testid="switch-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Email cảnh báo</Label>
                  <p className="text-sm text-muted-foreground">
                    Nhận email về các vấn đề quan trọng
                  </p>
                </div>
                <Switch 
                  checked={formData.emailAlerts}
                  onCheckedChange={(checked) => setFormData({ ...formData, emailAlerts: checked })}
                  data-testid="switch-email-alerts"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Báo cáo hàng tuần</Label>
                  <p className="text-sm text-muted-foreground">
                    Nhận tóm tắt hoạt động hàng tuần qua email
                  </p>
                </div>
                <Switch 
                  checked={formData.weeklyReport}
                  onCheckedChange={(checked) => setFormData({ ...formData, weeklyReport: checked })}
                  data-testid="switch-weekly-report"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card data-testid="card-security">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Bảo mật & Quyền riêng tư</span>
              </CardTitle>
              <CardDescription>
                Quản lý cài đặt bảo mật và quyền riêng tư tài khoản
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start" data-testid="button-change-password">
                  <Key className="w-4 h-4 mr-2" />
                  Đổi mật khẩu
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleLogoutEverywhere}
                  data-testid="button-logout-everywhere"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Đăng xuất khỏi tất cả thiết bị
                </Button>
              </div>

              <Separator />

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-900 dark:text-red-100">
                      Vùng nguy hiểm
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-200">
                      Các hành động trong phần này không thể hoàn tác. Vui lòng cẩn thận.
                    </p>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        if (confirm("Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác!")) {
                          toast({
                            title: "Tính năng chưa có sẵn",
                            description: "Vui lòng liên hệ admin để xóa tài khoản.",
                            variant: "destructive"
                          });
                        }
                      }}
                      data-testid="button-delete-account"
                    >
                      Xóa tài khoản
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
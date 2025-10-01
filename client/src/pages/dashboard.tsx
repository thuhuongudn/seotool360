import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Settings,
  Activity,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Zap,
  Construction,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import ToolGrid from "@/components/tool-grid";
import { TokenWidget } from "@/components/token-widget";
import { StatusBanner } from "@/components/status-banner";
import { fetchVisibleTools } from "@/lib/api-client";

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} phút trước`;
  } else if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  } else {
    return `${diffDays} ngày trước`;
  }
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  // Fetch user's visible tools count
  const { data: tools } = useQuery({
    queryKey: ['visible-tools'],
    queryFn: fetchVisibleTools,
    enabled: !!user,
  });

  // Fetch recent token logs (admin only)
  // Use queryKey array for automatic auth header injection
  const { data: recentLogs } = useQuery({
    queryKey: ['/api/admin/token-usage-logs?limit=5'],
    enabled: !!user && isAdmin(),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        <StatusBanner />

        {/* User Welcome Section */}
        <div className="mb-8" data-testid="section-welcome">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-welcome-title">
                Xin chào, {user?.profile?.username || user?.email}!
              </h1>
              <p className="text-lg text-muted-foreground" data-testid="text-welcome-description">
                Chào mừng bạn đến với dashboard SEOTOOL360
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="secondary" className="flex items-center space-x-2">
              <span className="capitalize">{user?.profile?.role || 'member'}</span>
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Tài khoản được kích hoạt</span>
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" data-testid="section-stats">
          {/* Token Widget Card */}
          <TokenWidget />

          {/* Tools có quyền truy cập */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tools được sử dụng</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tools?.filter(t => t.has_access).length || 0}</div>
              <p className="text-xs text-muted-foreground">Tổng số tools có quyền truy cập</p>
            </CardContent>
          </Card>

          {/* Thời gian sử dụng - Tính năng đang phát triển */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Thời gian sử dụng</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <p className="text-xs text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                <Construction className="h-3 w-3" />
                Tính năng đang phát triển
              </p>
            </CardContent>
          </Card>

          {/* Điểm hiệu suất - Tính năng đang phát triển */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Điểm hiệu suất</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <p className="text-xs text-yellow-600 dark:text-yellow-500 flex items-center gap-1">
                <Construction className="h-3 w-3" />
                Tính năng đang phát triển
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8" data-testid="section-quick-actions">
          <h2 className="text-2xl font-bold text-foreground mb-6">Hành động nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Cài đặt tài khoản</span>
                </CardTitle>
                <CardDescription>
                  Quản lý thông tin cá nhân và tùy chọn tài khoản
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings">
                  <Button className="w-full" data-testid="button-go-to-settings">
                    Đi đến cài đặt
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Tools phổ biến</span>
                </CardTitle>
                <CardDescription>
                  Truy cập nhanh các công cụ được sử dụng nhiều nhất
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/">
                  <Button variant="outline" className="w-full" data-testid="button-popular-tools">
                    Xem tất cả tools
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {isAdmin() && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Quản trị hệ thống</span>
                  </CardTitle>
                  <CardDescription>
                    Quản lý users, tools và cấu hình hệ thống
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/admin">
                    <Button variant="destructive" className="w-full" data-testid="button-admin-panel">
                      Mở trang Admin
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Activity - Admin Only */}
        {isAdmin() && (
          <div className="mb-8" data-testid="section-recent-activity">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Hoạt động gần đây</h2>
              <Link href="/admin/token-logs">
                <Button variant="outline" size="sm">
                  Xem tất cả
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <Card>
              <CardContent className="pt-6">
                {!recentLogs?.data || recentLogs.data.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Chưa có hoạt động nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentLogs.data.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate">
                                {log.username || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">sử dụng</span>
                              <span className="text-sm font-medium truncate">
                                {log.tool_title || log.tool_name}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Token: {log.consumed}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity - Member (Commented for future enhancement) */}
        {/*
        {!isAdmin() && (
          <div className="mb-8" data-testid="section-recent-activity">
            <h2 className="text-2xl font-bold text-foreground mb-6">Hoạt động gần đây</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[
                    {
                      action: "Sử dụng Topical Map",
                      time: "2 giờ trước",
                      status: "completed"
                    },
                    {
                      action: "Tạo nội dung Social Media",
                      time: "1 ngày trước",
                      status: "completed"
                    },
                    {
                      action: "Kiểm tra Google Index",
                      time: "3 ngày trước",
                      status: "completed"
                    }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">{activity.action}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        */}

        {/* Available Tools - Show subset */}
        <div data-testid="section-available-tools">
          <h2 className="text-2xl font-bold text-foreground mb-6">Công cụ có sẵn</h2>
          <ToolGrid showAllTools={false} showFilters={false} />
          <div className="text-center mt-6">
            <Link href="/">
              <Button variant="outline" size="lg" data-testid="button-view-all-tools">
                Xem tất cả công cụ
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
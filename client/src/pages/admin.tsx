import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Settings, 
  Eye, 
  EyeOff, 
  Users, 
  Shield, 
  FileText,
  LayoutDashboard,
  UserCheck,
  UserX,
  Edit3,
  Key,
  Calendar,
  Activity
} from "lucide-react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SeoTool } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";

// User Profile interface for admin management (matches backend Profile schema)
interface UserProfile {
  userId: string;
  username: string;
  role: 'admin' | 'member';
  isActive: boolean;
  createdAt: string;
  // Note: email is not stored in profiles table, only in auth.users
}

// Users API response interface
interface UsersResponse {
  profiles: UserProfile[];
  total: number;
}

// Audit Log interface
interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  subjectUserId?: string;
  metadata: any;
  createdAt: string;
}

// Audit Logs API response interface
interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  // Fetch all tools for admin (including pending)
  const { data: allTools, isLoading: toolsLoading, error: toolsError } = useQuery({
    queryKey: ['/api/admin/seo-tools'],
    enabled: !!user && isAdmin(),
  });
  
  // Fetch all users for user management
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users'],
    enabled: !!user && isAdmin() && activeTab === "users",
  });
  
  // Fetch audit logs
  const { data: auditLogs, isLoading: logsLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['/api/admin/audit-logs'],
    enabled: !!user && isAdmin() && activeTab === "audit",
  });

  // Tool status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ toolId, status }: { toolId: string; status: 'active' | 'pending' }) => {
      return await apiRequest("PATCH", `/api/admin/seo-tools/${toolId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/seo-tools'] });
      toast({
        title: "Cập nhật thành công!",
        description: "Trạng thái công cụ đã được cập nhật.",
      });
    },
    onError: (error) => {
      console.error("Error updating tool status:", error);
      toast({
        title: "Lỗi cập nhật",
        description: "Không thể cập nhật trạng thái công cụ. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });
  
  // User status toggle mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/status`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Cập nhật thành công!",
        description: "Trạng thái người dùng đã được cập nhật.",
      });
    },
    onError: (error) => {
      console.error('Status update error:', error);
      toast({
        title: "Lỗi cập nhật",
        description: "Không thể cập nhật trạng thái người dùng.",
        variant: "destructive",
      });
    },
  });
  
  // User role update mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}`, { role });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Cập nhật thành công!",
        description: "Vai trò người dùng đã được cập nhật.",
      });
    },
    onError: (error) => {
      console.error('Role update error:', error);
      toast({
        title: "Lỗi cập nhật",
        description: "Không thể cập nhật vai trò người dùng.",
        variant: "destructive",
      });
    },
  });


  // Filter tools based on search and status
  const filteredTools = useMemo(() => {
    if (!allTools || !Array.isArray(allTools)) return [];

    let filtered = allTools;

    // Filter by status
    if (filterStatus === "active") {
      filtered = filtered.filter(tool => tool.status === "active");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tool => 
        tool.title.toLowerCase().includes(query) ||
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allTools, searchQuery, filterStatus]);
  
  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!usersData?.profiles || !Array.isArray(usersData.profiles)) return [];

    let filtered = usersData.profiles;

    // Filter by search query (only username and role since email is not in profiles)
    if (userSearchQuery.trim()) {
      const query = userSearchQuery.toLowerCase();
      filtered = filtered.filter((userProfile: UserProfile) => 
        userProfile.username.toLowerCase().includes(query) ||
        userProfile.role.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [usersData, userSearchQuery]);

  const handleStatusToggle = (toolId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "pending" : "active";
    updateStatusMutation.mutate({ toolId, status: newStatus });
  };
  
  const handleUserStatusToggle = (userId: string, currentStatus: boolean) => {
    toggleUserStatusMutation.mutate({ userId, isActive: !currentStatus });
  };
  
  const handleUserRoleChange = (userId: string, newRole: string) => {
    updateUserRoleMutation.mutate({ userId, role: newRole });
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        Active
      </Badge>
    ) : (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
        <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
        Pending
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation 
          breadcrumbItems={[
            { label: "Admin Console" }
          ]}
          backLink="/"
        />

        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
              data-testid="heading-admin-title"
            >
              <span className="text-blue-600">Admin Console</span>
            </h1>
            <p
              className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
              data-testid="text-admin-description"
            >
              Quản lý hệ thống toàn diện - người dùng, quyền hạn, công cụ và nhật ký hoạt động
            </p>
          </div>

          {/* Admin Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">
                <Users className="w-4 h-4 mr-2" />
                Người dùng
              </TabsTrigger>
              <TabsTrigger value="tools" data-testid="tab-tools">
                <Settings className="w-4 h-4 mr-2" />
                Công cụ
              </TabsTrigger>
              <TabsTrigger value="audit" data-testid="tab-audit">
                <FileText className="w-4 h-4 mr-2" />
                Nhật ký
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-users">
                      {usersData?.total || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {usersData?.profiles?.filter((u: UserProfile) => u.isActive).length || 0} đang hoạt động
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Công cụ hoạt động</CardTitle>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-active-tools">
                      {(allTools && Array.isArray(allTools)) ? allTools.filter((tool: SeoTool) => tool.status === "active").length : 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Trên tổng {(allTools && Array.isArray(allTools)) ? allTools.length : 0} công cụ
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Admin</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-admins">
                      {usersData?.profiles?.filter((u: UserProfile) => u.role === 'admin').length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Quản trị viên
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Hoạt động gần đây</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-recent-activity">
                      {auditLogs?.logs?.length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hôm nay
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Management Tab */}
            <TabsContent value="users" className="space-y-6">
              {/* User Search */}
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm người dùng..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10 pr-4"
                    data-testid="input-search-users"
                  />
                </div>
              </div>
              
              {usersError ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Users className="mx-auto h-12 w-12 text-red-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Không thể tải danh sách người dùng
                  </h3>
                </div>
              ) : usersLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Đang tải danh sách người dùng...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((userProfile: UserProfile) => (
                    <Card key={userProfile.userId} className="bg-white dark:bg-gray-800 shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="font-semibold text-xl text-gray-900 dark:text-white mb-1">
                                  {userProfile.username}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  ID: {userProfile.userId}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <Badge variant={userProfile.role === 'admin' ? 'default' : 'secondary'}>
                                {userProfile.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                              </Badge>
                              <span className={userProfile.isActive ? 'text-green-600' : 'text-red-600'}>
                                {userProfile.isActive ? 'Hoạt động' : 'Không hoạt động'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {/* Role Selector */}
                            <Select 
                              value={userProfile.role} 
                              onValueChange={(value) => handleUserRoleChange(userProfile.userId, value)}
                              disabled={updateUserRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Thành viên</SelectItem>
                                <SelectItem value="admin">Quản trị viên</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {/* Status Toggle */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                {userProfile.isActive ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                              </span>
                              <Switch
                                checked={userProfile.isActive}
                                onCheckedChange={() => handleUserStatusToggle(userProfile.userId, userProfile.isActive)}
                                disabled={toggleUserStatusMutation.isPending}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tools Management Tab */}
            <TabsContent value="tools" className="space-y-6">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm công cụ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4"
                    data-testid="input-search-tools"
                  />
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-48">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger data-testid="select-filter-status">
                      <SelectValue placeholder="Lọc theo trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="filter-all-tools">Tất cả công cụ</SelectItem>
                      <SelectItem value="active" data-testid="filter-active">Đang hoạt động</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {toolsError ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Settings className="mx-auto h-12 w-12 text-red-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Không thể tải danh sách công cụ
                  </h3>
                </div>
              ) : toolsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Đang tải danh sách công cụ...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery.trim() 
                        ? `Tìm thấy ${filteredTools.length} kết quả cho "${searchQuery}"`
                        : filterStatus === "active" 
                          ? `${filteredTools.length} công cụ đang hoạt động`
                          : `Tổng cộng ${filteredTools.length} công cụ`
                      }
                    </p>
                  </div>

                  <div className="space-y-4">
                    {filteredTools.map((tool: SeoTool) => (
                      <Card key={tool.id} className="bg-white dark:bg-gray-800 shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-3">
                                <div className={`w-12 h-12 ${tool.iconBgColor} rounded-lg flex items-center justify-center`}>
                                  <span className={`${tool.iconColor} font-semibold`}>
                                    {tool.icon.charAt(0)}
                                  </span>
                                </div>
                                
                                <div className="flex-1">
                                  <h3 className="font-semibold text-xl text-gray-900 dark:text-white mb-1">
                                    {tool.title}
                                  </h3>
                                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    {tool.description}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <span>📂 {tool.category}</span>
                                <span>🔧 {tool.name}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div>{getStatusBadge(tool.status)}</div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {tool.status === "active" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </span>
                                <Switch
                                  checked={tool.status === "active"}
                                  onCheckedChange={() => handleStatusToggle(tool.id, tool.status)}
                                  disabled={updateStatusMutation.isPending}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Audit Logs Tab */}
            <TabsContent value="audit" className="space-y-6">
              {logsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Đang tải nhật ký hoạt động...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Nhật ký hoạt động Admin</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Theo dõi tất cả hoạt động quản trị trong hệ thống
                    </p>
                  </div>

                  {auditLogs?.logs && auditLogs.logs.length > 0 ? (
                    auditLogs.logs.map((log: AuditLog) => (
                      <Card key={log.id} className="bg-white dark:bg-gray-800 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {log.action.replace('_', ' ').toUpperCase()}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {log.actorId}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {JSON.stringify(log.metadata, null, 2)}
                              </p>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(log.createdAt).toLocaleString('vi-VN')}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Chưa có hoạt động nào
                      </h3>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
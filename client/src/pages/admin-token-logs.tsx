import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar, Filter, BarChart3, Download, RefreshCw } from "lucide-react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

interface TokenUsageLog {
  id: string;
  user_id: string;
  tool_id: string;
  consumed: number;
  created_at: string;
  username: string;
  tool_name: string;
  tool_title: string;
}

interface TokenUsageStats {
  total: {
    total_requests: number;
    total_tokens_consumed: number;
    unique_users: number;
    unique_tools: number;
  };
  top_users: Array<{
    user_id: string;
    username: string;
    request_count: number;
    tokens_consumed: number;
  }>;
  top_tools: Array<{
    tool_id: string;
    tool_name: string;
    tool_title: string;
    request_count: number;
    tokens_consumed: number;
  }>;
}

interface UsersResponse {
  profiles: Array<{
    userId: string;
    username: string;
    role: 'admin' | 'member';
    isActive: boolean;
  }>;
  total: number;
}

interface AdminSeoTool {
  id: string;
  name: string;
  title: string;
}

async function fetchTokenUsageLogs(params: {
  userId?: string;
  toolId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params.userId) queryParams.set('userId', params.userId);
  if (params.toolId) queryParams.set('toolId', params.toolId);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());

  const response = await apiRequest('GET', `/api/admin/token-usage-logs?${queryParams}`);
  return response.json();
}

async function fetchTokenUsageStats(params: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params.userId) queryParams.set('userId', params.userId);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);

  const response = await apiRequest('GET', `/api/admin/token-usage-stats?${queryParams}`);
  return response.json();
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export default function AdminTokenLogsPage() {
  const { profile, isLoading: profileLoading, isAdmin } = useRequireAdmin();
  const [filters, setFilters] = useState({
    userId: '',
    toolId: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: usersData, isLoading: usersLoading } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users?limit=200'],
    enabled: isAdmin,
  });

  const { data: toolsData, isLoading: toolsLoading } = useQuery<AdminSeoTool[]>({
    queryKey: ['/api/admin/seo-tools'],
    enabled: isAdmin,
  });

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['token-usage-logs', filters, page],
    queryFn: () => fetchTokenUsageLogs({
      ...filters,
      limit,
      offset: page * limit,
    }),
    enabled: isAdmin,
  });

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['token-usage-stats', filters],
    queryFn: () => fetchTokenUsageStats({
      userId: filters.userId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    enabled: isAdmin,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleRefresh = () => {
    refetchLogs();
    refetchStats();
  };

  const handleClearFilters = () => {
    setFilters({
      userId: '',
      toolId: '',
      startDate: '',
      endDate: '',
    });
    setPage(0);
  };

  const handleExport = () => {
    // Convert logs to CSV
    if (!logsData?.data) return;

    const headers = ['Time', 'User', 'Tool', 'Tokens Consumed'];
    const rows = logsData.data.map((log: TokenUsageLog) => [
      formatDateTime(log.created_at),
      log.username || log.user_id,
      log.tool_title || log.tool_name,
      log.consumed,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `token-usage-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (profileLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  const logs: TokenUsageLog[] = logsData?.data || [];
  const pagination = logsData?.pagination || { limit, offset: 0, total: 0 };
  const stats: TokenUsageStats = statsData?.stats || {
    total: { total_requests: 0, total_tokens_consumed: 0, unique_users: 0, unique_tools: 0 },
    top_users: [],
    top_tools: [],
  };

  const totalRequests = Number(stats.total?.total_requests ?? 0);
  const totalTokens = Number(stats.total?.total_tokens_consumed ?? 0);
  const uniqueUsers = Number(stats.total?.unique_users ?? 0);
  const uniqueTools = Number(stats.total?.unique_tools ?? 0);

  const topUsers = stats.top_users ?? [];
  const topTools = stats.top_tools ?? [];
  const userOptions = usersData?.profiles ?? [];
  const toolOptions = toolsData ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageNavigation
        breadcrumbItems={[
          { label: 'Admin', href: '/admin' },
          { label: 'Token Logs' },
        ]}
        backLink="/admin"
      />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Token Usage Logs</h1>
            <p className="text-muted-foreground mt-2">
              Chi tiết log sử dụng token và thống kê
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm" disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="logs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>User</Label>
                    <Select
                      value={filters.userId || 'all'}
                      onValueChange={(value) => handleFilterChange('userId', value === 'all' ? '' : value)}
                      disabled={usersLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={usersLoading ? 'Loading users…' : 'All users'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                        {userOptions.map((user) => (
                          <SelectItem key={user.userId} value={user.userId}>
                            {user.username} ({user.userId.slice(0, 6)}…)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tool</Label>
                    <Select
                      value={filters.toolId || 'all'}
                      onValueChange={(value) => handleFilterChange('toolId', value === 'all' ? '' : value)}
                      disabled={toolsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={toolsLoading ? 'Loading tools…' : 'All tools'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All tools</SelectItem>
                        {toolOptions.map((tool) => (
                          <SelectItem key={tool.id} value={tool.id}>
                            {tool.title || tool.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleClearFilters} variant="outline" size="sm">
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Logs</CardTitle>
                <CardDescription>
                  Total: {pagination.total} logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No logs found
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Tool</TableHead>
                          <TableHead className="text-right">Tokens</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {formatDateTime(log.created_at)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{log.username || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {log.user_id.substring(0, 8)}...
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{log.tool_title || log.tool_name}</div>
                                <div className="text-xs text-muted-foreground">{log.tool_name}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{log.consumed}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {pagination.offset + 1} to {Math.min(pagination.offset + limit, pagination.total)} of {pagination.total}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setPage(Math.max(0, page - 1))}
                          disabled={page === 0}
                          variant="outline"
                          size="sm"
                        >
                          Previous
                        </Button>
                        <Button
                          onClick={() => setPage(page + 1)}
                          disabled={(page + 1) * limit >= pagination.total}
                          variant="outline"
                          size="sm"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{uniqueUsers.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Unique Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{uniqueTools.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Users
                  </CardTitle>
                  <CardDescription>Top 10 users by token consumption</CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Requests</TableHead>
                          <TableHead className="text-right">Tokens</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topUsers.map((user, idx) => (
                          <TableRow key={user.user_id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                <span className="font-medium">{user.username || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{user.request_count}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{user.tokens_consumed}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Top Tools */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Tools
                  </CardTitle>
                  <CardDescription>Top 10 tools by token consumption</CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tool</TableHead>
                          <TableHead className="text-right">Requests</TableHead>
                          <TableHead className="text-right">Tokens</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topTools.map((tool, idx) => (
                          <TableRow key={tool.tool_id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                <div>
                                  <div className="font-medium">{tool.tool_title || tool.tool_name}</div>
                                  <div className="text-xs text-muted-foreground">{tool.tool_name}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{tool.request_count}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{tool.tokens_consumed}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

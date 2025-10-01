import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Shield, Calendar, CheckCircle2, XCircle, Clock, Users, Plus } from "lucide-react";
import Header from "@/components/header";
import PageNavigation from "@/components/page-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/use-user-profile";
import { adminUpdateUser, fetchAllUsers } from "@/lib/api-client";
import type { UserProfile, UpdateUserRequest } from "@/types/user";
import { formatExpiryDate } from "@/constants/messages";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EditUserDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function EditUserDialog({ user, open, onOpenChange, onSuccess }: EditUserDialogProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState<UpdateUserRequest>({
    plan: user?.plan,
    status: user?.status,
    role: user?.role,
    trial_ends_at: user?.trial_ends_at || undefined,
    member_ends_at: user?.member_ends_at || undefined,
  });

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString();
  };

  const handleExtendTrial = (months: number) => {
    const currentDate = user?.trial_ends_at ? new Date(user.trial_ends_at) : new Date();
    const newDate = addDays(currentDate, months * 30);
    setFormData({ ...formData, trial_ends_at: newDate, plan: 'trial' });
  };

  const handleExtendMember = (months: number) => {
    const currentDate = user?.member_ends_at ? new Date(user.member_ends_at) : new Date();
    const newDate = addDays(currentDate, months * 30);
    setFormData({ ...formData, member_ends_at: newDate, plan: 'member' });
  };

  const handleUpgradeToMember = () => {
    const newDate = addDays(new Date(), 30);
    setFormData({ ...formData, plan: 'member', status: 'active', member_ends_at: newDate });
  };

  const handleDowngradeToTrial = () => {
    const newDate = addDays(new Date(), 30);
    setFormData({ ...formData, plan: 'trial', status: 'active', trial_ends_at: newDate });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    try {
      const response = await adminUpdateUser(user.user_id, formData);

      if (response.success) {
        toast({
          title: "Cập nhật thành công",
          description: `Đã cập nhật thông tin cho user ${user.username}`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: "Cập nhật thất bại",
          description: response.error || "Không thể cập nhật user",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Có lỗi xảy ra",
        description: error instanceof Error ? error.message : "Không thể cập nhật user",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quản lý User: {user.username}</DialogTitle>
          <DialogDescription>
            User ID: {user.user_id}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="plan" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="plan">Quản lý Plan</TabsTrigger>
              <TabsTrigger value="role">Role & Status</TabsTrigger>
              <TabsTrigger value="advanced">Nâng cao</TabsTrigger>
            </TabsList>

            <TabsContent value="plan" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Plan hiện tại</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <PlanBadge plan={formData.plan || user.plan} />
                    <span className="text-sm text-muted-foreground">
                      {formData.plan === 'trial' && formData.trial_ends_at &&
                        `(Hết hạn: ${formatExpiryDate(formData.trial_ends_at)})`}
                      {formData.plan === 'member' && formData.member_ends_at &&
                        `(Hết hạn: ${formatExpiryDate(formData.member_ends_at)})`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Thao tác nhanh</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUpgradeToMember}
                      className="text-purple-600 border-purple-300 hover:bg-purple-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Nâng lên Member
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDowngradeToTrial}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      Hạ xuống Trial
                    </Button>
                  </div>
                </div>

                {formData.plan === 'trial' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Hạn sử dụng Trial</Label>
                    <Input
                      type="date"
                      value={formData.trial_ends_at ? new Date(formData.trial_ends_at).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          // Set to 23:59:59 of selected date
                          const date = new Date(e.target.value);
                          date.setHours(23, 59, 59, 999);
                          setFormData({ ...formData, trial_ends_at: date.toISOString() });
                        } else {
                          setFormData({ ...formData, trial_ends_at: undefined });
                        }
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Chọn ngày hết hạn (sẽ tự động set 23:59)
                    </p>
                  </div>
                )}

                {formData.plan === 'member' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Hạn sử dụng Member</Label>
                    <Input
                      type="date"
                      value={formData.member_ends_at ? new Date(formData.member_ends_at).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          // Set to 23:59:59 of selected date
                          const date = new Date(e.target.value);
                          date.setHours(23, 59, 59, 999);
                          setFormData({ ...formData, member_ends_at: date.toISOString() });
                        } else {
                          setFormData({ ...formData, member_ends_at: undefined });
                        }
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Chọn ngày hết hạn (sẽ tự động set 23:59)
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="role" className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'pending' | 'disabled' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Chọn status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'member' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Chọn role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="plan" className="text-right">
                  Plan
                </Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) => setFormData({ ...formData, plan: value as 'trial' | 'member' })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Chọn plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trial_ends_at" className="text-right">
                  Trial Ends At
                </Label>
                <Input
                  id="trial_ends_at"
                  type="datetime-local"
                  className="col-span-3"
                  value={formData.trial_ends_at ? new Date(formData.trial_ends_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, trial_ends_at: e.target.value || undefined })}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="member_ends_at" className="text-right">
                  Member Ends At
                </Label>
                <Input
                  id="member_ends_at"
                  type="datetime-local"
                  className="col-span-3"
                  value={formData.member_ends_at ? new Date(formData.member_ends_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, member_ends_at: e.target.value || undefined })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    active: { icon: CheckCircle2, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
    pending: { icon: Clock, className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
    disabled: { icon: XCircle, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
  };

  const variant = variants[status as keyof typeof variants] || variants.active;
  const Icon = variant.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${variant.className}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const variants = {
    trial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    member: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${variants[plan as keyof typeof variants]}`}>
      {plan}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100 px-2 py-1 text-xs font-medium">
        <Shield className="h-3 w-3" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 px-2 py-1 text-xs font-medium">
      Member
    </span>
  );
}

function AdminUsersContent() {
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: fetchAllUsers,
    enabled: profile?.is_admin === true,
  });

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    refetch();
  };

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Shield className="h-12 w-12 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Không có quyền truy cập
            </h1>
            <p className="text-muted-foreground">
              Bạn cần có quyền admin để truy cập trang này.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageNavigation breadcrumbItems={[{ label: "Admin", href: "/admin" }, { label: "Quản lý Users" }]} backLink="/" />

        <section className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 px-4 py-1 text-sm font-medium text-indigo-600 mb-4">
            <Users className="h-4 w-4" />
            Admin Panel
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Quản lý <span className="text-indigo-600">Users</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Quản lý thông tin user, plan, status và thời gian hết hạn.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách Users</CardTitle>
            <CardDescription>
              Tổng số {users?.length || 0} users trong hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Đang tải danh sách users...</p>
              </div>
            )}

            {!isLoading && (!users || users.length === 0) && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Không có users nào trong hệ thống.
              </div>
            )}

            {!isLoading && users && users.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trial Ends</TableHead>
                      <TableHead>Member Ends</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell>
                          <PlanBadge plan={user.plan} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={user.status} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.trial_ends_at ? formatExpiryDate(user.trial_ends_at) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.member_ends_at ? formatExpiryDate(user.member_ends_at) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            Chỉnh sửa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <EditUserDialog
        user={editingUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}

export default function AdminUsers() {
  return <AdminUsersContent />;
}
// Error messages & UX copy for token management

export const ERROR_MESSAGES = {
  INSUFFICIENT_TOKENS: {
    title: 'Hết token hôm nay',
    description:
      'Bạn đã sử dụng hết token trong ngày. Token sẽ được reset vào 00:00 GMT+7.',
    action: 'Nâng cấp gói để có thêm token',
  },
  TRIAL_EXPIRED: {
    title: 'Gói dùng thử đã hết hạn',
    description:
      'Gói trial của bạn đã hết hạn. Vui lòng nâng cấp để tiếp tục sử dụng.',
    action: 'Liên hệ nâng cấp',
  },
  MEMBERSHIP_EXPIRED: {
    title: 'Gói thành viên đã hết hạn',
    description:
      'Gói membership của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục.',
    action: 'Gia hạn gói',
  },
  USER_NOT_ACTIVE: {
    title: 'Tài khoản chưa kích hoạt',
    description:
      'Tài khoản của bạn đang ở trạng thái chờ. Vui lòng liên hệ để kích hoạt.',
    action: 'Liên hệ hỗ trợ',
  },
  UNAUTHORIZED: {
    title: 'Không có quyền truy cập',
    description: 'Bạn không có quyền sử dụng tính năng này.',
    action: 'Quay lại',
  },
  SYSTEM_ERROR: {
    title: 'Lỗi hệ thống',
    description:
      'Đã xảy ra lỗi. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.',
    action: 'Thử lại',
  },
} as const;

export const STATUS_BANNERS = {
  PENDING: {
    type: 'warning' as const,
    title: 'Tài khoản đang chờ xử lý',
    message:
      'Tài khoản của bạn đang ở trạng thái chờ. Vui lòng nâng cấp gói để tiếp tục sử dụng các công cụ.',
    action: 'Liên hệ nâng cấp',
    actionUrl: '/pricing',
  },
  DISABLED: {
    type: 'error' as const,
    title: 'Tài khoản đã bị vô hiệu hóa',
    message:
      'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.',
    action: 'Liên hệ hỗ trợ',
    actionUrl: '/contact',
  },
  EXPIRING_SOON: {
    type: 'info' as const,
    title: 'Gói sắp hết hạn',
    message: 'Gói của bạn sẽ hết hạn trong {days} ngày. Gia hạn ngay để không bị gián đoạn.',
    action: 'Gia hạn ngay',
    actionUrl: '/pricing',
  },
} as const;

export const TOKEN_WIDGET_COPY = {
  UNLIMITED: 'Không giới hạn',
  RESET_TIME: 'Token reset lúc 00:00 (GMT+7)',
  EXPIRY_LABEL: 'Hạn gói',
  NO_EXPIRY: 'Không giới hạn thời gian',
  LOADING: 'Đang tải...',
  ERROR: 'Không thể tải dữ liệu',
  RETRY: 'Thử lại',
} as const;

export const PLAN_LABELS = {
  trial: 'Dùng thử',
  member: 'Thành viên',
} as const;

export const STATUS_LABELS = {
  active: 'Đang hoạt động',
  pending: 'Chờ xử lý',
  disabled: 'Đã vô hiệu hóa',
} as const;

export const ROLE_LABELS = {
  admin: 'Quản trị viên',
  member: 'Thành viên',
} as const;

// Helper function to get error message
export function getErrorMessage(errorCode: string) {
  const code = errorCode as keyof typeof ERROR_MESSAGES;
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.SYSTEM_ERROR;
}

// Helper function to format date
export function formatExpiryDate(dateString: string | null): string {
  if (!dateString) return TOKEN_WIDGET_COPY.NO_EXPIRY;

  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Helper function to check if expiring soon (within 3 days)
export function isExpiringSoon(dateString: string | null): boolean {
  if (!dateString) return false;

  const expiryDate = new Date(dateString);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 && diffDays <= 3;
}

// Helper function to get days until expiry
export function getDaysUntilExpiry(dateString: string | null): number {
  if (!dateString) return -1;

  const expiryDate = new Date(dateString);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
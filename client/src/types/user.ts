// User & Plan Types
export type UserRole = 'admin' | 'member';
export type UserPlan = 'trial' | 'member';
export type UserStatus = 'active' | 'pending' | 'disabled';

export interface UserProfile {
  user_id: string;
  username: string;
  email?: string; // Optional email field from profiles table
  role: UserRole;
  plan: UserPlan;
  status: UserStatus;
  trial_ends_at: string | null;
  member_ends_at: string | null;
  created_at: string;
  is_admin: boolean; // Computed field for easier checks
}

export interface TokenUsage {
  date: string; // YYYY-MM-DD
  total: number;
  used: number;
  remaining: number;
  resetAt: string; // "00:00 GMT+7"
  usage_percentage: number;
}

export interface PlanQuota {
  plan: UserPlan;
  daily_token_limit: number;
  description: string;
}

// API Response types
export interface ProfileResponse {
  success: boolean;
  profile: UserProfile;
}

export interface UsageResponse {
  success: boolean;
  usage: TokenUsage;
}

export interface ConsumeTokenResponse {
  success: boolean;
  message?: string;
  error?: string;
  tokens_used?: number;
  tokens_remaining?: number;
  daily_limit?: number;
  consumed_tokens?: number;
  expired_at?: string;
}

// Error codes from backend
export type TokenError =
  | 'INSUFFICIENT_TOKENS'
  | 'TRIAL_EXPIRED'
  | 'MEMBERSHIP_EXPIRED'
  | 'USER_NOT_ACTIVE'
  | 'USER_NOT_FOUND'
  | 'PLAN_NOT_FOUND'
  | 'INTERNAL_ERROR';

// Admin management
export interface UpdateUserRequest {
  plan?: UserPlan;
  status?: UserStatus;
  role?: UserRole;
  trial_ends_at?: string | null;
  member_ends_at?: string | null;
}

export interface AdminUpdateResponse {
  success: boolean;
  message: string;
  error?: string;
  user_id?: string;
  old_plan?: UserPlan;
  new_plan?: UserPlan;
  old_status?: UserStatus;
  new_status?: UserStatus;
  old_role?: UserRole;
  new_role?: UserRole;
}
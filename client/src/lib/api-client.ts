import supabase from './supabase';
import type {
  UserProfile,
  TokenUsage,
  ConsumeTokenResponse,
  UpdateUserRequest,
  AdminUpdateResponse,
} from '../types/user';

// ============================================
// User Profile & Usage APIs
// ============================================

export async function fetchUserProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return {
    ...data,
    is_admin: data.role === 'admin',
  };
}

export async function fetchTokenUsage(
  userId: string
): Promise<TokenUsage | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_token_usage', {
      p_user_id: userId,
      p_date: new Date().toISOString().split('T')[0],
    });

    if (error) {
      console.error('Error fetching token usage:', error);
      return null;
    }

    if (!data || !data.success) {
      return null;
    }

    return {
      date: data.usage_date || new Date().toISOString().split('T')[0],
      total: data.daily_limit || 0,
      used: data.tokens_used || 0,
      remaining: data.tokens_remaining || 0,
      resetAt: '00:00 GMT+7',
      usage_percentage: data.usage_percentage || 0,
    };
  } catch (error) {
    console.error('Error in fetchTokenUsage:', error);
    return null;
  }
}

// ============================================
// Token Consumption API
// ============================================

export async function consumeToken(
  userId: string,
  tokensToConsume: number = 1
): Promise<ConsumeTokenResponse> {
  try {
    const { data, error } = await supabase.rpc('consume_token', {
      p_user_id: userId,
      p_tokens_to_consume: tokensToConsume,
    });

    if (error) {
      console.error('Error consuming token:', error);
      return {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to consume token',
      };
    }

    return data;
  } catch (error) {
    console.error('Error in consumeToken:', error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
  }
}

// ============================================
// Tools Visibility API
// ============================================

export interface ToolInfo {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  icon_bg_color: string;
  icon_color: string;
  category: string;
  status: string;
  has_access: boolean;
}

export async function fetchVisibleTools(): Promise<ToolInfo[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  try {
    // Get user's granted tools
    const { data: grantedTools } = await supabase
      .from('user_tool_access')
      .select('tool_id')
      .eq('user_id', user.id);

    const grantedToolIds = new Set(
      grantedTools?.map((t: any) => t.tool_id) || []
    );

    // Get all active tools
    const { data: tools, error } = await supabase
      .from('seo_tools')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching tools:', error);
      return [];
    }

    // Filter tools based on user access
    return (tools || []).map((tool: any) => ({
      ...tool,
      has_access: grantedToolIds.has(tool.id),
    }));
  } catch (error) {
    console.error('Error in fetchVisibleTools:', error);
    return [];
  }
}

// ============================================
// Admin User Management APIs
// ============================================

export async function adminUpdateUser(
  userId: string,
  updates: UpdateUserRequest
): Promise<AdminUpdateResponse> {
  try {
    // Call appropriate RPC function based on what's being updated
    if (updates.plan !== undefined) {
      const { data, error } = await supabase.rpc('admin_update_user_plan', {
        p_user_id: userId,
        p_plan: updates.plan,
        p_trial_ends_at: updates.trial_ends_at || null,
        p_member_ends_at: updates.member_ends_at || null,
      });

      if (error) throw error;
      return data;
    }

    if (updates.status !== undefined) {
      const { data, error } = await supabase.rpc('admin_update_user_status', {
        p_user_id: userId,
        p_status: updates.status,
      });

      if (error) throw error;
      return data;
    }

    if (updates.role !== undefined) {
      const { data, error } = await supabase.rpc('admin_update_user_role', {
        p_user_id: userId,
        p_role: updates.role,
      });

      if (error) throw error;
      return data;
    }

    return {
      success: false,
      message: 'No valid updates provided',
    };
  } catch (error: any) {
    console.error('Error in adminUpdateUser:', error);
    return {
      success: false,
      message: error.message || 'Failed to update user',
      error: 'INTERNAL_ERROR',
    };
  }
}

export async function adminListUsers(filters?: {
  plan?: string;
  status?: string;
  role?: string;
  limit?: number;
  offset?: number;
}): Promise<{ users: UserProfile[]; total_count: number }> {
  try {
    const { data, error } = await supabase.rpc('admin_list_users', {
      p_limit: filters?.limit || 100,
      p_offset: filters?.offset || 0,
      p_filter_plan: filters?.plan || null,
      p_filter_status: filters?.status || null,
      p_filter_role: filters?.role || null,
    });

    if (error) throw error;

    if (!data || !data.success) {
      return { users: [], total_count: 0 };
    }

    return {
      users: (data.users || []).map((user: any) => ({
        ...user,
        is_admin: user.role === 'admin',
      })),
      total_count: data.total_count || 0,
    };
  } catch (error) {
    console.error('Error in adminListUsers:', error);
    return { users: [], total_count: 0 };
  }
}

export async function adminGetUserInfo(
  userId: string
): Promise<any | null> {
  try {
    const { data, error } = await supabase.rpc('admin_get_user_info', {
      p_user_id: userId,
    });

    if (error) throw error;

    if (!data || !data.success) {
      return null;
    }

    return data.user;
  } catch (error) {
    console.error('Error in adminGetUserInfo:', error);
    return null;
  }
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((user) => ({
      ...user,
      is_admin: user.role === 'admin',
    }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}
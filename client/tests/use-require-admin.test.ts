import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../src/types/user';
import { deriveAdminGuard, useRequireAdmin } from '../src/hooks/use-require-admin';

const mockUseUserProfile = vi.fn();

vi.mock('../src/hooks/use-user-profile', () => ({
  useUserProfile: () => mockUseUserProfile(),
}));

describe('deriveAdminGuard', () => {
  const baseProfile: UserProfile = {
    user_id: 'user-1',
    username: 'alice',
    role: 'member',
    email: 'alice@example.com',
    plan: 'trial',
    status: 'active',
    trial_ends_at: null,
    member_ends_at: null,
    created_at: new Date().toISOString(),
    is_admin: false,
  };

  it('flags admin profiles correctly', () => {
    const result = deriveAdminGuard({ ...baseProfile, role: 'admin', is_admin: true });
    expect(result).toEqual({ isAdmin: true, isDenied: false });
  });

  it('flags member profiles as denied', () => {
    const result = deriveAdminGuard(baseProfile);
    expect(result).toEqual({ isAdmin: false, isDenied: true });
  });

  it('handles missing profile', () => {
    const result = deriveAdminGuard(null);
    expect(result).toEqual({ isAdmin: false, isDenied: false });
  });
});

describe('useRequireAdmin', () => {
  beforeEach(() => {
    mockUseUserProfile.mockReset();
  });

  it('maps admin profile to guard state', () => {
    mockUseUserProfile.mockReturnValue({
      profile: { role: 'admin' },
      isLoading: false,
      isError: false,
      error: null,
      refreshProfile: vi.fn(),
    });

    const result = useRequireAdmin();
    expect(result.isAdmin).toBe(true);
    expect(result.isDenied).toBe(false);
  });

  it('maps member profile to denied state', () => {
    mockUseUserProfile.mockReturnValue({
      profile: { role: 'member' },
      isLoading: false,
      isError: false,
      error: null,
      refreshProfile: vi.fn(),
    });

    const result = useRequireAdmin();
    expect(result.isAdmin).toBe(false);
    expect(result.isDenied).toBe(true);
  });
});

import { useUserProfile } from './use-user-profile';
import type { UserProfile } from '../types/user';

export interface AdminGuardResult {
  isAdmin: boolean;
  isDenied: boolean;
}

export function deriveAdminGuard(profile: UserProfile | null): AdminGuardResult {
  const isAdmin = profile?.role === 'admin';
  return {
    isAdmin,
    isDenied: !!profile && !isAdmin,
  };
}

export function useRequireAdmin() {
  const userProfileState = useUserProfile();
  const guard = deriveAdminGuard(userProfileState.profile);

  return {
    ...userProfileState,
    ...guard,
  };
}

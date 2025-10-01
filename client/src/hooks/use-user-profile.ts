import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, fetchTokenUsage } from '../lib/api-client';
import type { UserProfile, TokenUsage } from '../types/user';

export function useUserProfile() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: fetchUserProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnMount: 'always', // Always refetch on mount to ensure fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const refreshProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['user-profile'] });
  };

  return {
    profile: profileQuery.data as UserProfile | null,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
    refreshProfile,
  };
}

export function useTokenUsage(userId: string | undefined) {
  const queryClient = useQueryClient();

  const usageQuery = useQuery({
    queryKey: ['token-usage', userId],
    queryFn: () => (userId ? fetchTokenUsage(userId) : null),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchOnMount: 'always', // Always refetch on mount to ensure fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 2,
  });

  const refreshUsage = () => {
    queryClient.invalidateQueries({ queryKey: ['token-usage', userId] });
  };

  return {
    usage: usageQuery.data as TokenUsage | null,
    isLoading: usageQuery.isLoading,
    isError: usageQuery.isError,
    error: usageQuery.error,
    refreshUsage,
  };
}
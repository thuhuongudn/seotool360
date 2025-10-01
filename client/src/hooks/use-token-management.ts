import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { consumeToken } from '../lib/api-client';
import { useUserProfile, useTokenUsage } from './use-user-profile';
import { useToast } from './use-toast';
import { getErrorMessage } from '../constants/messages';
import type { ConsumeTokenResponse } from '../types/user';

interface UseTokenManagementOptions {
  onSuccess?: (data: ConsumeTokenResponse) => void;
  onError?: (error: string) => void;
}

export function useTokenManagement(options?: UseTokenManagementOptions) {
  const { profile } = useUserProfile();
  const { refreshUsage } = useTokenUsage(profile?.user_id);
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const consumeMutation = useMutation({
    mutationFn: ({
      userId,
      tokens,
    }: {
      userId: string;
      tokens: number;
    }) => consumeToken(userId, tokens),
    onSuccess: (data) => {
      if (data.success) {
        // Refresh usage data
        refreshUsage();
        options?.onSuccess?.(data);
      } else {
        // Handle token consumption failure
        const errorMsg = getErrorMessage(data.error || 'SYSTEM_ERROR');
        toast({
          variant: 'destructive',
          title: errorMsg.title,
          description: errorMsg.description,
        });
        options?.onError?.(data.error || 'SYSTEM_ERROR');
      }
      setIsProcessing(false);
    },
    onError: (error: any) => {
      const errorMsg = getErrorMessage('SYSTEM_ERROR');
      toast({
        variant: 'destructive',
        title: errorMsg.title,
        description: error.message || errorMsg.description,
      });
      options?.onError?.('SYSTEM_ERROR');
      setIsProcessing(false);
    },
  });

  const canUseToken = () => {
    if (!profile) return false;

    // Admins have unlimited tokens
    if (profile.is_admin) return true;

    // Check if user status is active
    if (profile.status !== 'active') return false;

    return true;
  };

  const executeWithToken = async <T,>(
    tokensToConsume: number,
    action: () => Promise<T>
  ): Promise<T | null> => {
    if (!profile?.user_id) {
      toast({
        variant: 'destructive',
        title: 'Chưa đăng nhập',
        description: 'Vui lòng đăng nhập để sử dụng tính năng này.',
      });
      return null;
    }

    if (!canUseToken()) {
      const errorMsg = getErrorMessage('USER_NOT_ACTIVE');
      toast({
        variant: 'destructive',
        title: errorMsg.title,
        description: errorMsg.description,
      });
      return null;
    }

    setIsProcessing(true);

    try {
      // For admins, skip token consumption
      if (profile.is_admin) {
        const result = await action();
        setIsProcessing(false);
        return result;
      }

      // For regular users, consume token first
      const consumeResult = await consumeToken(
        profile.user_id,
        tokensToConsume
      );

      if (!consumeResult.success) {
        const errorMsg = getErrorMessage(
          consumeResult.error || 'SYSTEM_ERROR'
        );
        toast({
          variant: 'destructive',
          title: errorMsg.title,
          description: errorMsg.description,
        });
        setIsProcessing(false);
        return null;
      }

      // Token consumed successfully, execute the action
      const result = await action();

      // Refresh usage after successful action
      refreshUsage();
      setIsProcessing(false);

      return result;
    } catch (error: any) {
      const errorMsg = getErrorMessage('SYSTEM_ERROR');
      toast({
        variant: 'destructive',
        title: errorMsg.title,
        description: error.message || errorMsg.description,
      });
      setIsProcessing(false);
      return null;
    }
  };

  const getTokenStatus = () => {
    if (!profile) {
      return {
        canUse: false,
        reason: 'NOT_LOGGED_IN',
        isUnlimited: false,
      };
    }

    if (profile.is_admin) {
      return {
        canUse: true,
        reason: null,
        isUnlimited: true,
      };
    }

    if (profile.status !== 'active') {
      return {
        canUse: false,
        reason: 'USER_NOT_ACTIVE',
        isUnlimited: false,
      };
    }

    return {
      canUse: true,
      reason: null,
      isUnlimited: false,
    };
  };

  return {
    executeWithToken,
    canUseToken: canUseToken(),
    isProcessing,
    tokenStatus: getTokenStatus(),
    isAdmin: profile?.is_admin || false,
  };
}
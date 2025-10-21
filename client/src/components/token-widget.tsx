import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { AlertCircle, RefreshCw, Clock, Calendar } from 'lucide-react';
import { useUserProfile, useTokenUsage } from '../hooks/use-user-profile';
import {
  TOKEN_WIDGET_COPY,
  PLAN_LABELS,
  formatExpiryDate,
} from '../constants/messages';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function TokenWidget() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { usage, isLoading: usageLoading, isError, refreshUsage } = useTokenUsage(
    profile?.user_id
  );

  if (profileLoading || usageLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return null;
  }

  const isAdmin = profile.is_admin;
  const planLabel = PLAN_LABELS[profile.plan];

  // Admin: unlimited tokens
  if (isAdmin) {
    return (
      <Card className="w-full border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Token hôm nay
            </CardTitle>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              Admin
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold text-purple-600">
            {TOKEN_WIDGET_COPY.UNLIMITED}
          </div>
          <p className="text-sm text-muted-foreground">
            Bạn có quyền truy cập không giới hạn
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError || !usage) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Token hôm nay
            </CardTitle>
            <Badge variant="outline">{planLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{TOKEN_WIDGET_COPY.ERROR}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshUsage}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {TOKEN_WIDGET_COPY.RETRY}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = Math.min(
    (usage.used / usage.total) * 100,
    100
  );
  const isLowTokens = usage.remaining <= 2;
  // Priority: member_ends_at if exists, otherwise fallback to trial_ends_at
  const expiryDate = profile.member_ends_at || profile.trial_ends_at;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Token hôm nay
          </CardTitle>
          <Badge variant="outline">{planLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Token usage */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">
                {usage.remaining}
              </span>
              <span className="text-muted-foreground">/ {usage.total}</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant={isLowTokens ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {usage.used} đã dùng
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Đã sử dụng {usagePercentage.toFixed(0)}% token hôm nay</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Progress bar */}
          <Progress value={usagePercentage} className="h-2" />
        </div>

        {/* Reset time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{TOKEN_WIDGET_COPY.RESET_TIME}</span>
        </div>

        {/* Expiry date */}
        {expiryDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
            <Calendar className="h-3 w-3" />
            <span>
              {TOKEN_WIDGET_COPY.EXPIRY_LABEL}:{' '}
              <span className="font-medium text-foreground">
                {formatExpiryDate(expiryDate)}
              </span>
            </span>
          </div>
        )}

        {/* Low tokens warning */}
        {isLowTokens && usage.remaining > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
            ⚠️ Token sắp hết! Còn {usage.remaining} lượt sử dụng.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
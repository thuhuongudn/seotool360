import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUserProfile } from '../hooks/use-user-profile';
import {
  STATUS_BANNERS,
  isExpiringSoon,
  getDaysUntilExpiry,
} from '../constants/messages';
import { useState } from 'react';
import { useLocation } from 'wouter';

export function StatusBanner() {
  const { profile } = useUserProfile();
  const [dismissed, setDismissed] = useState(false);
  const [, setLocation] = useLocation();

  if (!profile || dismissed) {
    return null;
  }

  // Check for pending status
  if (profile.status === 'pending') {
    const banner = STATUS_BANNERS.PENDING;
    return (
      <Alert
        variant="destructive"
        className="relative border-amber-200 bg-amber-50 text-amber-900"
      >
        <AlertTriangle className="h-4 w-4 !text-amber-600" />
        <AlertTitle className="text-amber-900">{banner.title}</AlertTitle>
        <AlertDescription className="text-amber-800">
          {banner.message}
        </AlertDescription>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={() => setLocation(banner.actionUrl)}
          >
            {banner.action}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    );
  }

  // Check for disabled status
  if (profile.status === 'disabled') {
    const banner = STATUS_BANNERS.DISABLED;
    return (
      <Alert variant="destructive" className="relative">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{banner.title}</AlertTitle>
        <AlertDescription>{banner.message}</AlertDescription>
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation(banner.actionUrl)}
          >
            {banner.action}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    );
  }

  // Check for expiring soon (for active users)
  if (profile.status === 'active') {
    const expiryDate =
      profile.plan === 'trial'
        ? profile.trial_ends_at
        : profile.member_ends_at;

    if (expiryDate && isExpiringSoon(expiryDate)) {
      const days = getDaysUntilExpiry(expiryDate);
      const banner = STATUS_BANNERS.EXPIRING_SOON;
      const message = banner.message.replace('{days}', days.toString());

      return (
        <Alert className="relative border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 !text-blue-600" />
          <AlertTitle className="text-blue-900">{banner.title}</AlertTitle>
          <AlertDescription className="text-blue-800">
            {message}
          </AlertDescription>
          <div className="mt-3">
            <Button
              size="sm"
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setLocation(banner.actionUrl)}
            >
              {banner.action}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      );
    }
  }

  return null;
}
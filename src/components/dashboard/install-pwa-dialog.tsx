
'use client';

import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Logo } from '../logo';

export function InstallPwaDialog() {
  const { canInstall, install, isInstallable, hasBeenDismissed, dismiss } = useInstallPrompt();

  if (!canInstall || !isInstallable || hasBeenDismissed) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && dismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <DialogTitle className="text-center font-headline text-2xl">Install CampusConnect</DialogTitle>
          <DialogDescription className="text-center">
            Get the full app experience. Install CampusConnect on your device for easier access and notifications.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pt-4">
          <Button type="button" variant="ghost" onClick={dismiss}>
            Not Now
          </Button>
          <Button type="button" onClick={install}>
            Install App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

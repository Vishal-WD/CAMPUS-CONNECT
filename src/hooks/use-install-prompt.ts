
'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const INSTALL_PROMPT_DISMISSED_KEY = 'installPromptDismissed';

export function useInstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(true); // Default to true SSR

  useEffect(() => {
    // Check local storage on mount
    const dismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
    setHasBeenDismissed(dismissed === 'true');

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    // The prompt can only be used once.
    setInstallPromptEvent(null);
    setIsInstallable(false);
  }, [installPromptEvent]);

  const dismiss = useCallback(() => {
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
    setHasBeenDismissed(true);
    setInstallPromptEvent(null);
    setIsInstallable(false);
  }, []);

  // Show prompt 3 seconds after it's installable
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isInstallable && !hasBeenDismissed) {
      timer = setTimeout(() => {
          setCanInstall(true);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isInstallable, hasBeenDismissed]);

  const [canInstall, setCanInstall] = useState(false);

  return { canInstall, install, isInstallable, hasBeenDismissed, dismiss };
}

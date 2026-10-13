import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook to request and maintain Screen Wake Lock API.
 * Keeps the screen awake during classroom game sessions on Android IFP / tablets / PCs.
 */
export function useWakeLock(enabled: boolean = true) {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<any>(null);

  const requestLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      setIsLocked(true);

      wakeLockRef.current.addEventListener('release', () => {
        setIsLocked(false);
        wakeLockRef.current = null;
      });
      return true;
    } catch {
      setIsLocked(false);
      return false;
    }
  }, []);

  const releaseLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
      setIsLocked(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      releaseLock();
      return;
    }

    requestLock();

    // Re-acquire wake lock if user switches tabs and comes back
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && !wakeLockRef.current) {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseLock();
    };
  }, [enabled, requestLock, releaseLock]);

  return { isLocked, requestLock, releaseLock };
}

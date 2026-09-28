import { useEffect } from 'react';
import { authAPI } from '../lib/api';

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll'] as const;

/**
 * Logs the user out after IDLE_TIMEOUT_MS of no interaction. The server
 * enforces the same idle timeout on refresh() independently — this hook is
 * purely for UX so the user is bounced to the login screen proactively
 * instead of on their next failed request.
 */
export default function useIdleTimeout(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout>;

    const onTimeout = () => {
      authAPI.logout().finally(() => {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      });
    };

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(onTimeout, IDLE_TIMEOUT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [enabled]);
}

import type { Platform } from './types';

export function createBrowserPlatform(): Platform {
  return {
    name: 'browser',
    keepAwake() {
      // Desktop browsers: the Screen Wake Lock API, where available.
      const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<unknown> } }).wakeLock;
      wl?.request('screen').catch(() => {
        /* not allowed or unsupported; fine for development */
      });
    },
    onVisibilityChange(cb) {
      document.addEventListener('visibilitychange', () => cb(!document.hidden));
    },
    exitApp() {
      /* nothing to exit in a browser tab */
    },
  };
}

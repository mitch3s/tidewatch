import type { Platform } from './types';

export function createBrowserPlatform(): Platform {
  let status = 'not requested';
  return {
    name: 'browser',
    keepAwake() {
      // Desktop browsers: the Screen Wake Lock API, where available.
      const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<unknown> } }).wakeLock;
      if (!wl) {
        status = 'wake lock unsupported';
        return;
      }
      status = 'wake lock requested';
      wl.request('screen').then(
        () => (status = 'wake lock active'),
        () => (status = 'wake lock refused'),
      );
    },
    keepAwakeStatus() {
      return status;
    },
    onVisibilityChange(cb) {
      document.addEventListener('visibilitychange', () => cb(!document.hidden));
    },
    exitApp() {
      /* nothing to exit in a browser tab */
    },
  };
}

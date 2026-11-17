import type { Platform } from './types';

export function createWebOSPlatform(): Platform {
  return {
    name: 'webos',
    keepAwake() {
      // TODO (Milestone 8.2): needs testing on a real TV. Candidates are a
      // Luna service call available to web apps, or a hidden muted looping
      // video as a fallback.
    },
    onVisibilityChange(cb) {
      document.addEventListener('visibilitychange', () => cb(!document.hidden));
      // Fired when the app is already running and the user launches it again.
      document.addEventListener('webOSRelaunch', () => cb(true));
    },
    exitApp() {
      window.close();
    },
  };
}

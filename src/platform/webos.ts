import { palmLunaCall, ScreensaverVeto } from './screensaver';
import type { Platform } from './types';

/** If the screensaver veto isn't active by then, fall back to a playing video. */
const VETO_GRACE_MS = 5000;

export function createWebOSPlatform(): Platform {
  let veto: ScreensaverVeto | null = null;
  let video: HTMLVideoElement | null = null;
  let videoState = 'off';

  /**
   * Fallback: a tiny black clip, muted and looping, full size behind the
   * canvas. LG says the screensaver stays away while a full-size video
   * plays; reports on how well this works vary, so it's only a fallback.
   */
  const startVideo = () => {
    if (video) return;
    video = document.createElement('video');
    video.src = './keep-awake.mp4';
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.setAttribute('playsinline', '');
    video.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;object-fit:cover;background:#000;';
    document.body.prepend(video);
    videoState = 'starting';
    video.play().then(
      () => (videoState = 'playing'),
      (e: Error) => (videoState = `failed: ${e.message}`),
    );
  };

  return {
    name: 'webos',
    keepAwake() {
      const call = palmLunaCall();
      if (!call) {
        startVideo();
        return;
      }
      veto = new ScreensaverVeto(call);
      veto.start();
      setTimeout(() => {
        if (veto?.status !== 'active') startVideo();
      }, VETO_GRACE_MS);
    },
    keepAwakeStatus() {
      const parts: string[] = [];
      if (veto) parts.push(`veto ${veto.status}${veto.vetoes ? ` (said no ${veto.vetoes}×)` : ''}`);
      else parts.push('veto unavailable');
      if (video) parts.push(`video ${videoState}`);
      return parts.join(', ');
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

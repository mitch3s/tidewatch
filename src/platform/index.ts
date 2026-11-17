import { createBrowserPlatform } from './browser';
import type { Platform } from './types';
import { createWebOSPlatform } from './webos';

export function isWebOS(): boolean {
  const w = window as Window & { PalmSystem?: unknown; webOS?: unknown };
  return w.PalmSystem !== undefined || w.webOS !== undefined || /Web0S|webOS/i.test(navigator.userAgent);
}

export function createPlatform(): Platform {
  return isWebOS() ? createWebOSPlatform() : createBrowserPlatform();
}

export type { Platform } from './types';

// Filled in by Vite at build time (see vite.config.ts); absent in unit tests.
declare const __APP_VERSION__: string | undefined;
declare const __APP_COMMIT__: string | undefined;

/** The app version from package.json, e.g. "1.1.0". */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
/** Short git commit the build came from; "+" means it had uncommitted changes. */
export const APP_COMMIT: string = typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'unknown';

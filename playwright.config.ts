import { defineConfig } from '@playwright/test';

// The project has no Node types (the app runs in a browser); this config runs in Node.
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  testDir: 'tests/e2e',
  // Visual regression tests run separately (npm run test:visual).
  grepInvert: process.env.TW_VISUAL ? undefined : /@visual/,
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{platform}{ext}',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1920, height: 1080 },
  },
  webServer: {
    // Dev tools (URL flags) are needed by the tests, so build with them on.
    command: 'npx vite build --mode godmode && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

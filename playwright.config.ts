import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1920, height: 1080 },
  },
  webServer: {
    // Dev tools (URL flags) are needed by the tests, so build with them on.
    command: 'VITE_GOD_MODE=1 npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

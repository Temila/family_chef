import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    // Phase 15 BUG-06: signal DATA-01 seed should be active for card-geometry tests.
    // Verifier runs backend with AUTO_SEED_DEMO_DISHES=1 so 8 seed dishes appear.
    env: {
      VITE_AUTO_SEED_DEMO_DISHES: '1',
    },
  },
});

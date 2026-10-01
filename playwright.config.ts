import { defineConfig, devices } from '@playwright/test';

// E2E tests run against a local stack: `npx supabase start`, `npx supabase db reset`,
// demo content (supabase/demo-seed.sql) and the app (`pnpm build && pnpm start`, or `pnpm dev`).
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : { command: 'pnpm start -p 3000', url: `${baseURL}/ar`, reuseExistingServer: true, timeout: 120_000 },
});

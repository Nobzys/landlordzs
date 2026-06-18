import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  // next dev cold-compiles each route the first time it's hit; on this
  // machine's filesystem that regularly exceeds Playwright's 30s default.
  timeout: 60_000,
  expect: {
    // next dev compiles each route on first hit; cold compiles on this
    // machine's filesystem regularly exceed the 5s default expect timeout.
    timeout: 20_000,
  },
  use: {
    // Must match supabase/config.toml's [auth] site_url — the confirmation
    // and password-reset email templates build links off that value, not
    // off NEXT_PUBLIC_APP_URL.
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    // Includes a full `next build` on this machine's slow filesystem
    // (observed ~3 minutes standalone).
    timeout: 420_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})

import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration (docs/PLAN.md → Seção 13).
 *
 * - E2E runs against the dev server with MSW enabled, so REST and Socket.IO go
 *   through the service worker exactly like in the demo build.
 * - `testDir` is `e2e`; visual baselines live next to the specs
 *   (`e2e/<flow>.spec.ts-snapshots`).
 * - Traces, video and screenshots are kept on failure so CI artifacts are useful.
 */
const PORT = 5173
// 127.0.0.1 (not `localhost`) so the URL used by the tests is exactly the one
// Vite binds to, avoiding IPv4/IPv6 mismatches on some machines.
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' },
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'chromium-mobile',
      // 390 is the narrowest width the brief asks for; Pixel 7 supplies the
      // mobile UA, touch and DPR.
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_ENABLE_MOCKS: 'true', VITE_MOCK_SCENARIO: 'default' },
  },
})

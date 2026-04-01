import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.api.test.ts', '**/*.pipeline.test.ts', '**/*.ui.test.ts'],
  timeout: 5 * 60 * 1000,      // 5 min — pipelines take time
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    extraHTTPHeaders: { 'x-test-mode': 'true' },  // enables test-only endpoints
  },
  projects: [
    {
      name: 'api',
      testMatch: '**/*.api.test.ts',
      use: {}  // no browser needed — page.request only
    },
    {
      name: 'pipeline',
      testMatch: '**/*.pipeline.test.ts',
      use: {}  // no browser needed — Inngest dev mode
    },
    {
      name: 'ui',
      testMatch: '**/*.ui.test.ts',
      use: { ...devices['Desktop Chrome'] }
    },
  ],
})

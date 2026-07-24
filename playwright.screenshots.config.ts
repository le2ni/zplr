import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/screenshots",
  outputDir: ".screenshots/playwright",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4183",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
    locale: "en-US",
    timezoneId: "UTC",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "landing-screenshots",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "node scripts/serve-static.mjs 4183",
    url: "http://127.0.0.1:4183/editor",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

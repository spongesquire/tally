import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        port: 3000,
        timeout: 30000,
        reuseExistingServer: true,
      },
});

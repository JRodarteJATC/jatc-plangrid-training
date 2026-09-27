// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 1400, height: 850 },
    // Optional: point at an already-installed Chromium instead of downloading one.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: { command: "python3 -m http.server 4173 --directory app", port: 4173, reuseExistingServer: true },
});

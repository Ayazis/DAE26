// End-to-end tests for the 2026 map. Uses the locally installed Chrome, so no browser download is needed.
const { defineConfig } = require("@playwright/test");

const PORT = 4173;
module.exports = defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // a stray test.only must not let CI pass on a fraction of the suite
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  globalSetup: "./tests/global-setup.js",       // JS coverage of the app code, see tests/coverage.js
  globalTeardown: "./tests/global-teardown.js",
  use: {
    baseURL: `http://127.0.0.1:${PORT}/2026/`,
    channel: "chrome",
    serviceWorkers: "block", // always test the files on disk, never a cached copy
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: `node tests/serve.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/2026/`,
    reuseExistingServer: true,
  },
});

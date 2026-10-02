// End-to-end tests for the 2026 map. Uses the locally installed Chrome, so no browser download is needed.
const { defineConfig } = require("@playwright/test");

const PORT = 4173;
module.exports = defineConfig({
  testDir: "tests",
  fullyParallel: true,
  reporter: [["list"]],
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

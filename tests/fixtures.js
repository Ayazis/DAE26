// The Playwright `test` used by every spec: the same as @playwright/test, except that each test's page records
// JS coverage of the app code (see coverage.js).
const base = require("@playwright/test");
const coverage = require("./coverage");

const test = base.test.extend({
  page: async ({ page }, use) => {
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await use(page);
    await coverage.add(await page.coverage.stopJSCoverage());
  },
});

module.exports = { test, expect: base.expect };

// Visitor statistics (analytics.js): the map must work the same whether GoatCounter is unset, set, or unreachable.
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const SITE = "https://ayazis.github.io/DAE26/2026/"; // served from the local test server, so the live-site checks run offline
const SRC = fs.readFileSync(path.join(__dirname, "../2026/analytics.js"), "utf8");
const COUNT_URL = "https://daemap26.goatcounter.com/count";

// Opens `url` with analytics.js as shipped, or with GOATCOUNTER set to `goatcounter` ("" = off).
// Requests for count.js are recorded in page.counts and then aborted, like an ad blocker or no connection would.
async function load(page, url, { goatcounter } = {}) {
  page.errors = [];
  page.counts = [];
  page.on("pageerror", e => page.errors.push(e));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.route(/^https:\/\/ayazis\.github\.io\/DAE26\//, async r => {
    const local = r.request().url().replace(/^https:\/\/ayazis\.github\.io\/DAE26\//, "http://127.0.0.1:4173/").replace(/pr-preview\/pr-\d+\//, "");
    await r.fulfill({ response: await r.fetch({ url: local }) });
  });
  if (goatcounter !== undefined)
    await page.route(/\/analytics\.js$/, r => r.fulfill({ contentType: "text/javascript",
      body: SRC.replace(/const GOATCOUNTER = "[^"]*"/, `const GOATCOUNTER = ${JSON.stringify(goatcounter)}`) }));
  await page.route(/gc\.zgo\.at/, r => { page.counts.push(r.request().url()); return r.abort(); });
  await page.goto(url);
}

async function expectMapWorks(page) {
  await page.locator('.room[data-r="45"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tip h2")).toHaveText("Room 45");
  expect(page.errors).toEqual([]);
}

test("turned off: nothing is loaded and the privacy policy has no statistics section", async ({ page }) => {
  await load(page, SITE, { goatcounter: "" });
  await expectMapWorks(page);
  await expect(page.locator("script[data-goatcounter]")).toHaveCount(0);
  await load(page, SITE + "privacy.html", { goatcounter: "" });
  await expect(page.locator("h1")).toHaveText("Privacy policy");
  await expect(page.locator("#stats")).toHaveCount(0);
  expect(page.counts).toEqual([]);
});

test("as shipped: the live site loads the counter, and still works if it is blocked or unreachable", async ({ page }) => {
  await load(page, SITE);
  await expect(page.locator("script[data-goatcounter]")).toHaveAttribute("data-goatcounter", COUNT_URL);
  await expect.poll(() => page.counts.length).toBe(1);
  await expectMapWorks(page);
});

test("as shipped: the privacy policy shows the statistics section in both languages", async ({ page }) => {
  await load(page, SITE + "privacy.html");
  await expect(page.locator("#stats h2")).toHaveText("Visitor statistics");
  await page.click("#lang");
  await expect(page.locator("#stats h2")).toHaveText("Bezoekersstatistieken");
  expect(page.errors).toEqual([]);
});

for (const [name, url] of [["local runs", "http://127.0.0.1:4173/2026/"], ["PR previews", "https://ayazis.github.io/DAE26/pr-preview/pr-7/2026/"]])
  test(`as shipped: ${name} are not counted`, async ({ page }) => {
    await load(page, url);
    await expect(page.locator(".room[data-r]").first()).toBeAttached();
    await expect(page.locator("script[data-goatcounter]")).toHaveCount(0);
    expect(page.counts).toEqual([]);
  });

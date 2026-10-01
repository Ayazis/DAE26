const { test, expect } = require("@playwright/test");

// The map must not wait for exhibitor data: room geometry comes from plan.js, who is in each room from data.js.
test("the map draws before data.js arrives, then exhibitors fill in", async ({ page }) => {
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  let release;
  const gate = new Promise(r => (release = r));
  await page.route(/\/data\.js$/, async r => { await gate; await r.continue(); });
  await page.goto("./", { waitUntil: "commit" }); // "load" would wait for the held-back preload

  // Rooms are on the map while data.js is still held back, coloured by zone and not yet marked "not in use".
  await expect(page.locator(".room[data-r='3']")).toBeAttached();
  await expect(page.locator(".room[data-r='3']")).toHaveClass(/z-red/);
  expect(await page.locator(".room[data-r]").count()).toBeGreaterThan(50);
  await expect(page.locator(".room.unused")).toHaveCount(0);
  await expect(page.locator("#favs .empty")).toHaveCount(0);

  // Tapping a room before its exhibitors are known does nothing, rather than showing "not in use".
  await page.locator(".room[data-r='3']").click({ force: true });
  await expect(page.locator("#tip")).toBeHidden();

  release();
  await expect(page.locator(".room.unused").first()).toBeAttached();
  await expect(page.locator(".room[data-r='3'] .rbrand")).toHaveCount(1);
  await page.locator(".room[data-r='3']").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tip")).toContainText("Dynaudio Benelux");
  expect(page.errors).toEqual([]);
});

test("a shared favorites link opened before data.js arrives is still imported", async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.route(/\/data\.js$/, async r => { await new Promise(x => setTimeout(x, 400)); await r.continue(); });
  page.once("dialog", d => d.accept());
  await page.goto("./#fav=3,4");
  await expect(page.locator("#favs li button")).toHaveCount(2);
});

test("a failed or stale data.js request is retried instead of leaving the map inert", async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  let hits = 0;
  await page.route(/\/data\.js(\?.*)?$/, async r => {
    hits++;
    if (hits === 1) return r.abort();                                            // network failure
    if (hits === 2) return r.fulfill({ contentType: "text/javascript", body: "const ZONES = [];" }); // old version
    await r.continue();
  });
  await page.goto("./", { waitUntil: "commit" });
  await expect(page.locator(".room[data-r='3']")).toBeAttached();
  await expect(page.locator(".room.unused").first()).toBeAttached({ timeout: 15000 });
  expect(hits).toBe(3);
  await page.locator(".room[data-r='3']").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tip")).toContainText("Dynaudio Benelux");
});

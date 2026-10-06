// Offline support (sw.js). The other tests block the service worker so they always see the files on disk; these allow it.
const fs = require("fs");
const path = require("path");
const { test, expect } = require("./fixtures");
const { open, openRoom, saved } = require("./helpers");

test.use({ serviceWorkers: "allow" });

// Waits until the service worker has cached the app and controls the page.
const ready = page => page.evaluate(async () => {
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller)
    await new Promise(r => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
});

test("after one visit, the map works without a connection", async ({ page, context }) => {
  await open(page, { rooms: { 3: { fav: true, note: "bring records" } } });
  await ready(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".room[data-r='3']")).toBeAttached();
  await expect(page.locator(".room.unused").first()).toBeAttached(); // exhibitor data came from the cache
  await expect(page.locator("#favs li")).toHaveCount(1);
  await openRoom(page, "36");
  await expect(page.locator("#tip")).toContainText("ACM Premium Audio");
  await expect(page.locator("#tip .pv")).toHaveCount(1); // and so did the HiFi.nl previews
  await page.fill("#q", "bring records");
  await expect(page.locator(".room[data-r='3']")).toHaveClass(/\bhit\b/);

  // Changes made offline are saved as usual.
  await openRoom(page, "7");
  await page.click("#tip .favb");
  expect(Object.keys(await saved(page)).sort()).toEqual(["3", "7"]);
  expect(page.errors).toEqual([]);
});

test("online, a new version of the code is used on the next load, not the cached one", async ({ page, context }) => {
  await open(page);
  await ready(page);
  const src = fs.readFileSync(path.join(__dirname, "../2026/app.js"), "utf8");
  // context.route also sees the service worker's own requests to the network
  await context.route(/\/2026\/app\.js(\?.*)?$/, r => r.fulfill({ contentType: "text/javascript", body: src + "\nwindow.__newVersion=true;" }));
  await page.reload();
  await expect(page.locator(".room[data-r='3']")).toBeAttached();
  await expect.poll(() => page.evaluate(() => window.__newVersion)).toBe(true);
});

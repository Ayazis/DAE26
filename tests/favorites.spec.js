const { test, expect } = require("@playwright/test");
const { open, saved, openRoom, answerDialog } = require("./helpers");

test.describe("favorites", () => {
  test("starring a room saves it, lists it and marks it on the map", async ({ page }) => {
    await open(page);
    await openRoom(page, "3");
    await page.click("#tip .favb");

    await expect(page.locator("#tip .favb")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".room[data-r='3']")).toHaveClass(/\bfav\b/);
    await expect(page.locator("#favcount")).toHaveText("(1)");
    await expect(page.locator("#favs li")).toHaveCount(1);
    await expect(page.locator("#favs li")).toContainText("Room 3");
    expect(await saved(page)).toEqual({ 3: { fav: true } });
  });

  test("favorites survive a reload", async ({ page }) => {
    await open(page);
    await openRoom(page, "3");
    await page.click("#tip .favb");
    await page.reload();
    await expect(page.locator("#favs li")).toHaveCount(1);
    await expect(page.locator(".room[data-r='3']")).toHaveClass(/\bfav\b/);
  });

  test("unstarring removes the room and drops its empty entry", async ({ page }) => {
    await open(page, { rooms: { 3: { fav: true } } });
    await openRoom(page, "3");
    await page.click("#tip .favb");
    await expect(page.locator("#favs li.empty")).toBeVisible();
    await expect(page.locator("#favcount")).toHaveText("");
    expect(await saved(page)).toEqual({});
  });

  test("unstarring keeps the room's other data", async ({ page }) => {
    await open(page, { rooms: { 3: { fav: true, note: "nice", rating: 4 } } });
    await openRoom(page, "3");
    await page.click("#tip .favb");
    expect(await saved(page)).toEqual({ 3: { note: "nice", rating: 4 } });
  });

  test("list is in floor order and clicking an entry opens that room", async ({ page }) => {
    await open(page, { rooms: { 7: { fav: true }, 3: { fav: true }, Tuinzaal: { fav: true } } });
    const order = await page.evaluate(() => Object.keys(spots).filter(r => ["3", "7", "Tuinzaal"].includes(r)).sort(byOrder));
    await expect(page.locator("#favs [data-go]")).toHaveCount(3);
    expect(await page.locator("#favs [data-go]").evaluateAll(bs => bs.map(b => b.dataset.go))).toEqual(order);
    await page.click("#favs [data-go='7']");
    await expect(page.locator("#tip h2")).toHaveText("Room 7");
  });

  test("saved favorites for rooms that no longer exist are ignored", async ({ page }) => {
    await open(page, { rooms: { 3: { fav: true }, "Room that was removed": { fav: true } } });
    await expect(page.locator("#favs li")).toHaveCount(1);
    await expect(page.locator("#favcount")).toHaveText("(1)");
  });
});

test.describe("sharing favorites", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { navigator.share = async d => { window.__shared = d; }; });
  });

  test("share link lists the favorites in floor order", async ({ page }) => {
    await open(page, { rooms: { "Friesland foyer": { fav: true }, 3: { fav: true }, 7: { visited: true } } });
    await page.click("#share");
    await expect.poll(() => page.evaluate(() => window.__shared)).toBeTruthy();
    const url = new URL(await page.evaluate(() => window.__shared.url));
    const rooms = decodeURIComponent(url.hash.replace(/^#fav=/, "")).split(",");
    expect(rooms.sort()).toEqual(["3", "Friesland foyer"]);
    expect(url.pathname).toMatch(/\/2026\/$/);
  });

  test("sharing with no favorites shows a message", async ({ page }) => {
    await open(page);
    await page.click("#share");
    await expect(page.locator("#msg")).toHaveText(/Add some favorites first/);
    expect(await page.evaluate(() => window.__shared)).toBeUndefined();
  });

  test("falls back to the clipboard without the share sheet", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => { delete Navigator.prototype.share; navigator.share = undefined; });
    await open(page, { rooms: { 3: { fav: true } } });
    await page.click("#share");
    await expect(page.locator("#msg")).toHaveText(/Link copied/);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/#fav=3$/);
  });
});

test.describe("importing shared favorites", () => {
  test("asks, then adds the shared rooms and clears the link", async ({ page }) => {
    const asked = answerDialog(page, true);
    await open(page, { hash: "#fav=3,Friesland%20foyer" });
    expect(await asked).toMatch(/Add 2 shared favorites \(Room 3, Friesland foyer\)/);
    await expect(page.locator("#favs li")).toHaveCount(2);
    expect(await saved(page)).toEqual({ 3: { fav: true }, "Friesland foyer": { fav: true } });
    expect(new URL(page.url()).hash).toBe("");
    await expect(page.locator("#msg")).toHaveText(/Added 2 favorites/);
  });

  test("declining adds nothing and still clears the link", async ({ page }) => {
    const asked = answerDialog(page, false);
    await open(page, { hash: "#fav=3" });
    await asked;
    expect(await saved(page)).toEqual({});
    expect(new URL(page.url()).hash).toBe("");
  });

  test("keeps existing favorites and other room data", async ({ page }) => {
    answerDialog(page, true);
    await open(page, { rooms: { 7: { fav: true }, 3: { note: "check the amps" } }, hash: "#fav=3" });
    await expect(page.locator("#favs li")).toHaveCount(2);
    expect(await saved(page)).toEqual({ 7: { fav: true }, 3: { note: "check the amps", fav: true } });
  });

  test("skips rooms that are already favorites or unknown", async ({ page }) => {
    const asked = answerDialog(page, true);
    await open(page, { rooms: { 3: { fav: true } }, hash: "#fav=3,7,NoSuchRoom" });
    expect(await asked).toMatch(/Add 1 shared favorite \(Room 7\)/);
    expect(Object.keys(await saved(page)).sort()).toEqual(["3", "7"]);
  });

  test("does not ask when everything is already a favorite", async ({ page }) => {
    let asked = false;
    page.on("dialog", d => { asked = true; d.dismiss(); });
    await open(page, { rooms: { 3: { fav: true } }, hash: "#fav=3" });
    await page.waitForTimeout(300);
    expect(asked).toBe(false);
    expect(new URL(page.url()).hash).toBe("");
  });

  test("a room listed twice is counted once", async ({ page }) => {
    const asked = answerDialog(page, true);
    await open(page, { hash: "#fav=7,7" });
    expect(await asked).toMatch(/Add 1 shared favorite \(Room 7\)/);
    await expect(page.locator("#msg")).toHaveText(/Added 1 favorite\b/);
  });

  test("a malformed link does not break the page", async ({ page }) => {
    await open(page, { hash: "#fav=%E0%A4%A,3" });
    expect(page.errors).toEqual([]);
    await openRoom(page, "3"); // app still works
  });

  test("a shared link opened while the app is already open is imported", async ({ page }) => {
    await open(page);
    const asked = answerDialog(page, true);
    await page.evaluate(() => { location.hash = "#fav=3"; });
    expect(await asked).toMatch(/Add 1 shared favorite/);
    await expect(page.locator("#favs li")).toHaveCount(1);
  });

  test("round trip: a shared link reproduces the favorites in a fresh browser", async ({ page, browser }) => {
    await page.addInitScript(() => { navigator.share = async d => { window.__shared = d; }; });
    await open(page, { rooms: { 3: { fav: true }, "Friesland foyer": { fav: true }, Tuinzaal: { fav: true } } });
    await page.click("#share");
    await expect.poll(() => page.evaluate(() => window.__shared)).toBeTruthy();
    const url = await page.evaluate(() => window.__shared.url);

    const other = await (await browser.newContext()).newPage();
    answerDialog(other, true);
    await other.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await other.goto(url);
    await expect(other.locator("#favs li")).toHaveCount(3);
    expect(Object.keys(await saved(other)).sort()).toEqual(["3", "Friesland foyer", "Tuinzaal"]);
  });
});

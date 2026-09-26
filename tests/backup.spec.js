const { test, expect } = require("@playwright/test");
const { open, saved, openRoom, answerDialog, download, restore } = require("./helpers");

const DATA = {
  3: { fav: true, visited: true, rating: 5, note: "best room" },
  7: { note: "ask about the Hepta" },
  "Friesland foyer": { fav: true },
};

test.describe("backup", () => {
  test("downloads all room data as versioned JSON", async ({ page }) => {
    await open(page, { rooms: DATA });
    const { name, text } = await download(page, "#expjson");
    expect(name).toBe("dae2026-backup.json");
    expect(JSON.parse(text)).toEqual({ app: "daem-2026", version: 1, rooms: DATA });
  });

  test("works with no data yet", async ({ page }) => {
    await open(page);
    const { text } = await download(page, "#expjson");
    expect(JSON.parse(text).rooms).toEqual({});
  });
});

test.describe("restore", () => {
  const backup = rooms => ({ app: "daem-2026", version: 1, rooms });

  test("asks, then replaces all room data and repaints", async ({ page }) => {
    await open(page, { rooms: { 12: { fav: true, note: "old" } } });
    const asked = answerDialog(page, true);
    await restore(page, backup(DATA));
    expect(await asked).toMatch(/Restore 3 rooms from this backup\?/);
    await expect(page.locator("#msg")).toHaveText("Backup restored.");
    expect(await saved(page)).toEqual(DATA);

    await expect(page.locator("#favs li")).toHaveCount(2);
    await expect(page.locator(".room[data-r='3']")).toHaveClass(/\bfav\b.*\bvisited\b|\bvisited\b.*\bfav\b/);
    await expect(page.locator(".room[data-r='7']")).toHaveClass(/\bnoted\b/);
    await expect(page.locator(".room[data-r='12']")).not.toHaveClass(/\bfav\b/);
    await expect(page.locator(".room[data-r='12']")).not.toHaveClass(/\bnoted\b/);
  });

  test("cancelling leaves everything as it was", async ({ page }) => {
    await open(page, { rooms: { 12: { fav: true } } });
    const asked = answerDialog(page, false);
    await restore(page, backup(DATA));
    await asked;
    expect(await saved(page)).toEqual({ 12: { fav: true } });
    await expect(page.locator("#favs li")).toHaveCount(1);
  });

  test("the same file can be restored twice in a row", async ({ page }) => {
    await open(page);
    answerDialog(page, true);
    await restore(page, backup(DATA));
    await expect(page.locator("#msg")).toHaveText("Backup restored.");
    await page.evaluate(() => { document.getElementById("msg").textContent = ""; });
    answerDialog(page, true);
    await restore(page, backup(DATA));
    await expect(page.locator("#msg")).toHaveText("Backup restored.");
  });

  test("round trip: backup, change everything, restore", async ({ page }) => {
    await open(page, { rooms: DATA });
    const { text } = await download(page, "#expjson");
    await openRoom(page, "3");
    await page.click("#tip .favb");
    await page.fill("#tip .note", "changed");
    answerDialog(page, true);
    await restore(page, text);
    await expect(page.locator("#msg")).toHaveText("Backup restored.");
    expect(await saved(page)).toEqual(DATA);
  });

  test("restored data survives a reload", async ({ page }) => {
    await open(page);
    answerDialog(page, true);
    await restore(page, backup(DATA));
    await expect(page.locator("#msg")).toHaveText("Backup restored.");
    await page.reload();
    await expect(page.locator("#favs li")).toHaveCount(2);
  });

  test("an open popup shows the restored state", async ({ page }) => {
    await open(page);
    await openRoom(page, "3");
    answerDialog(page, true);
    await restore(page, backup(DATA));
    await expect(page.locator("#msg")).toHaveText("Backup restored.");
    await expect(page.locator("#tip .note")).toHaveValue("best room");
    await expect(page.locator("#tip .favb")).toHaveAttribute("aria-pressed", "true");
    // and editing it afterwards must not wipe other restored fields
    await page.click("#tip .rate [data-n='2']");
    expect((await saved(page))[3]).toEqual({ ...DATA[3], rating: 2 });
  });

  for (const [what, content, error] of [
    ["not JSON", "this is not json", /Could not read that file/],
    ["another app's JSON", { app: "other", rooms: {} }, /not a DAE 2026 backup/],
    ["JSON without rooms", { app: "daem-2026", version: 1 }, /not a DAE 2026 backup/],
    ["rooms as a list", { app: "daem-2026", version: 1, rooms: [] }, /not a DAE 2026 backup/],
    ["plain null", "null", /Could not read that file/],
  ]) {
    test(`rejects ${what} without touching data`, async ({ page }) => {
      await open(page, { rooms: { 12: { fav: true } } });
      let asked = false;
      page.on("dialog", d => { asked = true; d.dismiss(); });
      await restore(page, content);
      await expect(page.locator("#msg")).toHaveText(error);
      expect(asked).toBe(false);
      expect(await saved(page)).toEqual({ 12: { fav: true } });
      expect(page.errors).toEqual([]);
    });
  }

  test("invalid values inside a backup are dropped, valid ones kept", async ({ page }) => {
    await open(page);
    answerDialog(page, true);
    await restore(page, backup({
      3: { fav: true, rating: 9, note: 42, visited: "yes" },
      7: { rating: 3, evil: "<img src=x onerror=alert(1)>" },
      8: "not an object",
      9: {},
    }));
    await expect(page.locator("#msg")).toHaveText("Backup restored.");
    expect(await saved(page)).toEqual({ 3: { fav: true }, 7: { rating: 3 } });
  });

  test("a backup from a newer version is refused", async ({ page }) => {
    await open(page, { rooms: { 12: { fav: true } } });
    await restore(page, { app: "daem-2026", version: 99, rooms: DATA });
    await expect(page.locator("#msg")).toHaveText(/newer version/);
    expect(await saved(page)).toEqual({ 12: { fav: true } });
  });
});

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
    const { name, text } = await download(page);
    expect(name).toBe("dae2026-backup.json");
    expect(JSON.parse(text)).toEqual({ app: "daem-2026", version: 1, rooms: DATA });
  });

  test("works with no data yet", async ({ page }) => {
    await open(page);
    const { text } = await download(page);
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
    const { text } = await download(page);
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

test.describe("backup status", () => {
  test("is hidden until there is data, warns while unbacked, and flips after a backup", async ({ page }) => {
    await open(page);
    await expect(page.locator("#bkstatus")).toBeHidden();

    await openRoom(page, "3");
    await page.locator("#tip .favb").click();
    await expect(page.locator("#bkstatus")).toContainText("not backed up");
    await expect(page.locator("#bkstatus")).toHaveClass(/warn/);

    await download(page);
    await expect(page.locator("#bkstatus")).toContainText("Backed up");
    await expect(page.locator("#bkstatus")).not.toHaveClass(/warn/);

    await page.locator("#tip .note").fill("changed");
    await expect(page.locator("#bkstatus")).toContainText("Changed since your last backup");
  });
});

test.describe("Google Drive auto-sync", () => {
  // A fake Google sign-in and Drive: one stored file, and a log of the uploads. otherDevice() writes a newer backup.
  async function fakeGoogle(page) {
    const uploads = [];
    let stored = null;
    await page.route("https://accounts.google.com/gsi/client", r => r.fulfill({
      contentType: "text/javascript",
      body: `window.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken(){this.callback({access_token:"t",expires_in:3600})}})}}};`,
    }));
    await page.route(/googleapis\.com\/(upload\/)?drive\/v3\/files/, async r => {
      const req = r.request();
      if (req.method() === "GET") return r.fulfill({ json: { files: stored ? [{ id: "f1", modifiedTime: stored.at }] : [] } });
      const body = req.postData();
      stored = { at: new Date().toISOString(), body };
      uploads.push(req.method());
      return r.fulfill({ json: { id: "f1", modifiedTime: stored.at } });
    });
    return { uploads, stored: () => stored,
      otherDevice: body => { stored = { at: new Date(Date.now() + 5000).toISOString(), body }; } };
  }
  const driveBackup = page => page.locator("#backup").selectOption("drive");

  test("after a Drive backup, later changes upload on their own", async ({ page }) => {
    const g = await fakeGoogle(page);
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await expect(page.locator("#bkstatus")).toContainText("Changes sync to Google Drive");
    expect(g.uploads).toEqual(["POST"]);

    await openRoom(page, "7");
    await page.locator("#tip .favb").click();
    await expect.poll(() => g.uploads, { timeout: 4000 }).toEqual(["POST", "PATCH"]);
    expect(g.stored().body).toContain('"7"');
    await expect(page.locator("#bkstatus")).toContainText("Backed up");
    await expect(page.locator("#bkstatus")).not.toHaveClass(/warn/);
  });

  test("changes are not uploaded before a Drive backup has been made", async ({ page }) => {
    const g = await fakeGoogle(page);
    await open(page);
    await openRoom(page, "3");
    await page.locator("#tip .favb").click();
    await page.waitForTimeout(2000);
    expect(g.uploads).toEqual([]);
  });

  test("saving a local file while a change waits doesn't keep it from Drive", async ({ page }) => {
    const g = await fakeGoogle(page);
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await expect.poll(() => g.uploads).toEqual(["POST"]);
    await openRoom(page, "7");
    await page.locator("#tip .favb").click();
    await download(page); // inside the quiet second
    await expect.poll(() => g.uploads, { timeout: 4000 }).toEqual(["POST", "PATCH"]);
    expect(g.stored().body).toContain('"7"');
  });

  test("restoring a local file while auto-sync is on sends it to Drive", async ({ page }) => {
    const g = await fakeGoogle(page);
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await expect.poll(() => g.uploads).toEqual(["POST"]);
    answerDialog(page, true);
    await restore(page, { app: "daem-2026", version: 1, rooms: { 9: { note: "from file" } } });
    await expect.poll(() => g.uploads, { timeout: 4000 }).toEqual(["POST", "PATCH"]);
    expect(g.stored().body).toContain("from file");
  });

  test("leaving the page doesn't overwrite another device's newer backup", async ({ page }) => {
    const g = await fakeGoogle(page);
    await page.clock.install();
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await expect.poll(() => g.uploads).toEqual(["POST"]);
    await page.clock.fastForward("00:31"); // this page last looked at Drive over 30 s ago
    g.otherDevice('{"from":"other device"}');
    await openRoom(page, "7");
    await page.locator("#tip .favb").click();
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect(page.locator("#msg")).toHaveText(/Auto-sync stopped/);
    expect(g.uploads).toEqual(["POST"]);
    expect(g.stored().body).toContain("other device");
  });

  test("leaving the page after a quiet spell checks Drive, then sends the change", async ({ page }) => {
    const g = await fakeGoogle(page);
    await page.clock.install();
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await expect.poll(() => g.uploads).toEqual(["POST"]);
    await page.clock.fastForward("00:31");
    await openRoom(page, "7");
    await page.locator("#tip .favb").click();
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect.poll(() => g.uploads).toEqual(["POST", "PATCH"]);
    expect(g.stored().body).toContain('"7"');
  });

  test("two quick Drive backups make one file", async ({ page }) => {
    const g = await fakeGoogle(page);
    // Slow lookups, so the second backup starts before the first has created the file.
    await page.route(/googleapis\.com\/drive\/v3\/files\?/, async r => { await new Promise(ok => setTimeout(ok, 300)); await r.fallback(); });
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await driveBackup(page);
    await expect.poll(() => g.uploads).toEqual(["POST", "PATCH"]);
  });
});

test("Drive auto-sync waits until a note has stopped changing", async ({ page }) => {
  const uploads = [];
  await page.route("https://accounts.google.com/gsi/client", r => r.fulfill({
    contentType: "text/javascript",
    body: `window.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken(){this.callback({access_token:"t",expires_in:3600})}})}}};`,
  }));
  await page.route(/googleapis\.com\/(upload\/)?drive\/v3\/files/, r => {
    const req = r.request();
    if (req.method() === "GET") return r.fulfill({ json: { files: [] } });
    uploads.push(req.postData());
    return r.fulfill({ json: { id: "f1", modifiedTime: new Date().toISOString() } });
  });
  await open(page, { rooms: { 3: { fav: true } } });
  await page.locator("#backup").selectOption("drive");
  await expect.poll(() => uploads.length).toBe(1);

  await openRoom(page, "3");
  const note = page.locator("#tip .note");
  await note.click();
  // Keeps typing for ~2.5 s with short gaps: nothing is sent until the typing pauses.
  for (const ch of "hello wor") { await note.pressSequentially(ch); await page.waitForTimeout(280); }
  expect(uploads.length).toBe(1);
  await expect.poll(() => uploads.length, { timeout: 3000 }).toBe(2);
  expect(uploads[1]).toContain("hello wor");

  // Clicking away doesn't wait out the second.
  await note.click();
  await note.pressSequentially("ld");
  await page.locator("h1").click();
  await expect.poll(() => uploads.length, { timeout: 900 }).toBe(3);
  expect(uploads[2]).toContain("hello world");
});

test("Drive auto-sync sends a pending change when the page is hidden or closing", async ({ page }) => {
  const seen = [];
  await page.route("https://accounts.google.com/gsi/client", r => r.fulfill({
    contentType: "text/javascript",
    body: `window.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken(){this.callback({access_token:"t",expires_in:3600})}})}}};`,
  }));
  await page.route(/googleapis\.com\/(upload\/)?drive\/v3\/files/, r => {
    const req = r.request();
    seen.push(req.method() + " " + new URL(req.url()).pathname);
    if (req.method() === "GET") return r.fulfill({ json: { files: [] } });
    return r.fulfill({ json: { id: "f1", modifiedTime: new Date().toISOString() } });
  });
  await open(page, { rooms: { 3: { fav: true } } });
  await page.locator("#backup").selectOption("drive");
  await expect.poll(() => seen.length).toBe(2); // GET (find), POST (create)

  await openRoom(page, "7");
  await page.locator("#tip .favb").click();
  seen.length = 0;
  await page.evaluate(() => addEventListener("pagehide", () => {}) || window.dispatchEvent(new Event("pagehide")));
  // One request, straight to the remembered file, without the extra lookup.
  await expect.poll(() => seen).toEqual(["PATCH /upload/drive/v3/files/f1"]);
  await expect(page.locator("#bkstatus")).not.toHaveClass(/warn/);
});

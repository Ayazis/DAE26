// Google Drive backup (gdrive.js) against a fake Google: restore, sign-in and network failures, and when auto-sync stops.
const { test, expect } = require("./fixtures");
const { open, saved, openRoom, answerDialog, fakeGoogle } = require("./helpers");

const driveBackup = page => page.locator("#backup").selectOption("drive");
const driveRestore = page => page.locator("#restore").selectOption("drive");
const backupFile = rooms => JSON.stringify({ app: "daem-2026", version: 1, rooms });
const signIn = (page, answer) => page.evaluate(a => { window.__signIn = a; }, answer);

test.describe("restore from Google Drive", () => {
  test("says so when there is no backup yet", async ({ page }) => {
    await fakeGoogle(page);
    await open(page, { rooms: { 3: { fav: true } } });
    await driveRestore(page);
    await expect(page.locator("#msg")).toHaveText("No backup found in Google Drive yet.");
    expect(await saved(page)).toEqual({ 3: { fav: true } });
  });

  test("asks, replaces the local data with the Drive backup, then keeps syncing", async ({ page }) => {
    const g = await fakeGoogle(page);
    g.otherDevice(backupFile({ 7: { fav: true, note: "from my phone" }, 3: { rating: 9 } }));
    await open(page, { rooms: { 3: { fav: true } } });
    const asked = answerDialog(page, true);
    await driveRestore(page);
    expect(await asked).toMatch(/^Restore 1 room from the Google Drive backup from .+\? This replaces/);
    await expect(page.locator("#msg")).toHaveText("Backup restored.");
    expect(await saved(page)).toEqual({ 7: { fav: true, note: "from my phone" } }); // room 3 had only an invalid rating
    await expect(page.locator("#favs li")).toHaveCount(1);
    await expect(page.locator("#bkstatus")).toContainText("Changes sync to Google Drive");

    await openRoom(page, "7");
    await page.click("#tip .vis");
    await expect.poll(() => g.uploads, { timeout: 4000 }).toEqual(["PATCH"]);
    expect(JSON.parse(g.stored.body).rooms[7]).toEqual({ fav: true, note: "from my phone", visited: true });
  });

  test("cancelling keeps the local data and doesn't start syncing", async ({ page }) => {
    const g = await fakeGoogle(page);
    g.otherDevice(backupFile({ 7: { fav: true } }));
    await open(page, { rooms: { 3: { fav: true } } });
    answerDialog(page, false);
    await driveRestore(page);
    await expect(page.locator("#bkstatus")).toContainText("not backed up");
    expect(await saved(page)).toEqual({ 3: { fav: true } });
    await openRoom(page, "3");
    await page.click("#tip .vis");
    await page.waitForTimeout(1500);
    expect(g.uploads).toEqual([]);
  });

  test("a Drive file that isn't a backup is refused", async ({ page }) => {
    const g = await fakeGoogle(page);
    g.otherDevice('{"app":"something else"}');
    await open(page, { rooms: { 3: { fav: true } } });
    await driveRestore(page);
    await expect(page.locator("#msg")).toHaveText("Google Drive: not a DAE 2026 backup.");
    expect(await saved(page)).toEqual({ 3: { fav: true } });
  });
});

test.describe("sign-in", () => {
  test("the first sign-in asks for consent, later ones don't", async ({ page }) => {
    await fakeGoogle(page);
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await expect(page.locator("#msg")).toHaveText(/Backed up to Google Drive/);
    await page.reload(); // the token lives only in memory
    await driveBackup(page);
    await expect(page.locator("#msg")).toHaveText(/Backed up to Google Drive/);
    expect(await page.evaluate(() => window.__prompts)).toEqual([""]); // cloudSeen is remembered
  });

  for (const [what, answer, text] of [
    ["denying access", { error: "access_denied" }, "Google Drive: sign-in cancelled."],
    ["closing the popup", { errorType: "popup_closed" }, "Google Drive: sign-in cancelled."],
    ["a popup that fails", { errorType: "popup_failed_to_open" }, "Google Drive: sign-in failed."],
    ["another sign-in error", { error: "invalid_client" }, "Google Drive: invalid_client."],
  ])
    test(`${what} shows a message and changes nothing`, async ({ page }) => {
      const g = await fakeGoogle(page);
      await open(page, { rooms: { 3: { fav: true } } });
      await signIn(page, answer);
      await driveBackup(page);
      await expect(page.locator("#msg")).toHaveText(text);
      expect(g.uploads).toEqual([]);
      await expect(page.locator("#bkstatus")).toContainText("not backed up");
      expect(page.errors).toEqual([]);
    });

  test("if Google's script can't load (offline), it is tried again on the next click", async ({ page }) => {
    const g = await fakeGoogle(page);
    let tries = 0; // routed after the fake, so this answers first: fail once, then hand over to the fake
    await page.route("https://accounts.google.com/gsi/client", r => ++tries === 1 ? r.abort() : r.fallback());
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await expect(page.locator("#msg")).toHaveText("Google Drive: Google sign-in is unavailable (offline?).");
    await driveBackup(page);
    await expect(page.locator("#msg")).toHaveText(/Backed up to Google Drive/);
    expect(g.uploads).toEqual(["POST"]);
  });
});

test.describe("Drive errors", () => {
  test("an expired session asks to sign in again on the next try", async ({ page }) => {
    const g = await fakeGoogle(page);
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await expect(page.locator("#msg")).toHaveText(/Backed up to Google Drive/);
    g.failNext(401);
    await driveBackup(page);
    await expect(page.locator("#msg")).toHaveText("Google Drive: session expired, try again.");
    await driveBackup(page);
    await expect(page.locator("#msg")).toHaveText(/Backed up to Google Drive/);
    expect(await page.evaluate(() => window.__prompts.length)).toBe(2);
  });

  test("a server error is reported with its status", async ({ page }) => {
    const g = await fakeGoogle(page);
    await open(page, { rooms: { 3: { fav: true } } });
    g.failNext(503);
    await driveBackup(page);
    await expect(page.locator("#msg")).toHaveText("Google Drive: Google Drive error 503.");
    expect(g.uploads).toEqual([]);
  });

  test("an error during auto-sync stops it and says why", async ({ page }) => {
    const g = await fakeGoogle(page);
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await expect(page.locator("#bkstatus")).toContainText("Changes sync to Google Drive");
    await openRoom(page, "7");
    g.failNext(500);
    await page.click("#tip .favb");
    await expect(page.locator("#msg")).toHaveText("Google Drive: Google Drive error 500.", { timeout: 4000 });
    await expect(page.locator("#bkstatus")).not.toContainText("Changes sync");
    await expect(page.locator("#bkstatus")).toContainText("Changed since your last backup");
  });
});

test.describe("another device's backup", () => {
  test("backing up over a newer backup asks first; declining uploads nothing", async ({ page }) => {
    const g = await fakeGoogle(page);
    g.otherDevice(backupFile({ 9: { fav: true } }));
    await open(page, { rooms: { 3: { fav: true } } });
    const asked = answerDialog(page, false);
    await driveBackup(page);
    expect(await asked).toMatch(/^A backup from .+ already exists in Google Drive and is newer/);
    await page.waitForTimeout(300);
    expect(g.uploads).toEqual([]);
    expect(JSON.parse(g.stored.body).rooms).toEqual({ 9: { fav: true } });
  });

  test("accepting replaces it", async ({ page }) => {
    const g = await fakeGoogle(page);
    g.otherDevice(backupFile({ 9: { fav: true } }));
    await open(page, { rooms: { 3: { fav: true } } });
    answerDialog(page, true);
    await driveBackup(page);
    await expect.poll(() => g.uploads).toEqual(["PATCH"]);
    await expect(page.locator("#msg")).toHaveText(/Backed up to Google Drive/);
  });

  test("auto-sync stops as soon as a burst of changes finds a newer backup", async ({ page }) => {
    const g = await fakeGoogle(page);
    await page.clock.install();
    await open(page, { rooms: { 3: { fav: true } } });
    await driveBackup(page);
    await expect.poll(() => g.uploads).toEqual(["POST"]);
    await page.clock.fastForward("00:31"); // past the 30 s in which the last look at Drive still counts
    g.otherDevice(backupFile({ 9: { fav: true } }));
    await openRoom(page, "7");
    await page.click("#tip .favb");
    await expect(page.locator("#msg")).toHaveText(/Auto-sync stopped/);
    await page.clock.fastForward("00:02");
    expect(g.uploads).toEqual(["POST"]);
    await expect(page.locator("#bkstatus")).not.toContainText("Changes sync");
  });
});

test("auto-sync ends when the sign-in expires", async ({ page }) => {
  const g = await fakeGoogle(page);
  await page.clock.install();
  await open(page, { rooms: { 3: { fav: true } } });
  await signIn(page, { access_token: "t", expires_in: 120 }); // usable for 60 s (a minute is kept as margin)
  await driveBackup(page);
  await expect(page.locator("#bkstatus")).toContainText("Changes sync to Google Drive");
  await page.clock.fastForward("01:01");
  await expect(page.locator("#bkstatus")).not.toContainText("Changes sync");
  await expect(page.locator("#bkstatus")).toContainText("Backed up");

  await openRoom(page, "7");
  await page.click("#tip .favb");
  await page.clock.fastForward("00:05");
  expect(g.uploads).toEqual(["POST"]);
  await expect(page.locator("#bkstatus")).toContainText("Changed since your last backup");
});

test("a change undone before auto-sync runs uploads nothing", async ({ page }) => {
  const g = await fakeGoogle(page);
  await open(page, { rooms: { 3: { fav: true } } });
  await driveBackup(page);
  await expect.poll(() => g.uploads).toEqual(["POST"]);
  await openRoom(page, "7");
  await page.click("#tip .favb");
  await page.click("#tip .favb"); // back to what Drive already has
  await page.waitForTimeout(1500);
  expect(g.uploads).toEqual(["POST"]);
  await expect(page.locator("#bkstatus")).toContainText("Changes sync to Google Drive");
});

test("switching to another tab sends a pending change right away", async ({ page }) => {
  const g = await fakeGoogle(page);
  await open(page, { rooms: { 3: { fav: true } } });
  await driveBackup(page);
  await expect.poll(() => g.uploads).toEqual(["POST"]);
  await openRoom(page, "7");
  await page.click("#tip .favb");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => g.uploads, { timeout: 500 }).toEqual(["POST", "PATCH"]); // not after the usual second
  expect(g.stored.body).toContain('"7"');
});

test("a Drive option picked before gdrive.js has loaded asks to try again", async ({ page }) => {
  await page.route(/\/gdrive\.js$/, r => r.abort()); // not loaded (yet): window.cloudBackup is unset
  await open(page);
  await driveBackup(page);
  await expect(page.locator("#msg")).toHaveText("Google Drive is still loading, try again in a moment.");
  await driveRestore(page);
  await expect(page.locator("#msg")).toHaveText("Google Drive is still loading, try again in a moment.");
  await expect(page.locator("#backup")).toHaveValue("");
});

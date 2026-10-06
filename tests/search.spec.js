const { test, expect } = require("./fixtures");
const { open } = require("./helpers");

const hitRooms = page => page.locator("#hits [data-go]").evaluateAll(bs => bs.map(b => b.dataset.go));

test.describe("search", () => {
  test("a brand lists its rooms; clicking one opens it with the brand marked", async ({ page }) => {
    await open(page);
    await page.fill("#q", "dynaudio");
    await expect(page.locator("#hits .count")).toHaveText(/^\d+ rooms?:$/);
    const rooms = await hitRooms(page);
    expect(rooms).toContain("3");
    await expect(page.locator(".room.hit")).toHaveCount(rooms.length);
    await expect(page.locator(".room[data-r='50']")).toHaveClass(/\bdim\b/); // everything else fades
    await page.click("#hits [data-go='3']");
    await expect(page.locator("#tip h2")).toHaveText("Room 3");
    await expect(page.locator("#tip mark").first()).toHaveText(/dynaudio/i);
  });

  test("a room number matches only that room, not every room containing the digits", async ({ page }) => {
    await open(page);
    await page.fill("#q", "11");
    await expect.poll(() => hitRooms(page)).toEqual(["11"]);
    await expect(page.locator("#hits .count")).toHaveText("1 room:");
    await expect(page.locator("#tip h2")).toHaveText("Room 11"); // a single hit opens its room
  });

  test("part of a hall's name finds it", async ({ page }) => {
    await open(page);
    await page.fill("#q", "kempen");
    await expect.poll(() => hitRooms(page)).toContain("Kempenzaal");
  });

  test("no match says so, with the query escaped", async ({ page }) => {
    await open(page);
    await page.fill("#q", "<i>zzqx</i>");
    await expect(page.locator("#hits .none")).toHaveText("No room matches “<i>zzqx</i>”.");
    await expect(page.locator("#hits i")).toHaveCount(0);
    await expect(page.locator(".room.hit")).toHaveCount(0);
  });

  test("clearing the search restores the map", async ({ page }) => {
    await open(page);
    await page.fill("#q", "dynaudio");
    await expect(page.locator(".room.dim").first()).toBeAttached();
    await page.fill("#q", "");
    await expect(page.locator("#hits")).toBeEmpty();
    await expect(page.locator(".room.dim, .room.hit")).toHaveCount(0);
  });

  test("an open tooltip follows the search and marks the match", async ({ page }) => {
    await open(page);
    await page.locator(".room[data-r='3']").focus();
    await page.keyboard.press("Enter");
    await page.fill("#q", "octave");
    await expect(page.locator("#tip .brands mark")).toHaveText("Octave");
  });
});

test.describe("settings", () => {
  test("dark mode toggles and is remembered", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await open(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("#theme")).toHaveAttribute("aria-checked", "false");
    await page.click("#theme");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#theme")).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.click("#theme");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("the first visit follows the system's dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await open(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("switching to Dutch translates the page, the map and the open tooltip, and is remembered", async ({ page }) => {
    await open(page, { rooms: { 3: { fav: true } } });
    await page.locator(".room[data-r='3']").focus();
    await page.keyboard.press("Enter");
    await page.click("#lang");
    await expect(page.locator("html")).toHaveAttribute("lang", "nl");
    await expect(page.locator("h1")).toHaveText("Dutch Audio Event 2026 · Interactieve plattegrond");
    await expect(page.locator("#lang")).toHaveText("EN");
    await expect(page.locator("#q")).toHaveAttribute("placeholder", "Zoek een merk, exposant, ruimte of notitie…");
    await expect(page.locator("#tip h2")).toHaveText("Kamer 3");
    await expect(page.locator("#tip .vis")).toHaveText("Markeer bezocht");
    await expect(page.locator("#tip .ztag")).toHaveText("rode zone");
    await expect(page.locator(".room[data-r='50']")).toHaveAttribute("aria-label", "Kamer 50, Niet in gebruik");
    await expect(page.locator(".icon title").first()).not.toHaveText(/Toilets|Elevator|Info point|Wardrobe|First aid/);
    await expect(page.locator("#favs li")).toContainText("Kamer 3");
    expect(await page.title()).toBe("DAE 2026 Interactieve plattegrond");

    await page.locator("#tip .vis").click(); // saving room state after the switch must keep the language
    await page.reload();
    await expect(page.locator("h1")).toHaveText(/Interactieve plattegrond/);
    await page.click("#lang");
    await expect(page.locator("h1")).toHaveText("Dutch Audio Event 2026 · Interactive Floorplan");
    await expect(page.locator(".room[data-r='50']")).toHaveAttribute("aria-label", "Room 50, Not in use");
  });

  test.describe("with a Dutch browser", () => {
    test.use({ locale: "nl-NL" });

    test("the first visit is in Dutch", async ({ page }) => {
      await open(page);
      await expect(page.locator("html")).toHaveAttribute("lang", "nl");
      await expect(page.locator("#favs .empty")).toHaveText(/^Tik op ☆/);
    });
  });

  test("the terms page has its own language switch", async ({ page }) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await page.goto("terms.html");
    await expect(page.locator("h1")).toHaveText("Terms of service");
    await page.click("#lang");
    await expect(page.locator("h1")).toHaveText("Gebruiksvoorwaarden");
    expect(await page.title()).toBe(await page.evaluate(() => I18N.nl.tos_title));
    await page.click("#lang");
    await expect(page.locator("h1")).toHaveText("Terms of service");
  });

  test("a corrupt saved state doesn't break the app", async ({ page }) => {
    await page.addInitScript(() => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", 1); localStorage.setItem("daem-2026-v1", "{not json"); } });
    await open(page);
    await expect(page.locator("#favs .empty")).toBeVisible();
    expect(page.errors).toEqual([]);
  });
});

test.describe("share fallbacks", () => {
  test("if the share sheet fails, the link is offered to copy by hand", async ({ page }) => {
    await page.addInitScript(() => { navigator.share = async () => { throw new DOMException("nope", "NotAllowedError"); }; });
    await open(page, { rooms: { 3: { fav: true } } });
    const prompted = new Promise(ok => page.once("dialog", async d => { ok([d.type(), d.message(), d.defaultValue()]); await d.dismiss(); }));
    await page.click("#share");
    const [type, message, url] = await prompted;
    expect(type).toBe("prompt");
    expect(message).toBe("Copy this link:");
    expect(url).toMatch(/\/2026\/#fav=3$/);
  });

  test("closing the share sheet does nothing", async ({ page }) => {
    await page.addInitScript(() => { navigator.share = async () => { throw new DOMException("closed", "AbortError"); }; });
    await open(page, { rooms: { 3: { fav: true } } });
    let dialogs = 0;
    page.on("dialog", d => { dialogs++; d.dismiss(); });
    await page.click("#share");
    await page.waitForTimeout(300);
    expect(dialogs).toBe(0);
    await expect(page.locator("#msg")).toBeEmpty();
  });
});

test("the backup notice's button jumps to the Backup menu", async ({ page }) => {
  await open(page, { rooms: { 3: { fav: true } } });
  await expect(page.locator("#bkstatus")).toContainText("not backed up");
  await page.click("#bkstatus .linkbtn");
  await expect(page.locator("#backup")).toBeFocused();
});

// The feature flags at the top of app.js. The page gets app.js with the flags changed; everything else is as shipped.
const fs = require("fs");
const path = require("path");
const { test, expect } = require("./fixtures");
const { open, openRoom } = require("./helpers");

const SRC = fs.readFileSync(path.join(__dirname, "../2026/app.js"), "utf8");

// Serves app.js with `flags` set. Each value keeps its original length (padded, or without the space after the colon),
// so coverage offsets still line up with the file on disk.
async function withFeatures(page, flags) {
  let src = SRC;
  for (const [k, v] of Object.entries(flags)) {
    const m = src.match(new RegExp(`(${k}): (true|false)`));
    if (!m) throw new Error("no flag " + k);
    const want = String(v), len = m[0].length;
    const next = `${k}: ${want}`.length <= len ? `${k}: ${want}`.padEnd(len) : `${k}:${want}`;
    if (next.length !== len) throw new Error("can't keep the length of " + k);
    src = src.replace(m[0], next);
  }
  await page.route(/\/2026\/app\.js$/, r => r.fulfill({ contentType: "text/javascript", body: src }));
}

test("as shipped: no zone buttons or High res switch, Google Drive offered", async ({ page }) => {
  await open(page);
  await expect(page.locator("#zones button")).toHaveCount(0);
  await expect(page.locator("#hires")).toBeHidden();
  await expect(page.locator("#backup option[value='drive']")).toHaveCount(1);
  await expect(page.locator("#restore option[value='drive']")).toHaveCount(1);
});

test("cloud backup off: no Drive options, and Google's code is never loaded", async ({ page }) => {
  const requested = [];
  page.on("request", r => requested.push(r.url()));
  await withFeatures(page, { cloudBackup: false });
  await open(page);
  await expect(page.locator("#backup option")).toHaveCount(2);
  await expect(page.locator("#restore option")).toHaveCount(2);
  await page.waitForLoadState("networkidle");
  expect(requested.filter(u => /gdrive\.js|google\.com|googleapis\.com\/(upload|drive)/.test(u))).toEqual([]);
});

test.describe("zone toggles", () => {
  const zoneButton = (page, id) => page.locator(`#zones [data-z='${id}']`);
  const shown = page => page.locator(".room[tabindex]:not(.zhide)");

  test("hiding zones hides their rooms and zooms to the rest; showing all again resets", async ({ page }) => {
    await withFeatures(page, { zoneToggles: true });
    await open(page);
    await expect(page.locator("#zones button")).toHaveCount(4);
    const all = await shown(page).count();
    const vb0 = await page.evaluate(() => svg.getAttribute("viewBox"));

    await zoneButton(page, "red").click(); // all but red
    await expect(zoneButton(page, "red")).toHaveAttribute("aria-pressed", "false");
    await expect(zoneButton(page, "blue")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".room.z-red:not(.zhide)")).toHaveCount(0);
    await expect(page.locator("#svg")).toHaveClass(/\bzoned\b/);
    for (const id of ["blue", "green"]) await zoneButton(page, id).click();
    // Only yellow left: its rooms are all that is shown, and the view closes in on them.
    await expect(shown(page)).toHaveCount(await page.locator(".room[tabindex].z-yellow").count());
    await expect.poll(() => page.evaluate(() => svg.getAttribute("viewBox"))).not.toBe(vb0);
    await expect(page.locator("#zclip rect")).toHaveCount(1);

    for (const id of ["red", "blue", "green"]) await zoneButton(page, id).click();
    await expect(page.locator("#svg")).not.toHaveClass(/\bzoned\b/);
    await expect(shown(page)).toHaveCount(all);
    await expect(page.locator(".zhide")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => svg.getAttribute("viewBox"))).toBe(vb0);
  });

  test("hiding the zone of the open room closes its tooltip", async ({ page }) => {
    await withFeatures(page, { zoneToggles: true });
    await open(page);
    await openRoom(page, "3"); // red
    await zoneButton(page, "blue").click();
    await expect(page.locator("#tip")).toBeVisible();
    await zoneButton(page, "red").click();
    await expect(page.locator("#tip")).toBeHidden();
  });

  test("search only finds rooms in the shown zones", async ({ page }) => {
    await withFeatures(page, { zoneToggles: true });
    await open(page);
    await zoneButton(page, "red").click();
    await page.fill("#q", "dynaudio"); // room 3 is red
    await expect(page.locator(".room[data-r='3']")).not.toHaveClass(/\bhit\b/);
    await expect(page.locator(".room[data-r='3']")).toHaveClass(/\bdim\b/);
  });
});

test.describe("High res switch", () => {
  test("switching it off shows the original plan image, and the choice is remembered", async ({ page }) => {
    await withFeatures(page, { planToggle: true });
    await open(page);
    const hires = page.locator("#hires");
    await expect(hires).toBeVisible();
    await expect(hires).toHaveAttribute("aria-checked", "true");
    await expect(page.locator(".l-orig image")).not.toHaveAttribute("href", /./); // the 700 KB image isn't fetched yet

    await hires.click();
    await expect(hires).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("#svg")).toHaveClass(/\bshow-orig\b/);
    await expect(page.locator(".l-orig image")).toHaveAttribute("href", "plan.jpg");
    await openRoom(page, "45"); // rooms still work on top of the image

    await page.reload();
    await expect(page.locator("#svg")).toHaveClass(/\bshow-orig\b/);
    await page.click("#hires");
    await expect(page.locator("#svg")).not.toHaveClass(/\bshow-orig\b/);
  });
});

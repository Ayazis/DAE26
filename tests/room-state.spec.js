const { test, expect } = require("@playwright/test");
const { open, saved, openRoom, answerDialog } = require("./helpers");

test.describe("notes, visited and ratings", () => {
  test("a note is saved as you type and survives a reload", async ({ page }) => {
    await open(page);
    await openRoom(page, "3");
    await page.fill("#tip .note", "Listen to the Contour 60");
    expect(await saved(page)).toEqual({ 3: { note: "Listen to the Contour 60" } });
    await expect(page.locator(".room[data-r='3']")).toHaveClass(/\bnoted\b/);

    await page.reload();
    await openRoom(page, "3");
    await expect(page.locator("#tip .note")).toHaveValue("Listen to the Contour 60");
  });

  test("clearing a note removes it", async ({ page }) => {
    await open(page, { rooms: { 3: { note: "x" } } });
    await openRoom(page, "3");
    await page.fill("#tip .note", "");
    expect(await saved(page)).toEqual({});
    await expect(page.locator(".room[data-r='3']")).not.toHaveClass(/\bnoted\b/);
  });

  test("notes are searchable", async ({ page }) => {
    await open(page, { rooms: { 3: { note: "bring the test record" } } });
    await page.fill("#q", "test record");
    await expect(page.locator(".room[data-r='3']")).toHaveClass(/\bhit\b/);
  });

  test("mark visited toggles on and off", async ({ page }) => {
    await open(page);
    await openRoom(page, "3");
    await page.click("#tip .vis");
    await expect(page.locator("#tip .vis")).toHaveText("✓ Visited");
    await expect(page.locator(".room[data-r='3']")).toHaveClass(/\bvisited\b/);
    expect(await saved(page)).toEqual({ 3: { visited: true } });
    await expect(page.locator("#progress")).toContainText("1 of");

    await page.click("#tip .vis");
    await expect(page.locator("#tip .vis")).toHaveText("Mark visited");
    expect(await saved(page)).toEqual({});
  });

  test("progress counts visited favorites", async ({ page }) => {
    await open(page, { rooms: { 3: { fav: true, visited: true }, 7: { fav: true }, 8: { visited: true } } });
    await expect(page.locator("#progress")).toContainText("1 of 2 favorites visited");
    await expect(page.locator("#progress")).toContainText("2 of");
  });

  test("rating: pick stars, pick the same star again to clear", async ({ page }) => {
    await open(page);
    await openRoom(page, "3");
    await page.click("#tip .rate [data-n='4']");
    expect(await saved(page)).toEqual({ 3: { rating: 4 } });
    await expect(page.locator("#tip .rate [aria-pressed='true']")).toHaveCount(4);

    await page.click("#tip .rate [data-n='2']");
    expect(await saved(page)).toEqual({ 3: { rating: 2 } });
    await expect(page.locator("#tip .rate [aria-pressed='true']")).toHaveCount(2);

    await page.click("#tip .rate [data-n='2']");
    expect(await saved(page)).toEqual({});
    await expect(page.locator("#tip .rate [aria-pressed='true']")).toHaveCount(0);
  });

  test("popup shows the saved state when reopened", async ({ page }) => {
    await open(page, { rooms: { 3: { fav: true, visited: true, rating: 3, note: "hi" } } });
    await openRoom(page, "3");
    await expect(page.locator("#tip .favb")).toHaveText("★");
    await expect(page.locator("#tip .vis")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#tip .rate [aria-pressed='true']")).toHaveCount(3);
    await expect(page.locator("#tip .note")).toHaveValue("hi");
  });

  test("favorites list shows visited, rating and note", async ({ page }) => {
    await open(page, { rooms: { 3: { fav: true, visited: true, rating: 2, note: "<b>loud</b>" } } });
    const li = page.locator("#favs li");
    await expect(li).toHaveClass(/visited/);
    await expect(li.locator(".fx")).toHaveText("✓ ★★");
    await expect(li.locator(".fn")).toHaveText("<b>loud</b>"); // escaped, not rendered as HTML
  });

  test("the list updates live while editing in the popup", async ({ page }) => {
    await open(page, { rooms: { 3: { fav: true } } });
    await openRoom(page, "3");
    await page.fill("#tip .note", "live");
    await page.click("#tip .rate [data-n='5']");
    await expect(page.locator("#favs .fn")).toHaveText("live");
    await expect(page.locator("#favs .fx")).toHaveText("★★★★★");
  });
});

test("rooms without exhibitors open as not in use and can't be favorited", async ({ page }) => {
  const asked = answerDialog(page, true);
  await open(page, { hash: "#fav=50,3" }); // a shared link can't smuggle one in either
  expect(await asked).not.toContain("Room 50");
  expect(Object.keys(await saved(page))).toEqual(["3"]);
  await openRoom(page, "50");
  await expect(page.locator("#tip .tb")).toHaveText("Not in use");
  await expect(page.locator("#tip .favb, #tip .note, #tip .vis")).toHaveCount(0);
  await expect(page.locator(".room[data-r='50']")).toHaveClass(/\bunused\b/);
});

test("zoomed in, a vendor with several brands is shown in bold above them", async ({ page }) => {
  await open(page);
  await page.evaluate(() => layoutRooms(8)); // enough px per unit for every line to fit
  const lines = r => page.locator(`.room[data-r='${r}'] .rbrand tspan`);
  await expect(lines("3")).toHaveText(["Dynaudio Benelux:", "Dynaudio", "Octave Audio"]);
  await expect(lines("3").first()).toHaveClass("vendor");
  await expect(lines("34")).toHaveText(["Sonos"]); // single brand: no vendor line
  await expect(page.locator(".room[data-r='34'] .vendor")).toHaveCount(0);
  await page.evaluate(() => layoutRooms(0.5)); // zoomed out, the headline is still one brand
  await expect(lines("3")).toHaveText(["Dynaudio +1"]);
});

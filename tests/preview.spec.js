const { test, expect } = require("./fixtures");
const { open, openRoom } = require("./helpers");

// Height of the preview text in lines, from its rendered height.
const lines = p => p.evaluate(n => Math.round(n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight)));

test.describe("HiFi.nl previews", () => {
  test("a preview shows its first line and expands with Read more", async ({ page }) => {
    await open(page);
    await openRoom(page, "36");
    const pv = page.locator("#tip .pv"), p = pv.locator("p"), more = pv.locator(".more");
    await expect(pv).toHaveCount(1);
    await expect(p).toBeVisible();
    expect(await lines(p)).toBe(1);
    await expect(more).toHaveText("Read more");
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await more.click();
    expect(await lines(p)).toBeGreaterThan(3);
    await expect(more).toHaveText("Show less");
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await more.click();
    expect(await lines(p)).toBe(1);
    expect(page.errors).toEqual([]);
  });

  test("the source line shows only when the paragraph is expanded, and links to HiFi.nl", async ({ page }) => {
    await open(page);
    await openRoom(page, "36");
    const src = page.locator("#tip .pv .src");
    await expect(src).toBeHidden();
    await page.click("#tip .pv .more");
    await expect(src).toBeVisible();
    await expect(src).toHaveText("Source: HiFi.nl (translated from Dutch)");
    await expect(src.locator("a")).toHaveText("HiFi.nl");
    await expect(src.locator("a")).toHaveAttribute("href", /get-your-tickets$/);
    await page.click("#tip .pv .more");
    await expect(src).toBeHidden();
  });

  test("English shows the translation, Dutch the original", async ({ page }) => {
    await open(page);
    await openRoom(page, "36");
    await page.click("#tip .pv .more");
    await expect(page.locator("#tip .pv p")).toHaveAttribute("lang", "en");
    await expect(page.locator("#tip .pv p")).toContainText("ZenSati cables");
    await page.click("#lang");
    await expect(page.locator("#tip .pv p")).toHaveAttribute("lang", "nl");
    await expect(page.locator("#tip .pv p")).toContainText("ZenSati kabels");
    await expect(page.locator("#tip .pv .src")).toHaveText("Bron: HiFi.nl");
    await expect(page.locator("#tip .pv .more")).toHaveText("Minder"); // stays expanded across the switch
  });

  test("search finds the Dutch text in English mode too", async ({ page }) => {
    await open(page);
    await page.fill("#q", "luidsprekerfabrikanten"); // Aequo Audio, only in the Dutch text
    await expect(page.locator(".room.hit")).toHaveCount(1);
    await expect(page.locator(".room[data-r='8']")).toHaveClass(/\bhit\b/);
  });

  test("the preview text is searchable and expands with the match marked", async ({ page }) => {
    await open(page);
    await page.fill("#q", "el50");
    await expect(page.locator(".room.hit")).toHaveCount(1);
    await expect(page.locator(".room[data-r='56']")).toHaveClass(/\bhit\b/);
    await expect(page.locator("#tip h2")).toHaveText("Room 56"); // a single hit opens its room
    await expect(page.locator("#tip .pv.open mark")).toHaveText("EL50");
    await expect(page.locator("#tip .pv.open mark")).toBeVisible();
  });

  test("text search needs 3 characters and a word start", async ({ page }) => {
    await open(page);
    await page.fill("#q", "mönchengladbach");
    await expect(page.locator(".room[data-r='36']")).toHaveClass(/\bhit\b/);
    await page.fill("#q", "gladbach"); // inside a word
    await expect(page.locator("#hits")).toContainText("No room matches");
  });

  test("a paragraph shared by two exhibitors shows once, with its heading", async ({ page }) => {
    await open(page);
    await openRoom(page, "7");
    await expect(page.locator("#tip .pv")).toHaveCount(1);
    await expect(page.locator("#tip .pv p b")).toHaveText("Hear Everything Audio Import & Tonality Import.");
  });

  test("an exhibitor in two rooms gets each room's own paragraph", async ({ page }) => {
    await open(page);
    await openRoom(page, "24");
    await expect(page.locator("#tip .pv p")).toContainText("Manger");
    await openRoom(page, "Galerij");
    const spl = page.locator("#tip .ex", { hasText: "SPL electronics" }).locator(".pv");
    await expect(spl).toHaveCount(1);
    await expect(spl.locator("p")).toContainText("static presentation");
  });

  test("an expanded preview stays expanded while the tooltip redraws", async ({ page }) => {
    await open(page);
    await openRoom(page, "36");
    await page.click("#tip .pv .more");
    await page.fill("#q", "acm"); // refresh() redraws the open tooltip
    await expect(page.locator("#tip .pv")).toHaveClass(/\bopen\b/);
  });
});

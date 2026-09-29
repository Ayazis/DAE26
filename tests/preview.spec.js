const { test, expect } = require("@playwright/test");
const { open, openRoom } = require("./helpers");

test.describe("HiFi.nl previews", () => {
  test("a room's preview is collapsed and opens on click", async ({ page }) => {
    await open(page);
    await openRoom(page, "36");
    const pv = page.locator("#tip .pv");
    await expect(pv).toHaveCount(1);
    await expect(pv).not.toHaveAttribute("open", "");
    await expect(pv.locator("p")).toBeHidden();
    await pv.locator("summary").click();
    await expect(pv.locator("p")).toContainText("ZenSati kabels");
    await expect(pv.locator("a")).toHaveAttribute("href", /groter-dan-ooit$/);
    expect(page.errors).toEqual([]);
  });

  test("the preview text is searchable and opens with the match marked", async ({ page }) => {
    await open(page);
    await page.fill("#q", "el50");
    await expect(page.locator(".room.hit")).toHaveCount(1);
    await expect(page.locator(".room[data-r='56']")).toHaveClass(/\bhit\b/);
    await expect(page.locator("#tip h2")).toHaveText("Room 56"); // a single hit opens its room
    await expect(page.locator("#tip .pv[open] mark")).toHaveText("EL50");
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
    await page.click("#tip .pv summary");
    await expect(page.locator("#tip .pv p b")).toHaveText("Hear Everything Audio Import & Tonality Import.");
  });

  test("an exhibitor in two rooms gets each room's own paragraph", async ({ page }) => {
    await open(page);
    await openRoom(page, "24");
    await page.click("#tip .pv summary");
    await expect(page.locator("#tip .pv p")).toContainText("Manger");
    await openRoom(page, "Galerij");
    const spl = page.locator("#tip .ex", { hasText: "SPL electronics" }).locator(".pv");
    await expect(spl).toHaveCount(1);
    await spl.locator("summary").click();
    await expect(spl.locator("p")).toContainText("statische presentatie");
  });

  test("an opened preview stays open while the tooltip redraws", async ({ page }) => {
    await open(page);
    await openRoom(page, "36");
    await page.click("#tip .pv summary");
    await page.fill("#q", "acm"); // refresh() redraws the open tooltip
    await expect(page.locator("#tip .pv")).toHaveAttribute("open", "");
  });
});

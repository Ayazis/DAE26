const { test, expect } = require("./fixtures");
const { open, openRoom } = require("./helpers");

test.describe("show magazine page", () => {
  test("a room with one page shows it next to the star", async ({ page }) => {
    await open(page);
    await openRoom(page, "36");
    const badge = page.locator("#tip .ph .mag");
    await expect(badge).toHaveText("p. 19");
    await expect(badge).toHaveAttribute("title", "Page 19 in the show magazine");
    await expect(page.locator("#tip .ph .mag + .favb")).toHaveCount(1);
    await expect(page.locator("#tip .exn .mag")).toHaveCount(0);
    expect(page.errors).toEqual([]);
  });

  test("exhibitors sharing a room and a page get one badge", async ({ page }) => {
    await open(page);
    await openRoom(page, "7"); // Hear Everything Audio Import and Tonality Import, both p. 84
    await expect(page.locator("#tip .ph .mag")).toHaveText("p. 84");
    await expect(page.locator("#tip .exn .mag")).toHaveCount(0);
  });

  test("a room with several pages shows each exhibitor's page by its name", async ({ page }) => {
    await open(page);
    await openRoom(page, "Holland foyer (Headspace)");
    await expect(page.locator("#tip .ph .mag")).toHaveCount(0);
    await expect(page.locator("#tip .exn .mag")).toHaveText(["p. 82", "p. 148", "p. 170", "p. 178"]);
  });

  test("an exhibitor without a page has no badge, and the room's other page stays by its exhibitor", async ({ page }) => {
    await open(page);
    await openRoom(page, "Meijerij foyer"); // only DIMEX has a page
    await expect(page.locator("#tip .ph .mag")).toHaveCount(0);
    await expect(page.locator("#tip .exn .mag")).toHaveText(["p. 60"]);
    await expect(page.locator("#tip .ex").filter({ hasText: "DIMEX" }).locator(".mag")).toHaveText("p. 60");
  });

  test("Dutch explains the badge in Dutch", async ({ page }) => {
    await open(page);
    await openRoom(page, "36");
    await page.click("#lang");
    await expect(page.locator("#tip h2")).toHaveText("Kamer 36");
    await expect(page.locator("#tip .ph .mag")).toHaveAttribute("title", "Pagina 19 in het beursmagazine");
  });
});

const { test, expect } = require("@playwright/test");
const { open, saved, openRoom, download } = require("./helpers");

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

test.describe("exporting notes", () => {
  const ROOMS = {
    3: { fav: true, visited: true, rating: 3, note: 'Say "hi", then\nask about prices' },
    7: { visited: true },
  };

  test("nothing to export shows a message and downloads nothing", async ({ page }) => {
    await open(page);
    let downloaded = false;
    page.on("download", () => { downloaded = true; });
    await page.click("#expmd");
    await expect(page.locator("#msg")).toHaveText(/Nothing to export yet/);
    await page.click("#expcsv");
    await page.waitForTimeout(300);
    expect(downloaded).toBe(false);
  });

  test("Markdown lists every room with data, with its state", async ({ page }) => {
    await open(page, { rooms: ROOMS });
    const zone = await page.evaluate(() => ROOMS["3"].z.name);
    const { name, text } = await download(page, "#expmd");
    expect(name).toBe("dae2026-notes.md");
    expect(text).toMatch(/^# Dutch Audio Event 2026: my notes/);
    expect(text).toContain(`## Room 3 (${zone}) ★`);
    expect(text).toContain("- **Dynaudio Benelux**:");
    expect(text).toContain("Visited. Rating: ★★★☆☆");
    expect(text).toContain('Say "hi", then\nask about prices');
    expect(text).toMatch(/## Room 7 \([^)]+\)\n/); // visited-only rooms are included, without a star
    expect(text).toContain("- **Hear Everything Audio Import**");
    expect(text).toContain("- **Tonality Import**");
    expect(text.indexOf("## Room 3")).toBeLessThan(text.indexOf("## Room 7"));
  });

  test("CSV has a BOM, a header and properly quoted fields", async ({ page }) => {
    await open(page, { rooms: ROOMS });
    const zone = await page.evaluate(() => ROOMS["3"].z.name);
    const { name, text } = await download(page, "#expcsv");
    expect(name).toBe("dae2026-notes.csv");
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const rows = parseCsv(text.slice(1));
    expect(rows[0]).toEqual(["room", "zone", "favorite", "visited", "rating", "exhibitors", "brands", "note"]);
    expect(rows).toHaveLength(3);
    const r3 = rows.find(r => r[0] === "3");
    expect(r3.slice(0, 5)).toEqual(["3", zone, "1", "1", "3"]);
    expect(r3[5]).toBe("Dynaudio Benelux");
    expect(r3[7]).toBe('Say "hi", then\nask about prices');
    const r7 = rows.find(r => r[0] === "7");
    expect(r7.slice(2, 5)).toEqual(["0", "1", ""]);
    expect(r7[5]).toBe("Hear Everything Audio Import; Tonality Import");
    expect(r7[7]).toBe("");
  });

  test("CSV neutralises cells that spreadsheets would run as formulas", async ({ page }) => {
    await open(page, { rooms: { 3: { note: "=HYPERLINK(\"http://evil\")" } } });
    const { text } = await download(page, "#expcsv");
    const note = parseCsv(text.slice(1))[1][7];
    expect(note.startsWith("=")).toBe(false);
    expect(note).toContain("HYPERLINK");
  });
});

// RFC 4180 parser: quoted fields may contain commas, doubled quotes and newlines.
function parseCsv(s) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\r" && s[i + 1] === "\n") { row.push(f); rows.push(row); row = []; f = ""; i++; }
    else f += c;
  }
  row.push(f); rows.push(row);
  return rows;
}

// Takes the app screenshots used on the flyers and renders flyer.pdf and flyer-nl.pdf.
// Run from the repo root: node flyer/build.js
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("playwright");

const DIR = __dirname;
const PORT = 4174;
const QUERY = "QUAD"; // typed in the search box
const ROOM = "46";    // room whose popup is open, marked as a favorite
const TIP_HEIGHT = 198; // CSS px of the popup to keep: its top, down to the brand list

(async () => {
  const server = spawn(process.execPath, [path.join(DIR, "..", "tests", "serve.js"), String(PORT)]);
  await new Promise(r => server.stdout.once("data", r));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    for (const lang of ["en", "nl"]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      const app = await ctx.newPage();
      await app.goto(`http://127.0.0.1:${PORT}/2026/`, { waitUntil: "networkidle" });
      if (lang === "nl") await app.tap("#lang");
      await app.evaluate(() => document.fonts.ready);
      await app.fill("#q", QUERY);
      await app.locator("#hits button").first().waitFor();
      // A click, not a tap: on touch the popup opens on finger-up and the click after it lands in the popup.
      await app.click(`.room[data-r="${ROOM}"]`);
      await app.click("#tip .favb");
      await app.waitForTimeout(300);
      const q = await app.locator("#q").boundingBox(), hits = await app.locator("#hits").boundingBox();
      const top = q.y - 8, search = { x: 16, y: top, width: 358, height: hits.y + hits.height + 8 - top };
      await app.screenshot({ path: path.join(DIR, `search-${lang}.jpg`), clip: search, type: "jpeg", quality: 92 });
      const tip = await app.locator("#tip").boundingBox();
      await app.screenshot({ path: path.join(DIR, `room-${lang}.jpg`), clip: { ...tip, height: TIP_HEIGHT }, type: "jpeg", quality: 92 });
      await ctx.close();
    }
    const page = await browser.newPage();
    for (const name of ["flyer", "flyer-nl"]) {
      await page.goto("file://" + path.join(DIR, name + ".html"), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({ path: path.join(DIR, name + ".pdf"), format: "A4", printBackground: true });
    }
  } finally {
    await browser.close();
    server.kill();
  }
})();

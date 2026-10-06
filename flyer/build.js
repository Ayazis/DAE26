// Takes the app screenshots used on the flyers and renders flyer.pdf and flyer-nl.pdf.
// Run from the repo root: node flyer/build.js
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("playwright");

const DIR = __dirname;
const PORT = 4174;
const QUERY = "QUAD"; // typed in the search box
const ROOM = "46";    // room whose popup is open, marked as a favorite
const MAP_WIDTH = 950;  // map units across the screen: wide enough to read as a floor plan, with the room in view
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
      await app.locator("#hits button", { hasText: new RegExp(`\\b${ROOM}$`) }).tap(); // opens the room and moves the map to it
      await app.waitForTimeout(600);
      // Zoom out around the room, keeping it in the top quarter above the popup like the app does.
      await app.evaluate(([r, W]) => {
        const s = spots[r], h = W / (box.clientWidth / box.clientHeight);
        vb = { x: s.x + s.w / 2 - W / 2, y: s.y + s.h / 2 - h * 0.22, w: W, h }; applyVB();
      }, [ROOM, MAP_WIDTH]);
      await app.tap("#tip .favb");
      // The tap may have scrolled the star into view, and while it has focus a popup below the fold is lifted
      // (as if for the keyboard). Undo both: the crop below is from the top of the page.
      await app.evaluate(() => { document.activeElement.blur(); scrollTo(0, 0); });
      await app.waitForTimeout(300);
      // From the search box down through the map to the top of the popup.
      const q = await app.locator("#q").boundingBox(), tip = await app.locator("#tip").boundingBox();
      const top = q.y - 8;
      await app.screenshot({ path: path.join(DIR, `app-${lang}.jpg`), type: "jpeg", quality: 92,
        clip: { x: 16, y: top, width: 358, height: tip.y + TIP_HEIGHT - top } });
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

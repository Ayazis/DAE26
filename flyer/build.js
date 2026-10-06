// Takes the app screenshots used on the flyers and renders flyer.pdf and flyer-nl.pdf.
// Run from the repo root: node flyer/build.js
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("playwright");

const DIR = __dirname;
const PORT = 4174;
const ROOM = "46"; // room whose popup is open in the screenshot
const CLIP = { x: 560, y: 420, width: 560, height: 295 }; // part of the map around the popup, in CSS px at 1280×900

(async () => {
  const server = spawn(process.execPath, [path.join(DIR, "..", "tests", "serve.js"), String(PORT)]);
  await new Promise(r => server.stdout.once("data", r));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const app = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 3 });
    for (const lang of ["en", "nl"]) {
      await app.goto(`http://127.0.0.1:${PORT}/2026/`, { waitUntil: "networkidle" });
      if (lang === "nl") await app.click("#lang");
      await app.evaluate(() => document.fonts.ready);
      await app.click(`.room[data-r="${ROOM}"]`);
      await app.waitForTimeout(300);
      await app.screenshot({ path: path.join(DIR, `app-${lang}.jpg`), clip: CLIP, type: "jpeg", quality: 88 });
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

const fs = require("fs");
const { expect } = require("@playwright/test");

const STORE_KEY = "daem-2026-v1";

// Loads the app. `rooms` seeds the saved per-room state once (a reload keeps whatever the app saved since).
// Google Fonts is blocked so tests don't depend on the network. Uncaught page errors are collected in page.errors.
async function open(page, { rooms, hash = "" } = {}) {
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  if (rooms) {
    await page.addInitScript(([key, rooms]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem(key, JSON.stringify({ rooms }));
    }, [STORE_KEY, rooms]);
  }
  await page.goto("./" + hash);
  await expect(page.locator(".room[data-r]").first()).toBeAttached();
}

const saved = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || "{}").rooms || {}, STORE_KEY);

async function openRoom(page, r) {
  await page.locator(`.room[data-r="${r}"]`).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#tip h2")).toHaveText(/^\d+$/.test(r) ? "Room " + r : r);
}

// Answers the next confirm() and returns its message.
function answerDialog(page, accept) {
  return new Promise(resolve => page.once("dialog", async d => {
    const text = d.message();
    accept ? await d.accept() : await d.dismiss();
    resolve(text);
  }));
}

// Clicks a download button and returns {name, text}.
async function download(page, selector) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(selector)]);
  return { name: dl.suggestedFilename(), text: fs.readFileSync(await dl.path(), "utf8") };
}

const restore = (page, content, name = "backup.json") =>
  page.setInputFiles("#impjson", { name, mimeType: "application/json",
    buffer: Buffer.from(typeof content === "string" ? content : JSON.stringify(content)) });

module.exports = { STORE_KEY, open, saved, openRoom, answerDialog, download, restore };

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

// Picks "Save to a local file" in the Backup menu and returns the downloaded {name, text}.
async function download(page) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.selectOption("#backup", "local")]);
  return { name: dl.suggestedFilename(), text: fs.readFileSync(await dl.path(), "utf8") };
}

const restore = (page, content, name = "backup.json") =>
  page.setInputFiles("#impjson", { name, mimeType: "application/json",
    buffer: Buffer.from(typeof content === "string" ? content : JSON.stringify(content)) });

// A fake Google sign-in and Drive: one stored backup file and a log of the uploads.
// g.otherDevice(body) writes a newer backup as if from another device; g.failNext(status) makes the next Drive request fail.
// The sign-in popup's answer is window.__signIn in the page (default: a token valid for an hour); requestAccessToken's
// prompt values are logged in window.__prompts.
async function fakeGoogle(page) {
  const g = { uploads: [], stored: null, fail: null,
    otherDevice(body) { g.stored = { at: new Date(Date.now() + 5000).toISOString(), body }; },
    failNext(status) { g.fail = status; } };
  await page.route("https://accounts.google.com/gsi/client", r => r.fulfill({
    contentType: "text/javascript",
    body: `window.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken(o){
      (window.__prompts ||= []).push(o.prompt);
      const r = window.__signIn || {access_token:"t", expires_in:3600};
      if(r.errorType) this.error_callback({type:r.errorType}); else this.callback(r);
    }})}}};`,
  }));
  await page.route(/googleapis\.com\/(upload\/)?drive\/v3\/files/, async r => {
    const req = r.request();
    if (g.fail) { const status = g.fail; g.fail = null; return r.fulfill({ status, json: { error: status } }); }
    if (req.method() === "GET" && req.url().includes("alt=media")) return r.fulfill({ contentType: "application/json", body: g.stored.body });
    if (req.method() === "GET") return r.fulfill({ json: { files: g.stored ? [{ id: "f1", modifiedTime: g.stored.at }] : [] } });
    g.stored = { at: new Date().toISOString(), body: req.postData() };
    g.uploads.push(req.method());
    return r.fulfill({ json: { id: "f1", modifiedTime: g.stored.at } });
  });
  return g;
}

module.exports = { STORE_KEY, open, saved, openRoom, answerDialog, download, restore, fakeGoogle };

const { test, expect } = require("./fixtures");
const { open, openRoom, saved } = require("./helpers");

const viewBox = page => page.evaluate(() => svg.getAttribute("viewBox").split(" ").map(Number));
// Centre of a room on screen, in page pixels.
const roomCentre = async (page, r) => {
  const b = await page.locator(`.room[data-r="${r}"] .rbox`).boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
// A point on the map that is not on a room (the terrace hexagon's centre).
const emptySpot = page => page.evaluate(() => {
  const [cx, cy] = PLAN.hexagon, r = box.getBoundingClientRect(), s = pxPerUnit();
  const ox = (box.clientWidth - vb.w * s) / 2, oy = (box.clientHeight - vb.h * s) / 2;
  return { x: r.left + ox + (cx - vb.x) * s, y: r.top + oy + (cy - vb.y) * s };
});
const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test.describe("pointer", () => {
  test("dragging pans the map by the distance moved, and doesn't open the room it started on", async ({ page }) => {
    await open(page);
    const [x0, y0] = await viewBox(page);
    const s = await page.evaluate(() => pxPerUnit());
    const from = await roomCentre(page, "45");
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x - 60, from.y - 40, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await viewBox(page))[0]).toBeCloseTo(x0 + 60 / s, 1);
    const [, y1] = await viewBox(page);
    expect(y1).toBeCloseTo(y0 + 40 / s, 1);
    await expect(page.locator("#tip")).toBeHidden();
  });

  test("a small wobble while tapping still counts as a tap", async ({ page }) => {
    await open(page);
    const before = await viewBox(page);
    const at = await roomCentre(page, "45");
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 3, at.y + 2);
    await page.mouse.up();
    await expect(page.locator("#tip h2")).toHaveText("Room 45");
    expect(await viewBox(page)).toEqual(before);
  });

  test("tapping a room opens it, tapping empty map closes it", async ({ page }) => {
    await open(page);
    const at = await roomCentre(page, "45");
    await page.mouse.click(at.x, at.y);
    await expect(page.locator("#tip h2")).toHaveText("Room 45");
    await expect(page.locator(".room[data-r='45']")).toHaveClass(/\bsel\b/);
    const empty = await emptySpot(page);
    await page.mouse.click(empty.x, empty.y);
    await expect(page.locator("#tip")).toBeHidden();
    await expect(page.locator(".room.sel")).toHaveCount(0);
  });

  test.describe("touch", () => {
    test.use({ hasTouch: true });

    test("pinching spreads the fingers apart to zoom in around their midpoint", async ({ page }) => {
      await open(page);
      const [, , w0] = await viewBox(page);
      const mid = await roomCentre(page, "24");
      const before = await page.evaluate(([x, y]) => toSvg(x, y), [mid.x, mid.y]);
      const cdp = await page.context().newCDPSession(page);
      const touch = (type, d) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [
        { x: mid.x - d, y: mid.y, id: 0 }, { x: mid.x + d, y: mid.y, id: 1 }] });
      await touch("touchStart", 40);
      for (const d of [50, 60, 70, 80]) await touch("touchMove", d);
      await touch("touchEnd");
      await expect.poll(async () => (await viewBox(page))[2]).toBeCloseTo(w0 / 2, 0); // fingers twice as far apart
      const after = await page.evaluate(([x, y]) => toSvg(x, y), [mid.x, mid.y]);
      expect(after.x).toBeCloseTo(before.x, 0);
      expect(after.y).toBeCloseTo(before.y, 0);
      await expect(page.locator("#tip")).toBeHidden(); // a pinch is not a tap
      expect(page.errors).toEqual([]);
    });

    test.describe("on a phone", () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test("the tap that opens a room doesn't also press what the popup puts under the finger", async ({ page }) => {
        await open(page);
        // A room and a point in it where its popup (a sheet over the bottom half) has a button, link or the notes box.
        const hit = await page.evaluate(() => {
          for (const g of document.querySelectorAll(".room[tabindex]")) {
            const r = g.dataset.r, a = g.getBoundingClientRect();
            select(r, false);
            for (const el of document.querySelectorAll("#tip button, #tip a, #tip textarea")) {
              const b = el.getBoundingClientRect();
              const x0 = Math.max(a.left, b.left), x1 = Math.min(a.right, b.right), y0 = Math.max(a.top, b.top), y1 = Math.min(a.bottom, b.bottom);
              if (x1 - x0 > 4 && y1 - y0 > 4) { closeTip(); return { r, x: (x0 + x1) / 2, y: (y0 + y1) / 2 }; }
            }
            closeTip();
          }
        });
        expect(hit).toBeTruthy();
        await page.touchscreen.tap(hit.x, hit.y);
        await expect(page.locator("#tip h2")).toHaveText(/^\d+$/.test(hit.r) ? "Room " + hit.r : hit.r);
        await page.waitForTimeout(400);
        expect(await saved(page)).toEqual({});
        await expect(page.locator("#tip .note")).not.toBeFocused();
        expect(page.errors).toEqual([]);
      });
    });
  });
});

test.describe("zoom", () => {
  test("zooming stops at the closest and widest limits", async ({ page }) => {
    await open(page);
    const box = await page.locator("#mapbox").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -3000);
    await expect.poll(async () => (await viewBox(page))[2]).toBeCloseTo(80, 3);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 3000);
    await expect.poll(async () => (await viewBox(page))[2]).toBeCloseTo(2600, 3);
  });

  test("with reduced motion, wheel zoom and focusing a room jump straight to the end", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    const [, , w0] = await viewBox(page);
    const box = await page.locator("#mapbox").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -100);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
    expect((await viewBox(page))[2]).toBeCloseTo(w0 * Math.exp(-100 * 0.0015), 3);

    await page.evaluate(() => { select("24", true); });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
    const [x, y, w, h] = await viewBox(page);
    const s = await page.evaluate(() => spots["24"]);
    expect(x + w / 2).toBeCloseTo(s.x + s.w / 2, 3); // room centred
    expect(y + h / 2).toBeCloseTo(s.y + s.h / 2, 3);
  });

  test("ctrl+wheel (trackpad pinch) zooms much faster than a plain wheel", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    const [, , w0] = await viewBox(page);
    await page.evaluate(() => svg.dispatchEvent(new WheelEvent("wheel", { deltaY: -10, ctrlKey: true, clientX: 300, clientY: 300, cancelable: true })));
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
    expect((await viewBox(page))[2]).toBeCloseTo(w0 * Math.exp(-10 * 0.01), 3);
  });

  test("Firefox-style line and page wheel deltas are scaled to pixels", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    for (const [mode, factor] of [[1, 33], [2, 800]]) {
      const [, , w0] = await viewBox(page);
      await page.evaluate(m => svg.dispatchEvent(new WheelEvent("wheel", { deltaY: -0.1, deltaMode: m, clientX: 300, clientY: 300, cancelable: true })), mode);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
      expect((await viewBox(page))[2]).toBeCloseTo(w0 * Math.exp(-0.1 * factor * 0.0015), 3);
    }
  });
});

test.describe("tooltip", () => {
  test("closes with Escape and with its × button", async ({ page }) => {
    await open(page);
    await openRoom(page, "3");
    await page.keyboard.press("Escape");
    await expect(page.locator("#tip")).toBeHidden();
    await expect(page.locator(".room.sel")).toHaveCount(0);

    await openRoom(page, "3");
    await page.click("#tip .x");
    await expect(page.locator("#tip")).toBeHidden();

    await openRoom(page, "50"); // a room not in use has its own × too
    await page.click("#tip .x");
    await expect(page.locator("#tip")).toBeHidden();
  });

  test("Space opens a focused room like Enter", async ({ page }) => {
    await open(page);
    await page.locator(".room[data-r='7']").focus();
    await page.keyboard.press(" ");
    await expect(page.locator("#tip h2")).toHaveText("Room 7");
  });

  test("lists each exhibitor with its brands, page link and other rooms", async ({ page }) => {
    await open(page);
    await openRoom(page, "53");
    const bw = page.locator("#tip .ex", { hasText: "Bowers & Wilkins" });
    await expect(bw.locator(".ext")).toHaveAttribute("href", /^https:\/\/dutchaudioevent\.nl\//);
    await expect(bw.locator(".ext")).toHaveAttribute("target", "_blank");
    await expect(bw.locator(".also button")).toHaveText(["Galerij", "Parkzaal"]);
    await bw.locator(".also button", { hasText: "Parkzaal" }).click();
    await expect(page.locator("#tip h2")).toHaveText("Parkzaal");
    await expect(page.locator(".room[data-r='Parkzaal']")).toHaveClass(/\bsel\b/);
  });

  test("an exhibitor without brands says so", async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => Object.keys(ROOMS).find(r => ROOMS[r].exs.includes("Music Emotion")));
    await openRoom(page, r);
    await expect(page.locator("#tip .ex", { hasText: "Music Emotion" }).locator(".brands")).toHaveText("No brands listed on the site");
  });

  for (const r of ["Kempenzaal", "36"]) // at the far left and far right of the plan
    test(`sits next to room ${r} inside the map, without covering it`, async ({ page }) => {
      await open(page);
      await openRoom(page, r);
      await page.waitForTimeout(400); // focusRoom glides there
      const tip = await page.locator("#tip").boundingBox();
      const room = await page.locator(`.room[data-r="${r}"] .rbox`).boundingBox();
      const map = await page.locator("#mapbox").boundingBox();
      expect(overlap(tip, room)).toBe(false);
      expect(tip.x).toBeGreaterThanOrEqual(map.x);
      expect(tip.y).toBeGreaterThanOrEqual(map.y);
      expect(tip.x + tip.width).toBeLessThanOrEqual(map.x + map.width + 1);
      expect(tip.y + tip.height).toBeLessThanOrEqual(map.y + map.height + 1);
    });

  test("with no room beside it, the tooltip goes below or above the room", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 }); // the tallest map, so the tooltip surely fits below
    await open(page);
    // Wide and low, centred across half the map near its top edge: no space left or right of it, plenty below.
    const r = "Meijerij foyer";
    await page.evaluate(r => { const s = spots[r], w = s.w / 0.5, h = w * box.clientHeight / box.clientWidth;
      vb = { x: s.x + s.w / 2 - w / 2, y: s.y - 16 * w / box.clientWidth, w, h }; drawVB(); select(r, false); }, r);
    const tip = await page.locator("#tip").boundingBox();
    const room = await page.locator(`.room[data-r="${r}"] .rbox`).boundingBox();
    expect(overlap(tip, room)).toBe(false);
    expect(tip.y).toBeGreaterThanOrEqual(room.y + room.height);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("the tooltip is a sheet along the bottom, with the room kept in the top part of the map", async ({ page }) => {
    await open(page);
    await openRoom(page, "45");
    await expect(page.locator("#tip")).toHaveClass(/\bsheet\b/);
    await page.waitForTimeout(400);
    const tip = await page.locator("#tip").boundingBox();
    const room = await page.locator(".room[data-r='45'] .rbox").boundingBox();
    expect(room.y + room.height).toBeLessThan(tip.y);
  });

  test("when the keyboard covers the map, the sheet lifts above it and keeps the note in view", async ({ page }) => {
    // A fake visual viewport: the on-screen keyboard leaves only the top 420 px of the window visible.
    await page.addInitScript(() => {
      const vv = new EventTarget();
      Object.assign(vv, { offsetTop: 0, height: innerHeight });
      Object.defineProperty(window, "visualViewport", { value: vv });
      window.__keyboard = h => { vv.height = innerHeight - h; vv.dispatchEvent(new Event("resize")); };
    });
    await open(page);
    await openRoom(page, "45");
    await page.locator("#tip .note").focus();
    await page.evaluate(() => window.__keyboard(380));
    const map = await page.locator("#mapbox").boundingBox();
    const visibleBottom = await page.evaluate(() => innerHeight - 380);
    await expect.poll(async () => { const t = await page.locator("#tip").boundingBox(); return t.y + t.height; })
      .toBeLessThanOrEqual(Math.min(map.y + map.height, visibleBottom));
    const note = await page.locator("#tip .note").boundingBox();
    expect(note.y + note.height).toBeLessThanOrEqual(visibleBottom);

    // Keyboard closed again: the sheet goes back to the bottom.
    await page.locator("#tip .note").blur();
    await page.evaluate(() => window.__keyboard(0));
    await expect.poll(() => page.evaluate(() => tip.style.bottom)).toBe("");
  });
});

test.describe("fullscreen", () => {
  test("toggles the full-window map with the search bar inside it", async ({ page }) => {
    await open(page);
    await page.click("#full");
    await expect(page.locator("#mapbox")).toHaveClass(/\bfull\b/);
    await expect(page.locator("#full")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#mapbox #bar")).toHaveCount(1);
    await page.click("#full");
    await expect(page.locator("#mapbox")).not.toHaveClass(/\bfull\b/);
    await expect(page.locator("#mapbox #bar")).toHaveCount(0);
    await expect(page.locator("#barhome + #bar")).toHaveCount(1);
  });

  test("Escape closes the favorites panel first, then leaves fullscreen", async ({ page }) => {
    await open(page, { rooms: { 3: { fav: true } } });
    await page.click("#full");
    await page.click("#favmenu");
    await expect(page.locator("#favpanel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#favpanel")).toBeHidden();
    await expect(page.locator("#mapbox")).toHaveClass(/\bfull\b/);
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    await expect(page.locator("#mapbox")).not.toHaveClass(/\bfull\b/);
  });

  test("leaving the browser's own fullscreen also leaves the app's", async ({ page }) => {
    await open(page);
    await page.click("#full");
    await expect(page.locator("#mapbox")).toHaveClass(/\bfull\b/);
    await page.evaluate(() => document.fullscreenElement ? document.exitFullscreen() : document.dispatchEvent(new Event("fullscreenchange")));
    await expect(page.locator("#mapbox")).not.toHaveClass(/\bfull\b/);
  });

  test("a long favorites panel is capped at four rows and scrolls", async ({ page }) => {
    await open(page, { rooms: Object.fromEntries(["3", "4", "7", "8", "9", "10"].map(r => [r, { fav: true }])) });
    await page.click("#full");
    await page.click("#favmenu");
    await expect(page.locator("#favs2 li")).toHaveCount(6);
    const { max, list } = await page.evaluate(() => ({ max: favPanel.style.maxHeight, list: favPanelList.scrollHeight }));
    expect(max).toMatch(/^min\(\d+(\.\d+)?px/);
    expect(parseFloat(max.slice(4))).toBeLessThan(list);
  });
});

const { test, expect } = require("@playwright/test");
const { open } = require("./helpers");

const viewBox = page => page.evaluate(() => svg.getAttribute("viewBox").split(" ").map(Number));

test("a mouse-wheel notch glides to its zoom, keeping the point under the cursor in place", async ({ page }) => {
  await open(page);
  const box = await page.locator("#mapbox").boundingBox();
  const at = { x: Math.round(box.x + box.width * 0.3), y: Math.round(box.y + box.height * 0.6) };
  const before = await page.evaluate(([x, y]) => ({ w: vb.w, p: toSvg(x, y) }), [at.x, at.y]);
  await page.mouse.move(at.x, at.y);
  await page.mouse.wheel(0, -100); // one notch in
  // A frame later it is on its way, not there yet
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const [, , midW] = await viewBox(page);
  const endW = before.w * Math.exp(-100 * 0.0015);
  expect(midW).toBeLessThan(before.w);
  expect(midW).toBeGreaterThan(endW + 1);
  await expect.poll(async () => (await viewBox(page))[2]).toBeCloseTo(endW, 3);
  const after = await page.evaluate(([x, y]) => toSvg(x, y), [at.x, at.y]);
  expect(after.x).toBeCloseTo(before.p.x, 3);
  expect(after.y).toBeCloseTo(before.p.y, 3);
});

test("room numbers keep one on-screen size at every zoom step, instead of jumping", async ({ page }) => {
  await open(page);
  const px = await page.evaluate(() => {
    const out = [];
    for (let w = 400; w >= 300; w -= 10) { // zoomed in far enough that the label is capped at its pixel size
      vb = { x: 600, y: 600, w, h: w * box.clientHeight / box.clientWidth }; drawVB();
      out.push(+spots["24"].label.getAttribute("font-size") * pxPerUnit());
    }
    return out;
  });
  px.forEach(p => expect(p).toBeCloseTo(15, 1));
});

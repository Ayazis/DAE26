// Manual check of the event data, for after a data refresh (sourcedata/scrape.py, build_hifi.py, build_magazine.py): `npm run check-data`.
// Not part of `npm test` or CI. Errors are things the map would show wrongly or not at all; warnings are worth a look.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DIR = path.join(__dirname, "../2026");
const src = ["plan.js", "data.js", "hifi.js"].map(f => fs.readFileSync(path.join(DIR, f), "utf8")).join("\n;\n");
const { ZONES, BOX, EX, OCCUPANTS, URL_EX, MAG_PAGE, HIFI, HIFI_URL } =
  vm.runInNewContext(src + "\n;({ ZONES, BOX, EX, OCCUPANTS, URL_EX, MAG_PAGE, HIFI, HIFI_URL })", {});

const errors = [], warnings = [];
const error = m => errors.push(m), warn = m => warnings.push(m);

// Floor plan: every room in a zone needs a box to be drawn, and belongs to one zone only.
const zoneOf = {};
ZONES.forEach(z => {
  if (!z.id || !z.name || !z.color) error(`zone ${JSON.stringify(z.id)} is missing an id, name or color`);
  z.rooms.forEach(r => {
    if (zoneOf[r]) error(`room "${r}" is in zone ${zoneOf[r]} and in zone ${z.id}`);
    zoneOf[r] = z.id;
    if (!BOX[r]) error(`room "${r}" (zone ${z.id}) has no BOX entry, so it isn't drawn`);
  });
});
Object.entries(BOX).forEach(([r, b]) => {
  if (!zoneOf[r]) warn(`BOX "${r}" is in no zone: drawn grey and not clickable`);
  if (b.length !== 4 || b.some(v => typeof v !== "number" || v < 0 || v > 100)) error(`BOX "${r}" is not [left, top, width, height] in %`);
  else if (b[0] + b[2] > 100 || b[1] + b[3] > 100) error(`BOX "${r}" runs off the plan`);
});

// Exhibitors: who is in which room, their brands and their page.
const roomsOf = {};
Object.entries(OCCUPANTS).forEach(([r, exs]) => {
  if (!zoneOf[r]) error(`OCCUPANTS room "${r}" is not on the floor plan, so its exhibitors don't show`);
  if (!exs.length) warn(`OCCUPANTS room "${r}" has an empty list (leave it out instead)`);
  if (new Set(exs).size !== exs.length) error(`room "${r}" lists an exhibitor twice`);
  exs.forEach(e => (roomsOf[e] ||= []).push(r));
});
Object.keys(roomsOf).forEach(e => {
  if (!(e in EX)) warn(`"${e}" has no EX entry; the map shows its name instead of brands`);
  else if (!EX[e].length) warn(`"${e}" has no brands ("No brands listed on the site")`);
  if (!URL_EX[e]) error(`"${e}" has no URL_EX page link`);
  else if (!/^https:\/\/dutchaudioevent\.nl\//.test(URL_EX[e])) warn(`"${e}" links outside dutchaudioevent.nl: ${URL_EX[e]}`);
});
Object.entries(EX).forEach(([e, brands]) => {
  if (!roomsOf[e]) warn(`EX "${e}" is in no room, so it is never shown`);
  if (new Set(brands.map(b => b.toLowerCase())).size !== brands.length) warn(`"${e}" lists a brand twice`);
});
Object.keys(URL_EX).forEach(e => { if (!roomsOf[e]) warn(`URL_EX "${e}" is in no room`); });

// Show magazine pages (sourcedata/build_magazine.py): each one is for an exhibitor in that room.
Object.entries(MAG_PAGE).forEach(([r, pages]) => Object.entries(pages).forEach(([e, p]) => {
  if (!(OCCUPANTS[r] || []).includes(e)) error(`MAG_PAGE "${r}" has a page for "${e}", who is not in that room, so it never shows`);
  if (!Number.isInteger(p) || p < 1) error(`MAG_PAGE "${r}" "${e}" has page ${JSON.stringify(p)}`);
}));
Object.entries(OCCUPANTS).forEach(([r, exs]) => exs.forEach(e => {
  if (!(MAG_PAGE[r] || {})[e]) warn(`"${e}" in "${r}" has no show magazine page`);
}));

// HiFi.nl previews: shown under the first of their exhibitors found in each of their rooms.
const covered = new Set();
HIFI.forEach((x, i) => {
  const name = `HIFI[${i}] "${x.h}"`;
  if (!x.text) error(`${name} has no text`);
  if (!x.en) warn(`${name} has no English translation (English mode shows the Dutch text)`);
  if (!HIFI_URL[x.p]) error(`${name} has page ${JSON.stringify(x.p)}, which is not in HIFI_URL`);
  if (!x.rooms.length) error(`${name} is in no room`);
  x.ex.forEach(e => { if (!roomsOf[e]) error(`${name} names exhibitor "${e}", who is in no room`); });
  x.rooms.forEach(r => {
    if (!zoneOf[r]) error(`${name} is for room "${r}", which is not on the floor plan`);
    else if (!(OCCUPANTS[r] || []).some(e => x.ex.includes(e))) error(`${name} is for room "${r}", but none of its exhibitors are there, so it never shows`);
    x.ex.forEach(e => { if ((OCCUPANTS[r] || []).includes(e)) covered.add(e); });
  });
});
Object.keys(roomsOf).forEach(e => { if (!covered.has(e)) warn(`"${e}" has no HiFi.nl preview`); });

const list = (title, items) => items.length && console.log(`${title} (${items.length}):\n` + items.map(m => "  - " + m).join("\n") + "\n");
list("Warnings", warnings);
list("Errors", errors);
const rooms = Object.keys(OCCUPANTS).length, exs = Object.keys(roomsOf).length;
console.log(`${rooms} rooms in use, ${exs} exhibitors, ${HIFI.length} HiFi.nl previews: ` +
  (errors.length ? `${errors.length} error(s)` : "no errors") + (warnings.length ? `, ${warnings.length} warning(s)` : ""));
process.exitCode = errors.length ? 1 : 0;
